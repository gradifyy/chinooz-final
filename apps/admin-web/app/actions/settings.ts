'use server'

/**
 * Platform-settings server actions (Settings_Module — Requirement 8).
 *
 * This is the orchestration layer described in design.md "Layering Rules" #3:
 * the action re-checks RBAC via `admin-core/rbac`, validates the submission via
 * the pure `admin-core/settings` validator, persists the all-or-nothing change
 * set through the injected {@link AdminApi}, builds per-setting change records
 * with `diffSettings`, and appends an audit record for each via
 * `AdminApi.audit.append`. Every correctness-critical decision lives in the
 * pure `lib/admin-core` helpers; this module only sequences I/O and maps
 * outcomes to a typed, discriminated result the UI surfaces.
 *
 * Access is restricted to `Super_Admin` (Req 8.1 / 8.6). Authorization is
 * enforced as defense-in-depth: even though `middleware.ts` performs a coarse
 * route-level guard (`/settings` requires `settings.manage`), the action
 * re-checks `rbac.canPerform(roles, 'settings.manage')` before reading or
 * persisting anything, so a denied request leaves all data unchanged
 * (Req 2.4 / 8.6).
 *
 * Validation is all-or-nothing (Req 8.4) and persistence failure leaves prior
 * values unchanged (Req 8.5): on either failure the action returns a typed
 * error result without mutating local or persisted state.
 *
 * Server-side only. TypeScript strict mode, no `any`.
 *
 * _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_
 */

import { revalidatePath } from 'next/cache'

import { buildAuditRecord } from '@/lib/admin-core/audit'
import { canPerform } from '@/lib/admin-core/rbac'
import {
  SETTING_DEFS,
  diffSettings,
  validateSettings,
  type SettingViolation,
} from '@/lib/admin-core/settings'
import type { PlatformSetting, Permission } from '@/lib/admin-core/types'
import { mockAdminApi } from '@/lib/api/mock'
import type { AdminApi } from '@/lib/api/types'
import { readSession } from '@/lib/session'

/** Permission required to modify platform settings; held by `Super_Admin` only (Req 8.6). */
const SETTINGS_PERMISSION: Permission = 'settings.manage'

/** Audit action type recorded for a persisted settings change (Req 8.3). */
const SETTINGS_CHANGE_ACTION = 'settings_update'

/**
 * A single proposed setting value submitted to {@link saveSettings}. Carries
 * the setting `id` and its proposed `value`; the previously persisted value is
 * resolved server-side so the change set always reflects real current state.
 */
export interface ProposedSetting {
  id: string
  value: number
}

/**
 * Discriminated outcome of {@link saveSettings}.
 *
 * On success the persisted settings snapshot is returned. Every failure carries
 * a coarse `reason` the caller maps to a user-facing message, and on failure
 * previously persisted values are left unchanged:
 * - `'unauthenticated'` — no valid admin session (the middleware normally
 *   prevents this; re-checked here as defense-in-depth).
 * - `'forbidden'` — the acting roles lack `settings.manage`; no data is read or
 *   mutated (Req 2.4 / 8.6).
 * - `'retrieval_failed'` — the current settings could not be loaded, so no
 *   change set can be computed and nothing is persisted.
 * - `'invalid'` — at least one changed value is out of range; the entire
 *   submission is rejected and `violations` identifies each offending setting
 *   and its accepted range (Req 8.4).
 * - `'persist_failed'` — persisting the validated change set failed; all
 *   previously persisted values are left unchanged (Req 8.5).
 * - `'audit_failed'` — the change was persisted but one or more audit records
 *   could not be appended after retries; the records are preserved for retry
 *   (Req 9.2). `settings` carries the persisted snapshot so the UI reflects it.
 */
export type SaveSettingsResult =
  | { ok: true; settings: PlatformSetting[] }
  | { ok: false; reason: 'unauthenticated' }
  | { ok: false; reason: 'forbidden' }
  | { ok: false; reason: 'retrieval_failed' }
  | { ok: false; reason: 'invalid'; violations: SettingViolation[] }
  | { ok: false; reason: 'persist_failed' }
  | { ok: false; reason: 'audit_failed'; settings: PlatformSetting[] }

/**
 * Resolves the {@link AdminApi} implementation backing the action. Currently
 * the in-memory mock; a real HTTP implementation can be substituted here behind
 * the same interface without touching this action's logic.
 */
