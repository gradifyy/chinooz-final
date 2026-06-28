'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import {
  Store,
  ShieldCheck,
  Truck,
  Bell,
  Users,
  Lock,
  Building2,
  FileText,
  MapPin,
  CreditCard,
  CalendarClock,
  Mail,
  Package,
  KeyRound,
  Smartphone,
  Globe,
  Palette,
  Percent,
  RotateCcw,
  UserCog,
  ChevronRight,
  ChevronLeft,
  Star,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import {
  SELLER_SETTINGS_SECTIONS,
  SELLER_STORE_RATING,
  SELLER_STORE_REVIEW_COUNT,
  getStoreVerification,
  type SettingsRow,
  type SettingsSection,
  type SettingsStatusKind,
} from '@chinooz/mock-data'

const ICONS: Record<string, LucideIcon> = {
  store: Store,
  'shield-check': ShieldCheck,
  truck: Truck,
  bell: Bell,
  users: Users,
  lock: Lock,
  building: Building2,
  'file-text': FileText,
  'map-pin': MapPin,
  'credit-card': CreditCard,
  'calendar-clock': CalendarClock,
  mail: Mail,
  package: Package,
  'key-round': KeyRound,
  smartphone: Smartphone,
  globe: Globe,
  palette: Palette,
  percent: Percent,
  'rotate-ccw': RotateCcw,
  'user-cog': UserCog,
}

const STATUS_STYLE: Record<
  SettingsStatusKind,
  { dot: string; text: string; chipBg: string; chipText: string }
> = {
  success: { dot: 'bg-success', text: 'text-success', chipBg: 'bg-success-light', chipText: 'text-success' },
  warning: { dot: 'bg-warning', text: 'text-warning', chipBg: 'bg-warning-light', chipText: 'text-warning' },
  info: { dot: 'bg-info', text: 'text-info', chipBg: 'bg-info-light', chipText: 'text-info' },
  neutral: { dot: 'bg-text-tertiary', text: 'text-text-muted', chipBg: 'bg-border-light', chipText: 'text-text-muted' },
}

function iconFor(key: string): LucideIcon {
  return ICONS[key] ?? Store
}

export default function StoreSettingsHub() {
  const { t } = useTranslation()
  const router = useRouter()
  const store = useSellerSessionStore(s => s.store)
  const kycStatus = useSellerSessionStore(s => s.kycStatus)
  const goLiveStatus = useSellerSessionStore(s => s.goLiveStatus)
  const seller = useSellerSessionStore(s => s.seller)

  const firstRowId = SELLER_SETTINGS_SECTIONS[0].rows[0].id
  const [activeRowId, setActiveRowId] = useState<string>(firstRowId)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'seller-settings' })
  }, [])

  const verification = getStoreVerification(kycStatus, goLiveStatus)
  const verificationLabel = t(verification.labelKey)
  const storeName = store?.name ?? t('seller.title')
  const ratingValue = SELLER_STORE_RATING.toFixed(1)

  const active = useMemo(() => {
    for (const s of SELLER_SETTINGS_SECTIONS) {
      const row = s.rows.find(r => r.id === activeRowId)
      if (row) return { section: s, row }
    }
    return { section: SELLER_SETTINGS_SECTIONS[0], row: SELLER_SETTINGS_SECTIONS[0].rows[0] }
  }, [activeRowId])

  const selectRow = (id: string) => {
    setActiveRowId(id)
    setMobileDetail(true)
  }

  const goBack = () => {
    setMobileDetail(false)
  }

  const statusLabel = (row: SettingsRow): string => {
    if (row.status.labelKey === 'seller.settings.status.language') {
      return seller.language === 'ne' ? 'नेपाली' : 'English'
    }
    return row.status.count != null ? t(row.status.labelKey, { count: row.status.count }) : t(row.status.labelKey)
  }

  return (
    <Screen>
      <Container>
        <div className="py-6 md:py-8">
            <SettingsTopBar
              title={t('seller.settings.title')}
              moreLabel={t('seller.settings.moreMenu')}
              onMore={() => setMenuOpen(true)}
              backHref="/"
              backLabel={t('seller.home')}
            />

          {/* xl centered container for the settings area */}
          <div className="xl:mx-auto xl:max-w-5xl">
            {/* Store header — visible on md+ and on mobile list view */}
            <div className={mobileDetail ? 'hidden md:block' : 'block'}>
              <StoreHeader
                storeName={storeName}
                ratingValue={ratingValue}
                reviewCount={SELLER_STORE_REVIEW_COUNT}
                verification={verification.kind}
                verificationLabel={verificationLabel}
                t={t}
              />
            </div>

            {/* md+ : sub-nav (240px) + detail pane */}
            <div className="mt-6 hidden gap-6 md:grid md:grid-cols-[240px_minmax(0,1fr)]">
              <SettingsSubNav
                sections={SELLER_SETTINGS_SECTIONS}
                activeRowId={activeRowId}
                onSelect={selectRow}
                statusLabel={statusLabel}
                t={t}
              />
              <DetailPane
                section={active.section}
                row={active.row}
                statusLabel={statusLabel}
                t={t}
                onSelectRow={selectRow}
              />
            </div>

            {/* mobile : list → detail push */}
            <div className="mt-6 md:hidden">
              {!mobileDetail ? (
                <SettingsList
                  sections={SELLER_SETTINGS_SECTIONS}
                  onSelect={selectRow}
                  statusLabel={statusLabel}
                  t={t}
                />
              ) : (
                <MobileDetail
                  section={active.section}
                  row={active.row}
                  statusLabel={statusLabel}
                  onBack={goBack}
                  t={t}
                  onSelectRow={selectRow}
                />
              )}
            </div>
          </div>
        </div>
      </Container>

      {menuOpen && <MoreSheet onClose={() => setMenuOpen(false)} onNavigate={router} t={t} />}
    </Screen>
  )
}

