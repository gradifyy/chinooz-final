import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors, radii, spacing } from '@chinooz/theme'

export default function AboutScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('about.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.logoSection}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>🛍️</Text>
          </View>
          <Text style={s.appName}>Chinooz</Text>
          <Text style={s.tagline}>{t('about.tagline')}</Text>
          <Text style={s.version}>{t('about.version', { version: '1.0.0' })}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.descText}>{t('about.description')}</Text>
        </View>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>{t('about.company')}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>{t('about.location')}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>{t('about.website')}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push('/feedback')} style={s.reportBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('about.reportProblem')}>
          <Text style={s.reportBtnText}>{t('about.reportProblem')}</Text>
        </TouchableOpacity>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: colors.text },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { padding: spacing[4], gap: spacing[4] },
  logoSection: { alignItems: 'center', paddingVertical: spacing[6], gap: spacing[2] },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 36 },
  appName: { fontSize: 24, fontWeight: '700', color: colors.text },
  tagline: { fontSize: 14, color: colors.textMuted },
  version: { fontSize: 12, color: colors.textTertiary },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing[4], shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  descText: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  infoCard: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  infoRow: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  infoLabel: { fontSize: 14, color: colors.text },
  divider: { height: 1, backgroundColor: '#E5E5E5', marginLeft: spacing[4] },
  reportBtn: { marginTop: spacing[2], height: 44, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  reportBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
})