function getAdminApi(): AdminApi {
  return mockAdminApi
}

/**
 * Persists a platform-settings submission on behalf of the current
 * administrator (Req 8.2 / 8.3 / 8.4 / 8.5 / 8.6).
 *
 * Sequence:
 * 1. Read the admin session; reject unauthenticated callers.
 * 2. Re-check RBAC — the acting roles must hold `settings.manage` (Super_Admin);
 *    otherwise the request is denied and no data is read or mutated (Req 8.6).
 * 3. Load the current persisted settings; reject on retrieval failure so no
 *    change set is computed and nothing is persisted.
 * 4. Build the proposed change set against the real current values, then
 *    validate it all-or-nothing with {@link validateSettings}: if any changed
 *    value is out of range the whole submission is rejected with violations and
 *    persisted values are left unchanged (Req 8.4).
 * 5. When nothing actually changed, return the current snapshot without
 *    persisting or auditing.
 * 6. Persist the validated change set via `AdminApi.settings.save`; on
 *    persistence failure leave previously persisted values unchanged (Req 8.5).
 * 7. Compute per-setting change records with {@link diffSettings} over the
 *    before/after snapshots and append one audit record per change — acting
 *    identity, setting identifier, previous value, new value, timestamp
 *    (Req 8.3). Surface `audit_failed` (records preserved for retry) if any
 *    append fails after retries (Req 9.2).
 *
 * @param proposed proposed next values for one or more settings
 * @param now      epoch milliseconds used for audit timestamps (injectable for tests)
 */
export async function saveSettings(
  proposed: readonly ProposedSetting[],
  now: number = Date.now(),
): Promise<SaveSettingsResult> {
  const session = await readSession()
  if (session === null) {
    return { ok: false, reason: 'unauthenticated' }
  }

  // Defense-in-depth RBAC re-check (Req 8.6): a denied request must leave all
  // data unchanged, so we return before any read or mutation.
  if (!canPerform(session.roles, SETTINGS_PERMISSION)) {
    return { ok: false, reason: 'forbidden' }
  }

  const api = getAdminApi()

  // Load the current persisted values so the change set reflects real state.
  const current = await api.settings.list()
  if (!current.ok) {
    return { ok: false, reason: 'retrieval_failed' }
  }

  // Resolve each proposed value against the matching current setting, building
  // the submission the validator inspects. Proposals for unknown settings are
  // still surfaced (with no current value) so validation rejects them.
  const proposedById = new Map<string, number>()
  for (const entry of proposed) {
    proposedById.set(entry.id, entry.value)
  }
  const submitted = current.data.map((setting) => ({
    id: setting.id,
    previous: setting.value,
    next: proposedById.get(setting.id) ?? setting.value,
  }))

  // All-or-nothing validation (Req 8.4): reject the whole submission if any
  // changed value is out of range, leaving persisted values unchanged.
  const validation = validateSettings(SETTING_DEFS, submitted)
  if (!validation.ok) {
    return { ok: false, reason: 'invalid', violations: validation.violations }
  }

  // No effective change — nothing to persist or audit.
  if (validation.changed.length === 0) {
    return { ok: true, settings: current.data }
  }

  // Persist the validated change set (Req 8.2). On failure, previously
  // persisted values remain unchanged and no audit record is appended (Req 8.5).
  const saved = await api.settings.save(validation.changed)
  if (!saved.ok) {
    return { ok: false, reason: 'persist_failed' }
  }

  // Build one change record per setting whose value actually changed and append
  // a complete audit record for each (Req 8.3): acting identity, setting id,
  // previous value, new value, and timestamp.
  const changes = diffSettings(current.data, saved.data)
  let auditFailed = false
  for (const change of changes) {
    const record = buildAuditRecord(
      session.adminId,
      SETTINGS_CHANGE_ACTION,
      change.id,
      now,
      {
        settingId: change.id,
        previousValue: String(change.previous),
        newValue: String(change.next),
      },
    )
    const appended = await api.audit.append(record)
    if (!appended.ok) {
      auditFailed = true
    }
  }

  // Refresh the settings view now that persisted values have changed.
  revalidatePath('/settings')

  if (auditFailed) {
    return { ok: false, reason: 'audit_failed', settings: saved.data }
  }

  return { ok: true, settings: saved.data }
}