function SettingsTopBar({
  title,
  moreLabel,
  onMore,
  backHref,
  backLabel,
}: {
  title: string
  moreLabel: string
  onMore: () => void
  backHref: string
  backLabel: string
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <Link
        href={backHref}
        className="inline-flex min-touch items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-text-muted hover:bg-background hover:text-text transition-colors"
      >
        <ChevronLeft size={18} aria-hidden="true" />
        <span>{backLabel}</span>
      </Link>
      <h1 className="text-lg font-semibold text-text md:text-xl">{title}</h1>
      <button
        type="button"
        onClick={onMore}
        aria-label={moreLabel}
        className="inline-flex min-touch items-center justify-center rounded-lg border border-border bg-surface p-2 text-text hover:bg-background transition-colors"
      >
        <Menu size={18} aria-hidden="true" />
      </button>
    </div>
  )
}

function StoreHeader({
  storeName,
  ratingValue,
  reviewCount,
  verification,
  verificationLabel,
  t,
}: {
  storeName: string
  ratingValue: string
  reviewCount: number
  verification: 'verified' | 'actionNeeded' | 'underReview'
  verificationLabel: string
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const vStyle = STATUS_STYLE[verification === 'actionNeeded' ? 'warning' : verification === 'underReview' ? 'info' : 'success']
  return (
    <section
      aria-label={t('seller.settings.headerAria', {
        name: storeName,
        value: ratingValue,
        status: verificationLabel,
      })}
      className="flex items-center gap-4 rounded-lg border border-border-light bg-surface p-4 shadow-sm sm:p-5"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50"
        aria-hidden="true"
      >
        <span className="h-5 w-5 rounded-full bg-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold text-text">{storeName}</h2>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Star size={14} className="fill-gold text-gold" aria-hidden="true" />
          <span className="text-sm font-semibold text-text" aria-hidden="true">
            {ratingValue}
          </span>
          <span className="text-xs text-text-muted" aria-hidden="true">
            ({reviewCount})
          </span>
          <span className="sr-only">{t('seller.settings.ratingAria', { value: ratingValue, count: reviewCount })}</span>
        </div>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${vStyle.chipBg} ${vStyle.chipText}`}
        role="status"
        aria-label={t('seller.settings.statusAria', { status: verificationLabel })}
      >
        <span className={`h-2 w-2 rounded-full ${vStyle.dot}`} aria-hidden="true" />
        {verificationLabel}
      </span>
    </section>
  )
}

function GroupHeader({ label }: { label: string }) {
  return (
    <h3 className="px-3 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wide text-text-muted first:pt-0">
      {label}
    </h3>
  )
}

function RowIcon({ iconKey, active }: { iconKey: string; active?: boolean }) {
  const Icon = iconFor(iconKey)
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
        active ? 'bg-primary text-white' : 'bg-primary-50 text-primary'
      }`}
      aria-hidden="true"
    >
      <Icon size={20} />
    </span>
  )
}

function StatusMeta({ kind, label }: { kind: SettingsStatusKind; label: string }) {
  const s = STATUS_STYLE[kind]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      <span className={`text-xs font-medium ${s.text}`}>{label}</span>
    </span>
  )
}

