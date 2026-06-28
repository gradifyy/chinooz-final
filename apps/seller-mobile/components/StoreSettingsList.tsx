import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
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
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
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

export const SETTINGS_ICONS = ICONS

const STATUS_COLOR: Record<SettingsStatusKind, { dot: string; text: string }> = {
  success: { dot: colors.success, text: colors.success },
  warning: { dot: colors.warning, text: colors.warning },
  info: { dot: colors.info, text: colors.info },
  neutral: { dot: colors.textTertiary, text: colors.textMuted },
}

const VERIFICATION_COLOR: Record<'verified' | 'actionNeeded' | 'underReview', { dot: string; text: string; bg: string }> = {
  verified: { dot: colors.success, text: colors.success, bg: colors.successLight },
  actionNeeded: { dot: colors.warning, text: colors.warning, bg: colors.warningLight },
  underReview: { dot: colors.info, text: colors.info, bg: colors.infoLight },
}

function iconFor(key: string): LucideIcon {
  return ICONS[key] ?? Store
}

export function statusLabelFor(row: SettingsRow, language: 'en' | 'ne', t: (k: string, o?: Record<string, unknown>) => string): string {
  if (row.status.labelKey === 'seller.settings.status.language') {
    return language === 'ne' ? 'नेपाली' : 'English'
  }
  return row.status.count != null ? t(row.status.labelKey, { count: row.status.count }) : t(row.status.labelKey)
}

export default function StoreSettingsList() {
  const { t } = useTranslation()
  const router = useRouter()
  const store = useSellerSessionStore(s => s.store)
  const kycStatus = useSellerSessionStore(s => s.kycStatus)
  const goLiveStatus = useSellerSessionStore(s => s.goLiveStatus)
  const seller = useSellerSessionStore(s => s.seller)

  useEffect(() => {
    analytics.screen({ name: 'seller-settings' })
  }, [])

  const verification = getStoreVerification(kycStatus, goLiveStatus)
  const verificationLabel = t(verification.labelKey)
  const vColor = VERIFICATION_COLOR[verification.kind]
  const storeName = store?.name ?? t('seller.title')
  const ratingValue = SELLER_STORE_RATING.toFixed(1)

  const openRow = (id: string) => {
    router.push(`/settings/${id}`)
  }

  return (
    <View style={styles.container}>
      <SettingsTopBar title={t('seller.settings.title')} backLabel={t('seller.settings.back')} onBack={() => router.replace('/dashboard')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StoreHeader
          storeName={storeName}
          ratingValue={ratingValue}
          reviewCount={SELLER_STORE_REVIEW_COUNT}
          verificationLabel={verificationLabel}
          vColor={vColor}
          t={t}
        />

        {/* Reviews shortcut (reachable from ☰ More) */}
        <View style={styles.listCard}>
          <TouchableOpacity
            onPress={() => router.push('/reviews')}
            accessibilityRole="button"
            accessibilityLabel={t('seller.reviews.moreReviewsAria')}
            activeOpacity={0.85}
            style={[styles.row, styles.rowBorder, { minHeight: 56 }]}
          >
            <View style={styles.rowIcon}>
              <Star size={24} color={colors.gold} fill={colors.gold} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {t('seller.reviews.moreReviews')}
              </Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: colors.gold }]} />
                <Text style={[styles.statusText, { color: colors.textMuted }]} numberOfLines={1}>
                  {t('seller.reviews.subtitle')}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {SELLER_SETTINGS_SECTIONS.map((section, si) => (
            <View key={section.id}>
              <Text accessibilityRole="header" style={styles.groupHeader}>
                {t(section.groupKey)}
              </Text>
              {section.rows.map((row, ri) => {
                const last = si === SELLER_SETTINGS_SECTIONS.length - 1 && ri === section.rows.length - 1
                const label = t(row.labelKey)
                const status = statusLabelFor(row, seller.language, t)
                const sc = STATUS_COLOR[row.status.kind]
                const Icon = iconFor(row.icon)
                return (
                  <TouchableOpacity
                    key={row.id}
                    onPress={() => openRow(row.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}, ${status}`}
                    activeOpacity={0.85}
                    style={[styles.row, !last && styles.rowBorder, { minHeight: 56 }]}
                  >
                    <View style={styles.rowIcon}>
                      <Icon size={24} color={colors.primary} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowLabel} numberOfLines={1}>
                        {label}
                      </Text>
                      <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
                        <Text style={[styles.statusText, { color: sc.text }]} numberOfLines={1}>
                          {status}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
          <View style={{ height: spacing[2] }} />
        </View>
      </ScrollView>
    </View>
  )
}

function SettingsTopBar({ title, backLabel, onBack }: { title: string; backLabel: string; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={8}
        style={styles.topBarBtn}
      >
        <ChevronLeft size={20} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.topBarBtn, { opacity: 0 }]}>
        <Menu size={20} color={colors.text} />
      </View>
    </View>
  )
}

function StoreHeader({
  storeName,
  ratingValue,
  reviewCount,
  verificationLabel,
  vColor,
  t,
}: {
  storeName: string
  ratingValue: string
  reviewCount: number
  verificationLabel: string
  vColor: { dot: string; text: string; bg: string }
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <View
      accessibilityLabel={t('seller.settings.headerAria', {
        name: storeName,
        value: ratingValue,
        status: verificationLabel,
      })}
      style={styles.storeCard}
    >
      <View style={styles.logo}>
        <View style={styles.logoDot} />
      </View>
      <View style={styles.storeBody}>
        <Text accessibilityRole="header" style={styles.storeName} numberOfLines={1}>
          {storeName}
        </Text>
        <View style={styles.ratingRow}>
          <Star size={14} color={colors.gold} fill={colors.gold} />
          <Text style={styles.ratingValue}>{ratingValue}</Text>
          <Text style={styles.ratingCount}>({reviewCount})</Text>
          <Text style={styles.srOnly}>
            {t('seller.settings.ratingAria', { value: ratingValue, count: reviewCount })}
          </Text>
        </View>
      </View>
      <View style={[styles.verifyPill, { backgroundColor: vColor.bg }]}>
        <View style={[styles.verifyDot, { backgroundColor: vColor.dot }]} />
        <Text style={[styles.verifyText, { color: vColor.text }]}>{verificationLabel}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing[4], gap: spacing[3] },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: { width: 20, height: 20, borderRadius: radii.full, backgroundColor: colors.primary },
  storeBody: { flex: 1, gap: 2 },
  storeName: { fontSize: 18, fontWeight: '600', color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  ratingValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  ratingCount: { fontSize: 12, color: colors.textMuted },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  verifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  verifyDot: { width: 8, height: 8, borderRadius: radii.full },
  verifyText: { fontSize: 12, fontWeight: '600' },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  groupHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[1.5],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  statusDot: { width: 6, height: 6, borderRadius: radii.full },
  statusText: { fontSize: 12, fontWeight: '500' },
})
