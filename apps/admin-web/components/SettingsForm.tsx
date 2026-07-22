'use client'

/**
 * Platform settings form (client island) — Settings_Module (Requirement 8).
 *
 * The interactive surface of the settings route. The surrounding page is a
 * Server Component restricted to `Super_Admin` that loads the current persisted
 * value of each platform setting (Req 8.1) and passes them in as the initial
 * state; this island owns editing and submission:
 *
 * - Display persisted values (Req 8.1): each editable field is seeded with the
 *   server-loaded current value, and its accepted `[min, max]` range is shown
 *   alongside it.
 * - All-or-nothing submission with validation messaging (Req 8.4): on submit
 *   the proposed values are sent to the `saveSettings` server action, which
 *   re-validates them with the pure `validateSettings` core helper. If any
 *   value is out of range the **entire** submission is rejected — no value is
 *   persisted — and a per-field message identifies the offending setting and
 *   its accepted range, plus a summary alert. A field whose value is not a
 *   finite number is rejected the same way, client-side, before the action is
 *   called, so a blank/invalid entry can never slip through as a change.
 * - Persistence / audit outcomes: a persistence failure (Req 8.5) surfaces an
 *   error and leaves the displayed values unchanged; an audit-append failure
 *   (Req 9.2) surfaces a warning while reflecting the persisted values; a
 *   successful save confirms and resyncs the displayed values.
 *
 * The acting administrator's `settings.manage` permission is enforced by the
 * server page (insufficient-permission message, Req 8.6) and re-checked in the
 * action (defense in depth); this island assumes an authorized Super_Admin.
 *
 * Every user-visible string is resolved against `@chinooz/i18n` by the server
 * page and passed in as props, so this island holds no hard-coded strings
 * (Req 10.1). Presentation uses `@chinooz/ui-web` primitives and
 * `@chinooz/theme` token utility classes only — no hard-coded color/dimension
 * literals (Req 11.1).
 *
 * _Requirements: 8.1, 8.4, 8.6_
 */

import { useState, useTransition } from 'react'
import { Button, Card, Text } from '@chinooz/ui-web'

import { saveSettings, type ProposedSetting } from '@/app/actions/settings'

/** A single editable setting, pre-resolved by the server page. */
export interface SettingField {
  /** Setting identifier (e.g. `platform.commission_percent`). */
  id: string
  /** Localized, human-readable field label. */
  label: string
  /** Current persisted value (Req 8.1). */
  value: number
  /** Inclusive lower bound of the accepted range. */
  min: number
  /** Inclusive upper bound of the accepted range. */
  max: number
}

interface SettingsFormLabels {
  /** Save-changes button label. */
  save: string
  /** In-flight save label. */
  saving: string
  /** Success confirmation message. */
  saved: string
  /** "Accepted range" label prefix shown next to each field. */
  acceptedRange: string
  /** Per-field message when the entry is not a finite number. */
  notANumber: string
  /** Summary alert shown when the submission is rejected for any out-of-range value (Req 8.4). */
  validationSummary: string
  /** Persistence-failure error message (Req 8.5). */
  saveError: string
  /** Audit-append failure warning (Req 9.2). */
  auditWarning: string
}

interface SettingsFormProps {
  /** Editable settings seeded with their current persisted values (Req 8.1). */
  fields: SettingField[]
  /** Pre-localized, user-visible labels resolved by the server page. */
  labels: SettingsFormLabels
}

/** Transient banner state driving which top-level message (if any) is shown. */
type Banner = 'none' | 'saved' | 'invalid' | 'save_error' | 'audit_warning'

/**
 * Formats the accepted-range hint for a field, e.g. "Accepted range: 0–100".
 * Numeric bounds are not translatable text, so concatenation is safe.
 */
function rangeHint(label: string, min: number, max: number): string {
  return `${label}: ${min}–${max}`
}