function SettingsSubNav({
  sections,
  activeRowId,
  onSelect,
  statusLabel,
  t,
}: {
  sections: SettingsSection[]
  activeRowId: string
  onSelect: (id: string) => void
  statusLabel: (row: SettingsRow) => string
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <nav
      aria-label={t('seller.settings.navAria')}
      className="max-h-[calc(100vh-220px)] overflow-y-auto rounded-lg border border-border-light bg-surface scrollbar-none"
    >
      {sections.map(section => (
        <div key={section.id}>
          <GroupHeader label={t(section.groupKey)} />
          <ul className="px-1.5 pb-2">
            {section.rows.map(row => {
              const active = row.id === activeRowId
              const label = t(row.labelKey)
              const status = statusLabel(row)
              return (
                <li key={row.id} className="contents">
                  <button
                    type="button"
                    onClick={() => onSelect(row.id)}
                    aria-current={active ? 'page' : undefined}
                    aria-label={`${label}, ${status}`}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
                      active ? 'bg-primary-50' : 'hover:bg-background'
                    }`}
                  >
                    <RowIcon iconKey={row.icon} active={active} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${active ? 'font-semibold text-primary' : 'font-medium text-text'}`}>
                        {label}
                      </span>
                      <StatusMeta kind={row.status.kind} label={status} />
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-text-tertiary" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SettingsList({
  sections,
  onSelect,
  statusLabel,
  t,
}: {
  sections: SettingsSection[]
  onSelect: (id: string) => void
  statusLabel: (row: SettingsRow) => string
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <div
      aria-label={t('seller.settings.listAria')}
      className="overflow-hidden rounded-lg border border-border-light bg-surface"
    >
      {sections.map((section, si) => (
        <div key={section.id}>
          <GroupHeader label={t(section.groupKey)} />
          <ul>
            {section.rows.map((row, ri) => {
              const label = t(row.labelKey)
              const status = statusLabel(row)
              const last = si === sections.length - 1 && ri === section.rows.length - 1
              return (
                <li key={row.id} className="contents">
                  <button
                    type="button"
                    onClick={() => onSelect(row.id)}
                    aria-label={`${label}, ${status}`}
                    className={`flex h-14 w-full items-center gap-3 bg-surface px-3 text-left transition-colors hover:bg-background active:scale-[0.995] ${
                      !last ? 'border-b border-border' : ''
                    }`}
                  >
                    <RowIcon iconKey={row.icon} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-medium text-text">{label}</span>
                      <StatusMeta kind={row.status.kind} label={status} />
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-text-tertiary" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function DetailPane({
  section,
  row,
  statusLabel,
  t,
  onSelectRow,
}: {
  section: SettingsSection
  row: SettingsRow
  statusLabel: (row: SettingsRow) => string
  t: (k: string, o?: Record<string, unknown>) => string
  onSelectRow: (id: string) => void
}) {
  const s = STATUS_STYLE[row.status.kind]
  const Icon = iconFor(row.icon)
  return (
    <section
      aria-label={t('seller.settings.detailAria', { title: t(row.labelKey) })}
      className="rounded-lg border border-border-light bg-surface p-5 shadow-sm sm:p-6"
    >
      <nav aria-label="Breadcrumb" className="mb-4 text-xs font-medium text-text-muted">
        <span>{t(section.titleKey)}</span>
        <span className="mx-1.5" aria-hidden="true">›</span>
        <span className="text-text">{t(row.labelKey)}</span>
      </nav>

      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary" aria-hidden="true">
          <Icon size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-text">{t(row.labelKey)}</h2>
          <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.chipBg} ${s.chipText}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
            {statusLabel(row)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-text-secondary">{t(row.descKey)}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        {(row.id === 'store-profile' || row.id === 'kyc' || row.id === 'shipping-zones') ? (
          <Link
            href={row.id === 'store-profile' ? '/settings/storefront' : row.id === 'kyc' ? '/settings/business' : '/settings/shipping'}
            className="inline-flex min-touch items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            {t('seller.settings.manage')}
          </Link>
        ) : (
          <button
            type="button"
            className="inline-flex min-touch items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            {t('seller.settings.manage')}
          </button>
        )}
        <button
          type="button"
          className="inline-flex min-touch items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text hover:bg-background transition-colors"
        >
          {t('seller.settings.edit')}
        </button>
      </div>

      {row.id !== 'store-profile' && row.id !== 'kyc' && row.id !== 'shipping-zones' && (
        <p className="mt-4 rounded-lg bg-background px-3 py-2.5 text-xs text-text-muted">
          {t('seller.settings.comingSoon')}
        </p>
      )}

      <RelatedRows section={section} activeRowId={row.id} onSelect={onSelectRow} statusLabel={statusLabel} t={t} />
    </section>
  )
}

function RelatedRows({
  section,
  activeRowId,
  onSelect,
  statusLabel,
  t,
}: {
  section: SettingsSection
  activeRowId: string
  onSelect: (id: string) => void
  statusLabel: (row: SettingsRow) => string
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const siblings = section.rows.filter(r => r.id !== activeRowId)
  if (siblings.length === 0) return null
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {t(section.groupKey)}
      </h3>
      <ul className="overflow-hidden rounded-lg border border-border-light">
        {siblings.map((r, i) => {
          const Icon = iconFor(r.icon)
          const s = STATUS_STYLE[r.status.kind]
          return (
            <li key={r.id} className="contents">
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                aria-label={`${t(r.labelKey)}, ${statusLabel(r)}`}
                className={`flex w-full items-center gap-3 bg-surface px-3 py-3 text-left transition-colors hover:bg-background ${
                  i < siblings.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text">{t(r.labelKey)}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                    <span className={`text-xs font-medium ${s.text}`}>{statusLabel(r)}</span>
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-text-tertiary" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MobileDetail({
  section,
  row,
  statusLabel,
  onBack,
  t,
  onSelectRow,
}: {
  section: SettingsSection
  row: SettingsRow
  statusLabel: (row: SettingsRow) => string
  onBack: () => void
  t: (k: string, o?: Record<string, unknown>) => string
  onSelectRow: (id: string) => void
}) {
  const s = STATUS_STYLE[row.status.kind]
  const Icon = iconFor(row.icon)
  const status = statusLabel(row)
  const siblings = section.rows.filter(r => r.id !== row.id)
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex min-touch items-center gap-1.5 rounded-lg px-1 py-1.5 text-sm font-semibold text-text-muted hover:text-text transition-colors"
      >
        <ChevronLeft size={18} aria-hidden="true" />
        <span>{t('seller.settings.back')}</span>
      </button>
      <section
        aria-label={t('seller.settings.detailAria', { title: t(row.labelKey) })}
        className="rounded-lg border border-border-light bg-surface p-5 shadow-sm"
      >
        <nav aria-label="Breadcrumb" className="mb-3 text-xs font-medium text-text-muted">
          <span>{t(section.titleKey)}</span>
          <span className="mx-1.5" aria-hidden="true">›</span>
          <span className="text-text">{t(row.labelKey)}</span>
        </nav>
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary" aria-hidden="true">
            <Icon size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-text">{t(row.labelKey)}</h2>
            <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.chipBg} ${s.chipText}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
              {status}
            </span>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">{t(row.descKey)}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="inline-flex min-touch items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
            {t('seller.settings.manage')}
          </button>
        </div>
        <p className="mt-4 rounded-lg bg-background px-3 py-2.5 text-xs text-text-muted">{t('seller.settings.comingSoon')}</p>
      </section>

      {siblings.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t(section.groupKey)}
          </h3>
          <ul className="overflow-hidden rounded-lg border border-border-light bg-surface">
            {siblings.map((r, i) => {
              const RIcon = iconFor(r.icon)
              const rs = STATUS_STYLE[r.status.kind]
              const rstatus = statusLabel(r)
              return (
                <li key={r.id} className="contents">
                  <button
                    type="button"
                    onClick={() => onSelectRow(r.id)}
                    aria-label={`${t(r.labelKey)}, ${rstatus}`}
                    className={`flex w-full items-center gap-3 bg-surface px-3 py-3 text-left transition-colors hover:bg-background active:scale-[0.995] ${
                      i < siblings.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary" aria-hidden="true">
                      <RIcon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-text">{t(r.labelKey)}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${rs.dot}`} aria-hidden="true" />
                        <span className={`text-xs font-medium ${rs.text}`}>{rstatus}</span>
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-text-tertiary" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function MoreSheet({
  onClose,
  onNavigate,
  t,
}: {
  onClose: () => void
  onNavigate: ReturnType<typeof useRouter>
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const items = [
    { label: t('seller.dashboard.tab'), href: '/' },
    { label: t('seller.products.tab'), href: '/products' },
    { label: t('seller.settings.storeSettings'), href: '/settings' },
  ]
  return (
    <div className="fixed inset-0 z-modal" role="dialog" aria-modal="true" aria-label={t('seller.settings.moreMenu')}>
      <button className="absolute inset-0 bg-overlay" onClick={onClose} aria-label={t('common.close')} />
      <div className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-surface p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-text">{t('seller.settings.moreMenu')}</span>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="inline-flex min-touch items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-background">
            <X size={18} />
          </button>
        </div>
        <ul className="overflow-hidden rounded-lg border border-border-light">
          {items.map((it, i) => (
            <li key={it.href} className="contents">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onNavigate.push(it.href)
                }}
                className={`flex w-full items-center justify-between bg-surface px-3 py-3 text-left text-sm font-medium text-text transition-colors hover:bg-background ${
                  i < items.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                {it.label}
                <ChevronRight size={16} className="text-text-tertiary" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
