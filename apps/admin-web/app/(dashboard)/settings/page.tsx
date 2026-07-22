/**
 * Settings page (Server Component) — Settings_Module (Requirement 8).
 *
 * Server-first by design: this RSC resolves the active locale, re-checks the
 * acting administrator's `settings.manage` permission (defense in depth — the
 * middleware already restricts `/settings` to `Super_Admin`), and loads the
 * current persisted value of each platform setting (Req 8.1) before rendering.
 *
 * Access control (Req 8.6): an administrator who lacks `settings.manage` (i.e.
 * is not a `Super_Admin`) is shown an insufficient-permission message rather
 * than the editor, satisfying Requirement 8.6 directly on the page. An
 * unauthenticated request is redirected to the login route.
 *
 * The persisted values are combined with each setting's declared accepted range
 * from the pure `SETTING_DEFS` and a localized field label, then passed to the
 * {@link SettingsForm} client island, which owns editing and the all-or-nothing
 * submission with validation messaging (Req 8.4). Validation, persistence, and
 * audit-record construction are all performed by the pure `lib/admin-core`
 * helpers behind the `saveSettings` action; this page only sequences the
 * initial retrieval and supplies localized labels.
 *
 * Localization (Req 10.1): every user-visible string comes from the
 * `@chinooz/i18n` EN/NE catalogs. Design-system compliance (Req 11.1): all
 * styling uses `@chinooz/theme` token utility classes only.
 *
 * _Requirements: 8.1, 8.4, 8.6_
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { resources } from '@chinooz/i18n'
import { Card, Heading, Text } from '@chinooz/ui-web'

import { resolveLocale } from '@/lib/admin-core/i18n'
import { canPerform } from '@/lib/admin-core/rbac'
import { SETTING_DEFS } from '@/lib/admin-core/settings'
import { mockAdminApi } from '@/lib/api/mock'
import { readSession } from '@/lib/session'
import SettingsForm, { type SettingField } from '@/components/SettingsForm'

/**
 * Maps each platform setting id to the i18n field-label key under
 * `admin.settings.fields`. Centralized so a new setting fails type-checking
 * here until a label is provided.
 */
const FIELD_LABEL_KEYS: Record<
  string,
  keyof (typeof resources)['en']['translation']['admin']['settings']['fields']
> = {
  'platform.commission_percent': 'platformCommissionPercent',
  'platform.min_order_paisa': 'platformMinOrderPaisa',
  'delivery.max_radius_km': 'deliveryMaxRadiusKm',
  'delivery.base_fee_paisa': 'deliveryBaseFeePaisa',
  'payout.hold_days': 'payoutHoldDays',
  'order.cancellation_window_minutes': 'orderCancellationWindowMinutes',
}

export default async function SettingsPage() {
  // Defense in depth: re-check session + permission even though middleware guards.
  const session = await readSession()
  if (session === null) redirect('/login?next=/settings')

  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const t = resources[locale].translation.admin
  const settings = t.settings

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <Heading variant="h2" testID="admin-settings-title">
          {settings.title}
        </Heading>
        <Text variant="caption" className="text-text-muted">
          {settings.subtitle}
        </Text>
      </header>

      {!canPerform(session.roles, 'settings.manage') ? (
        // Insufficient permission — non-Super_Admin (Req 8.6).
        <Card>
          <Text className="text-text" testID="admin-settings-insufficient-permission">
            {settings.insufficientPermission}
          </Text>
        </Card>
      ) : (
        <SettingsContent
          fieldLabels={settings.fields}
          formLabels={{
            save: settings.save,
            saving: settings.saving,
            saved: settings.saved,
            acceptedRange: settings.acceptedRange,
            notANumber: settings.notANumber,
            validationSummary: settings.validationSummary,
            saveError: settings.saveError,
            auditWarning: settings.auditWarning,
          }}
          loadError={settings.loadError}
        />
      )}
    </div>
  )
}

interface SettingsContentProps {
  fieldLabels: (typeof resources)['en']['translation']['admin']['settings']['fields']
  formLabels: {
    save: string
    saving: string
    saved: string
    acceptedRange: string
    notANumber: string
    validationSummary: string
    saveError: string
    auditWarning: string
  }
  loadError: string
}

/**
 * Loads the persisted settings and renders the editor, or a load-error
 * indication when retrieval fails (Req 8.1). Split out so the permission gate
 * above performs no data retrieval for denied callers.
 */
async function SettingsContent({
  fieldLabels,
  formLabels,
  loadError,
}: SettingsContentProps) {
  const current = await mockAdminApi.settings.list()

  if (!current.ok) {
    return (
      <Card>
        <Text
          className="text-error"
          testID="admin-settings-load-error"
        >
          {loadError}
        </Text>
      </Card>
    )
  }

  // Combine each persisted value with its declared range and localized label.
  const fields: SettingField[] = current.data.map((setting) => {
    const def = SETTING_DEFS[setting.id]
    const labelKey = FIELD_LABEL_KEYS[setting.id]
    return {
      id: setting.id,
      label: labelKey ? fieldLabels[labelKey] : setting.id,
      value: setting.value,
      min: def?.min ?? 0,
      max: def?.max ?? 0,
    }
  })

  return <SettingsForm fields={fields} labels={formLabels} />
}