export default function SettingsForm({ fields, labels }: SettingsFormProps) {
  // Edited input values keyed by setting id, held as strings so partial/blank
  // entries are representable and validated explicitly before submission.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of fields) initial[field.id] = String(field.value)
    return initial
  })
  // Setting ids currently flagged out-of-range or non-numeric (Req 8.4).
  const [violationIds, setViolationIds] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const [banner, setBanner] = useState<Banner>('none')
  const [isPending, startTransition] = useTransition()

  function handleChange(id: string, next: string) {
    setValues((prev) => ({ ...prev, [id]: next }))
  }

  function handleSubmit() {
    // Client-side guard: reject any blank/non-finite entry up front so it can
    // never be sent as a numeric change. These join the all-or-nothing set.
    const localViolations = new Set<string>()
    const proposed: ProposedSetting[] = []
    for (const field of fields) {
      const raw = values[field.id] ?? ''
      const parsed = Number(raw)
      if (raw.trim() === '' || !Number.isFinite(parsed)) {
        localViolations.add(field.id)
        continue
      }
      proposed.push({ id: field.id, value: parsed })
    }

    if (localViolations.size > 0) {
      setViolationIds(localViolations)
      setBanner('invalid')
      return
    }

    startTransition(async () => {
      const result = await saveSettings(proposed)

      if (result.ok) {
        setViolationIds(new Set())
        setBanner('saved')
        // Resync displayed values with the persisted snapshot (Req 8.1).
        setValues(() => {
          const next: Record<string, string> = {}
          for (const setting of result.settings) {
            next[setting.id] = String(setting.value)
          }
          return next
        })
        return
      }

      if (result.reason === 'invalid') {
        // Reject the entire submission; flag each offending setting (Req 8.4).
        setViolationIds(new Set(result.violations.map((v) => v.id)))
        setBanner('invalid')
        return
      }

      if (result.reason === 'audit_failed') {
        setViolationIds(new Set())
        setBanner('audit_warning')
        setValues(() => {
          const next: Record<string, string> = {}
          for (const setting of result.settings) {
            next[setting.id] = String(setting.value)
          }
          return next
        })
        return
      }

      // 'persist_failed' | 'retrieval_failed' | 'forbidden' | 'unauthenticated':
      // displayed values are left unchanged (Req 8.5).
      setViolationIds(new Set())
      setBanner('save_error')
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {banner === 'saved' && (
        <p
          role="status"
          className="rounded-xl border border-success bg-success/15 px-3 py-2 text-sm text-success"
          data-testid="admin-settings-saved"
        >
          {labels.saved}
        </p>
      )}

      {banner === 'invalid' && (
        <p
          role="alert"
          className="rounded-xl border border-error bg-error/15 px-3 py-2 text-sm text-error"
          data-testid="admin-settings-validation-summary"
        >
          {labels.validationSummary}
        </p>
      )}

      {banner === 'save_error' && (
        <p
          role="alert"
          className="rounded-xl border border-error bg-error/15 px-3 py-2 text-sm text-error"
          data-testid="admin-settings-save-error"
        >
          {labels.saveError}
        </p>
      )}

      {banner === 'audit_warning' && (
        <p
          role="alert"
          className="rounded-xl border border-warning bg-warning/15 px-3 py-2 text-sm text-warning"
          data-testid="admin-settings-audit-warning"
        >
          {labels.auditWarning}
        </p>
      )}

      <div className="flex flex-col gap-4" data-testid="admin-settings-fields">
        {fields.map((field) => {
          const invalid = violationIds.has(field.id)
          const raw = values[field.id] ?? ''
          const isNumber = raw.trim() !== '' && Number.isFinite(Number(raw))
          return (
            <Card key={field.id}>
              <div className="flex flex-col gap-2" data-testid={`admin-setting-${field.id}`}>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-text">
                    {field.label}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={raw}
                    min={field.min}
                    max={field.max}
                    aria-invalid={invalid}
                    onChange={(event) => handleChange(field.id, event.target.value)}
                    className={`h-11 rounded-xl border bg-background px-3 text-sm text-text outline-none focus:border-primary ${
                      invalid ? 'border-error' : 'border-border'
                    }`}
                    data-testid={`admin-setting-input-${field.id}`}
                  />
                </label>
                <Text variant="caption" className="text-text-muted">
                  {`${labels.acceptedRange}: ${field.min}–${field.max}`}
                </Text>
                {invalid && (
                  <Text
                    variant="caption"
                    className="text-error"
                    testID={`admin-setting-error-${field.id}`}
                  >
                    {isNumber
                      ? rangeHint(labels.acceptedRange, field.min, field.max)
                      : labels.notANumber}
                  </Text>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex">
        <Button
          variant="primary"
          size="md"
          disabled={isPending}
          loading={isPending}
          onPress={handleSubmit}
          testID="admin-settings-save"
        >
          {isPending ? labels.saving : labels.save}
        </Button>
      </div>
    </div>
  )
}
