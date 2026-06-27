import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors, radii, spacing } from '@chinooz/theme'

const SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7']

export default function PrivacyScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('privacy.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.lastUpdated}>{t('privacy.lastUpdated')}</Text>
        {SECTIONS.map(sec => (
          <View key={sec} style={s.section}>
            <Text style={s.sectionTitle}>{t(`privacy.${sec}Title`)}</Text>
            <Text style={s.sectionBody}>{t(`privacy.${sec}Body`)}</Text>
          </View>
        ))}
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
  lastUpdated: { fontSize: 12, color: colors.textTertiary, marginBottom: spacing[2] },
  section: { gap: spacing[2] },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  sectionBody: { fontSize: 16, fontWeight: '400', color: colors.textMuted, lineHeight: 26 },
})
