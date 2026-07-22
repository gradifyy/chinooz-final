/**
 * Admin-core platform settings domain logic.
 *
 * Pure helpers backing the Settings_Module (Requirement 8). No I/O, no React,
 * no cookies, no fetch — plain typed inputs and outputs. Loading persisted
 * values, Super_Admin access control (`rbac.canPerform(roles,
 * 'settings.manage')`), persistence, and the surrounding validation/error UI
 * live in the page / action / `AdminApi` layers; this module only declares the
 * valid range of each platform setting, validates a proposed submission on an
 * all-or-nothing basis (Req 8.4), and computes the per-key change set used to
 * build audit records (Req 8.3).
 *
 * Settings are declared declaratively as {@link SettingDef} entries keyed by
 * setting id in {@link SETTING_DEFS}; each carries an inclusive `[min, max]`
 * range. Setting values are plain numbers — monetary settings are expressed in
 * integer paisa, consistent with the rest of the admin-core domain.
 *
 * See design.md "Settings_Module" / `lib/admin-core/settings` and Correctness
 * Properties 23 (settings validation is all-or-nothing) and 24 (settings change
 * records are complete).
 */

import type { PlatformSetting, SettingChange } from './types'

// ---------------------------------------------------------------------------
// Setting definitions (Req 8.4)
// ---------------------------------------------------------------------------

/**
 * Declarative definition of a single platform setting. `min` and `max` bound
 * the inclusive range of accepted values; a submitted value `v` is valid for
 * this setting exactly when `min <= v <= max`.
 */
export interface SettingDef {
  id: string
  /** inclusive lower bound of the accepted range */
  min: number
  /** inclusive upper bound of the accepted range */
  max: number
}

/**
 * Registry of platform settings keyed by setting id, each declaring its
 * accepted value range. This is the single source of truth the Settings_Module
 * uses to render editable fields and to validate submissions (Req 8.4).
 * Monetary settings are expressed in integer paisa.
 */
export const SETTING_DEFS: Record<string, SettingDef> = {
  'platform.commission_percent': {
    id: 'platform.commission_percent',
    min: 0,
    max: 100,
  },
  'platform.min_order_paisa': {
    id: 'platform.min_order_paisa',
    min: 0,
    max: 100_000_000,
  },
  'delivery.max_radius_km': {
    id: 'delivery.max_radius_km',
    min: 1,
    max: 100,
  },
  'delivery.base_fee_paisa': {
    id: 'delivery.base_fee_paisa',
    min: 0,
    max: 10_000_000,
  },
  'payout.hold_days': {
    id: 'payout.hold_days',
    min: 0,
    max: 30,
  },
  'order.cancellation_window_minutes': {
    id: 'order.cancellation_window_minutes',
    min: 0,
    max: 1_440,
  },
}

// ---------------------------------------------------------------------------
// Submission validation (Req 8.2 / 8.4 — Property 23)
// ---------------------------------------------------------------------------

/**
 * A single out-of-range setting reported by {@link validateSettings}. Carries
 * the offending setting `id` together with the accepted inclusive `[min, max]`
 * range so the UI can render a validation message identifying the setting and
 * its accepted range (Req 8.4).
 */
export interface SettingViolation {
  id: string
  /** inclusive lower bound of the accepted range */
  min: number
  /** inclusive upper bound of the accepted range */
  max: number
}

/**
 * Outcome of {@link validateSettings}. On acceptance (`ok: true`) it carries
 * the set of settings whose value actually changed; on rejection (`ok: false`)
 * it carries one {@link SettingViolation} per out-of-range setting and **no**
 * change set, so the caller persists nothing and leaves prior values unchanged
 * (Req 8.4).
 */
export type SettingsValidationResult =
  | { ok: true; changed: SettingChange[] }
  | { ok: false; violations: SettingViolation[] }

/**
 * Validates a proposed settings submission on an all-or-nothing basis
 * (Property 23).
 *
 * `submitted` is the set of proposed changes, each carrying the setting `id`,
 * its `previous` (currently persisted) value, and its `next` (proposed) value.
 * A setting is *changed* when `next !== previous`; only changed settings are
 * validated, since unchanged settings cannot move a persisted value out of
 * range.
 *
 * The submission is accepted if and only if every changed value lies within
 * its setting's defined inclusive range (Req 8.2). If any changed value is out
 * of range, the **entire** submission is rejected (Req 8.4): the result lists a
 * {@link SettingViolation} — setting id plus accepted `[min, max]` range — for
 * each offending setting and produces no change set, so the caller retains all
 * previously persisted values. On acceptance the result carries the change set
 * (one entry per changed setting) ready to be diffed/audited.
 *
 * A changed setting with no matching {@link SettingDef} has no defined range to
 * validate against and is therefore rejected as a violation reported with a
 * zero-width `[0, 0]` range placeholder. Pure and non-mutating; the input is
 * not modified.
 */
export function validateSettings(
  defs: Record<string, SettingDef>,
  submitted: readonly SettingChange[],
): SettingsValidationResult {
  const changed = submitted.filter((change) => change.next !== change.previous)

  const violations: SettingViolation[] = []
  for (const change of changed) {
    const def = defs[change.id]
    if (def === undefined) {
      violations.push({ id: change.id, min: 0, max: 0 })
      continue
    }
    if (change.next < def.min || change.next > def.max) {
      violations.push({ id: def.id, min: def.min, max: def.max })
    }
  }

  if (violations.length > 0) {
    return { ok: false, violations }
  }

  return { ok: true, changed: [...changed] }
}

// ---------------------------------------------------------------------------
// Change-set computation (Req 8.3 — Property 24)
// ---------------------------------------------------------------------------

/**
 * Computes the per-key change set between two settings snapshots
 * (Property 24).
 *
 * Produces exactly one {@link SettingChange} entry for each setting id present
 * in both `prev` and `next` whose value differs, each carrying the setting id,
 * its previous value, and its next value (Req 8.3). Settings whose value is
 * unchanged produce no entry, and entries preserve the iteration order of
 * `next`. The acting administrator identity and the change timestamp required
 * by the audit record (Req 8.3) are supplied by the action layer that owns
 * those contextual values. Pure and non-mutating; neither input is modified.
 */
export function diffSettings(
  prev: readonly PlatformSetting[],
  next: readonly PlatformSetting[],
): SettingChange[] {
  const previousById = new Map<string, number>()
  for (const setting of prev) {
    previousById.set(setting.id, setting.value)
  }

  const changes: SettingChange[] = []
  for (const setting of next) {
    const previousValue = previousById.get(setting.id)
    if (previousValue === undefined) continue
    if (previousValue !== setting.value) {
      changes.push({
        id: setting.id,
        previous: previousValue,
        next: setting.value,
      })
    }
  }

  return changes
}
