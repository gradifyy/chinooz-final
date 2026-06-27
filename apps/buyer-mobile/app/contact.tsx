import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, Linking, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors, radii, spacing } from '@chinooz/theme'

export default function ContactScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const cards = [
    {
      key: 'chat',
      icon: '💬',
      titleKey: 'contact.chatTitle',
      descKey: 'contact.chatDesc',
      btnKey: 'contact.chatButton',
      btnStyle: 'primary' as const,
      onPress: () => router.push('/(tabs)/inbox?tab=assistant'),
    },
    {
      key: 'email',
      icon: '✉️',
      titleKey: 'contact.emailTitle',
      descKey: 'contact.emailDesc',
      btnKey: 'contact.emailButton',
      btnStyle: 'outline' as const,
      onPress: () => Linking.openURL('mailto:support@chinooz.com'),
    },
    {
      key: 'phone',
      icon: '📞',
      titleKey: 'contact.phoneTitle',
      descKey: 'contact.phoneDesc',
      btnKey: 'contact.phoneButton',
      btnStyle: 'outline' as const,
      onPress: () => Linking.openURL('tel:+97714XXXXXX'),
    },
  ]

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('contact.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {cards.map(card => (
          <View key={card.key} style={s.card}>
            <Text style={s.cardIcon}>{card.icon}</Text>
            <Text style={s.cardTitle}>{t(card.titleKey)}</Text>
            <Text style={s.cardDesc}>{t(card.descKey)}</Text>
            <TouchableOpacity
              onPress={card.onPress}
              activeOpacity={0.85}
              style={[s.cardBtn, card.btnStyle === 'primary' ? s.cardBtnPrimary : s.cardBtnOutline]}
              accessibilityRole="button"
              accessibilityLabel={t(card.btnKey)}
            >
              <Text style={[s.cardBtnText, card.btnStyle === 'primary' ? s.cardBtnTextPrimary : s.cardBtnTextOutline]}>
                {t(card.btnKey)}
              </Text>
            </TouchableOpacity>
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
  content: { padding: spacing[4], gap: spacing[3] },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing[4], shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1, gap: spacing[2] },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardDesc: { fontSize: 14, fontWeight: '400', color: colors.textMuted },
  cardBtn: { marginTop: spacing[1], height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  cardBtnPrimary: { backgroundColor: colors.primary },
  cardBtnOutline: { borderWidth: 1.5, borderColor: colors.primary },
  cardBtnText: { fontSize: 14, fontWeight: '600' },
  cardBtnTextPrimary: { color: colors.white },
  cardBtnTextOutline: { color: colors.primary },
})
