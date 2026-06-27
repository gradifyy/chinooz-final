import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, radii, spacing, duration } from '@chinooz/theme'
import { useSessionStore, useUIStore } from '@chinooz/state'
import type { Locale } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { i18n } from '@chinooz/i18n'

const LANG_OPTIONS: { key: Locale; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'ne', label: 'नेपाली' },
]

export default function SettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const logout = useSessionStore(s => s.logout)
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)

  const [ordersNotif, setOrdersNotif] = useState(true)
  const [dealsNotif, setDealsNotif] = useState(true)
  const [messagesNotif, setMessagesNotif] = useState(true)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn])

  const handleLanguageChange = useCallback((lang: Locale) => {
    setLocale(lang)
    i18n.changeLanguage(lang)
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [setLocale])

  const handleDeleteAccount = useCallback(() => {
    setShowDelete(false)
    logout()
    router.replace('/splash')
  }, [logout, router])

  if (!isLoggedIn) return null

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('settings.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Language */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>{t('settings.language').toUpperCase()}</Text>
          <View style={s.sectionCard}>
            <View style={s.row}>
              <View style={s.rowInfo}>
                <Text style={s.rowLabel}>{t('settings.language')}</Text>
                <Text style={s.rowDesc}>{t('settings.languageDesc')}</Text>
              </View>
            </View>
            <View style={s.langSegmentWrap}>
              <View style={s.langSegment}>
                {LANG_OPTIONS.map(opt => {
                  const isActive = locale === opt.key
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => handleLanguageChange(opt.key)}
                      style={[s.langOption, isActive && s.langOptionActive]}
                      activeOpacity={0.7}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text style={[s.langOptionText, isActive && s.langOptionTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>{t('settings.notifications').toUpperCase()}</Text>
          <View style={s.sectionCard}>
            <View style={s.toggleRow}>
              <View style={s.rowInfo}>
                <Text style={s.rowLabel}>{t('settings.ordersNotif')}</Text>
                <Text style={s.rowDesc}>{t('settings.ordersNotifDesc')}</Text>
              </View>
              <Switch value={ordersNotif} onValueChange={setOrdersNotif} trackColor={{ false: colors.border, true: colors.primary50 }} thumbColor={ordersNotif ? colors.primary : colors.textTertiary} />
            </View>
            <View style={s.divider} />
            <View style={s.toggleRow}>
              <View style={s.rowInfo}>
                <Text style={s.rowLabel}>{t('settings.dealsNotif')}</Text>
                <Text style={s.rowDesc}>{t('settings.dealsNotifDesc')}</Text>
              </View>
              <Switch value={dealsNotif} onValueChange={setDealsNotif} trackColor={{ false: colors.border, true: colors.primary50 }} thumbColor={dealsNotif ? colors.primary : colors.textTertiary} />
            </View>
            <View style={s.divider} />
            <View style={s.toggleRow}>
              <View style={s.rowInfo}>
                <Text style={s.rowLabel}>{t('settings.messagesNotif')}</Text>
                <Text style={s.rowDesc}>{t('settings.messagesNotifDesc')}</Text>
              </View>
              <Switch value={messagesNotif} onValueChange={setMessagesNotif} trackColor={{ false: colors.border, true: colors.primary50 }} thumbColor={messagesNotif ? colors.primary : colors.textTertiary} />
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>{t('settings.appearance').toUpperCase()}</Text>
          <View style={s.sectionCard}>
            <View style={[s.toggleRow, { opacity: 0.5 }]}>
              <View style={s.rowInfo}>
                <Text style={s.rowLabel}>🌙 {t('settings.darkMode')}</Text>
              </View>
              <View style={s.comingSoonWrap}>
                <Text style={s.comingSoonText}>{t('settings.comingSoon')}</Text>
                <Switch value={false} disabled trackColor={{ false: colors.border, true: colors.primary50 }} thumbColor={colors.textTertiary} />
              </View>
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>{t('settings.account').toUpperCase()}</Text>
          <View style={s.sectionCard}>
            <TouchableOpacity onPress={() => router.push('/phone-entry')} style={s.row} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('settings.changePhone')}>
              <Text style={s.rowLabel}>{t('settings.changePhone')}</Text>
              <Text style={s.rowChevron}>›</Text>
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity onPress={() => setShowDelete(true)} style={s.row} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('settings.deleteAccount')}>
              <Text style={[s.rowLabel, { color: colors.error }]}>{t('settings.deleteAccount')}</Text>
              <Text style={s.rowChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {/* Delete confirm */}
      <Modal visible={showDelete} transparent animationType="fade" onRequestClose={() => setShowDelete(false)}>
        <Pressable style={s.overlay} onPress={() => setShowDelete(false)}>
          <Pressable style={s.dialog} onPress={e => e.stopPropagation()}>
            <Text style={s.dialogTitle}>{t('settings.deleteTitle')}</Text>
            <Text style={s.dialogMsg}>{t('settings.deleteMsg')}</Text>
            <View style={s.dialogActions}>
              <TouchableOpacity onPress={() => setShowDelete(false)} style={s.dialogCancel} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
                <Text style={s.dialogCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteAccount} style={s.dialogDelete} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('settings.deleteConfirm')}>
                <Text style={s.dialogDeleteText}>{t('settings.deleteConfirm')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: colors.text },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },

  section: { gap: spacing[2] },
  sectionHeader: { fontSize: 12, fontWeight: '600', color: colors.textMuted, paddingLeft: spacing[4] },
  sectionCard: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  rowInfo: { flex: 1, gap: spacing[0.5], marginRight: spacing[3] },
  rowLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  rowDesc: { fontSize: 14, fontWeight: '400', color: colors.textMuted },
  rowChevron: { fontSize: 20, color: colors.textTertiary, fontWeight: '300' },
  divider: { height: 1, backgroundColor: '#E5E5E5', marginLeft: spacing[4] },

  langSegmentWrap: { paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  langSegment: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radii.full, height: 40 },
  langOption: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full },
  langOptionActive: { backgroundColor: colors.primary },
  langOptionText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  langOptionTextActive: { color: colors.white },

  comingSoonWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  comingSoonText: { fontSize: 12, color: colors.textMuted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
  dialog: { backgroundColor: colors.surface, borderRadius: radii['2xl'], padding: spacing[5], width: '100%', maxWidth: 360 },
  dialogTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing[2] },
  dialogMsg: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: spacing[5] },
  dialogActions: { flexDirection: 'row', gap: spacing[3] },
  dialogCancel: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  dialogCancelText: { fontSize: 14, fontWeight: '600', color: colors.text },
  dialogDelete: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  dialogDeleteText: { fontSize: 14, fontWeight: '600', color: colors.white },
})
