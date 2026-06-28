import React, { useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ChevronRight, ChevronLeft, type LucideIcon } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import {
  SELLER_SETTINGS_SECTIONS,
  type SettingsRow,
  type SettingsStatusKind,
} from '@chinooz/mock-data'
import { statusLabelFor, SETTINGS_ICONS } from './StoreSettingsList'

const ICONS = SETTINGS_ICONS

const STATUS_COLOR: Record<SettingsStatusKind, { dot: string; text: string; bg: string }> = {
  success: { dot: colors.success, text: colors.success, bg: colors.successLight },
  warning: { dot: colors.warning, text: colors.warning, bg: colors.warningLight },
  info: { dot: colors.info, text: colors.info, bg: colors.infoLight },
  neutral: { dot: colors.textTertiary, text: colors.textMuted, bg: colors.borderLight },
}

function iconFor(key: string): LucideIcon {
  return ICONS[key] ?? ICONS.store
}

export default function StoreSettingsDetail() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const seller = useSellerSessionStore(s => s.seller)

  const rowId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''

  useEffect(() => {
    analytics.screen({ name: 'seller-settings-detail', properties: { rowId } })
  }, [rowId])

  const { section, row } = useMemo(() => {
    for (const s of SELLER_SETTINGS_SECTIONS) {
      const r = s.rows.find(item => item.id === rowId)
      if (r) return { section: s, row: r }
    }
    return { section: SELLER_SETTINGS_SECTIONS[0], row: SELLER_SETTINGS_SECTIONS[0].rows[0] }
  }, [rowId])

  const sc = STATUS_COLOR[row.status.kind]
  const Icon = iconFor(row.icon)
  const status = statusLabelFor(row, seller.language, t)
  const siblings = section.rows.filter(r => r.id !== row.id)

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('seller.settings.back')}
          hitSlop={8}
          style={styles.topBarBtn}
        >
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {t(section.titleKey)}
        </Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View
          accessibilityLabel={t('seller.settings.detailAria', { title: t(row.labelKey) })}
          style={styles.detailCard}
        >
          <Text style={styles.crumb}>{t(section.titleKey)}</Text>
          <View style={styles.detailHead}>
            <View style={styles.detailIcon}>
              <Icon size={24} color={colors.primary} />
            </View>
            <View style={styles.detailHeadBody}>
              <Text accessibilityRole="header" style={styles.detailTitle}>
                {t(row.labelKey)}
              </Text>
              <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                <View style={[styles.statusChipDot, { backgroundColor: sc.dot }]} />
                <Text style={[styles.statusChipText, { color: sc.text }]}>{status}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.detailDesc}>{t(row.descKey)}</Text>

          <TouchableOpacity style={styles.manageBtn} accessibilityRole="button" activeOpacity={0.85}>
            <Text style={styles.manageBtnText}>{t('seller.settings.manage')}</Text>
          </TouchableOpacity>

          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>{t('seller.settings.comingSoon')}</Text>
          </View>
        </View>

        {siblings.length > 0 && (
          <View style={styles.relatedCard}>
            <Text accessibilityRole="header" style={styles.relatedTitle}>
              {t(section.groupKey)}
            </Text>
            {siblings.map((r, i) => {
              const RIcon = iconFor(r.icon)
              const rsc = STATUS_COLOR[r.status.kind]
              const rstatus = statusLabelFor(r, seller.language, t)
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => router.replace(`/settings/${r.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(r.labelKey)}, ${rstatus}`}
                  activeOpacity={0.85}
                  style={[styles.relatedRow, i < siblings.length - 1 && styles.relatedRowBorder]}
                >
                  <View style={styles.relatedIcon}>
                    <RIcon size={18} color={colors.primary} />
                  </View>
                  <View style={styles.relatedBody}>
                    <Text style={styles.relatedLabel} numberOfLines={1}>
                      {t(r.labelKey)}
                    </Text>
                    <View style={styles.relatedStatusRow}>
                      <View style={[styles.relatedDot, { backgroundColor: rsc.dot }]} />
                      <Text style={[styles.relatedStatusText, { color: rsc.text }]} numberOfLines={1}>
                        {rstatus}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}
        <View style={{ height: spacing[4] }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  scroll: { padding: spacing[4], gap: spacing[3] },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
    gap: spacing[3],
  },
  crumb: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  detailHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeadBody: { flex: 1, gap: spacing[1.5] },
  detailTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  statusChipDot: { width: 6, height: 6, borderRadius: radii.full },
  statusChipText: { fontSize: 12, fontWeight: '600' },
  detailDesc: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  manageBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[5],
  },
  manageBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  comingSoon: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  comingSoonText: { fontSize: 12, color: colors.textMuted },
  relatedCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  relatedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[1.5],
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  relatedRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  relatedIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedBody: { flex: 1, gap: 2 },
  relatedLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  relatedStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  relatedDot: { width: 6, height: 6, borderRadius: radii.full },
  relatedStatusText: { fontSize: 12, fontWeight: '500' },
})
