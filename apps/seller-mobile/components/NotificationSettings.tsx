import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Modal,
  Switch,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import {
  SELLER_NOTIFICATION_DEFAULTS,
  SELLER_NOTIFICATION_CATEGORIES,
  SELLER_NOTIFICATION_CHANNELS,
  SELLER_LANDING_TABS,
  SELLER_CURRENCIES,
  type NotificationPreferences,
  type NotificationChannel,
} from '@chinooz/mock-data'

function cloneDefaults(): NotificationPreferences {
  return JSON.parse(JSON.stringify(SELLER_NOTIFICATION_DEFAULTS))
}

export default function NotificationSettings() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const updateSeller = useSellerSessionStore(s => s.updateSeller)
  const sellerLanguage = useSellerSessionStore(s => s.seller.language)

  const [prefs, setPrefs] = useState<NotificationPreferences>(() => ({
    ...cloneDefaults(),
    language: sellerLanguage || 'en',
  }))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirtyDialog, setDirtyDialog] = useState(false)
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null)
  const [announce, setAnnounce] = useState('')

  const initialRef = useRef<NotificationPreferences>(prefs)

  useEffect(() => {
    analytics.screen({ name: 'seller-settings-notifications' })
  }, [])

  const dirty = useMemo(() => JSON.stringify(prefs) !== JSON.stringify(initialRef.current), [prefs])

  const toggleChannel = useCallback((cat: string, ch: NotificationChannel) => {
    setPrefs(prev => ({
      ...prev,
      toggles: {
        ...prev.toggles,
        [cat]: { ...prev.toggles[cat], [ch]: !prev.toggles[cat][ch] },
      },
    }))
    setSaved(false)
  }, [])

  const setField = useCallback(<K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const handleLanguageChange = useCallback((lang: 'en' | 'ne') => {
    setField('language', lang)
    i18n.changeLanguage(lang)
    updateSeller({ language: lang })
    const label = lang === 'ne' ? t('seller.settings.notifications.languageNe') : t('seller.settings.notifications.languageEn')
    setAnnounce(t('seller.settings.notifications.languageAnnounce', { lang: label }))
    setTimeout(() => setAnnounce(''), 2000)
  }, [i18n, updateSeller, t, setField])

  const handleSave = useCallback(() => {
    setSaving(true)
    setTimeout(() => {
      initialRef.current = prefs
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 600)
  }, [prefs])

  const guardedNav = useCallback((fn: () => void) => {
    if (dirty) { setPendingNav(() => fn); setDirtyDialog(true) }
    else fn()
  }, [dirty])

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => guardedNav(() => router.back())} accessibilityRole="button" accessibilityLabel={t('seller.settings.notifications.backToSettings')} hitSlop={8} style={styles.topBarBtn}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{t('seller.settings.notifications.editTitle')}</Text>
        <View style={styles.topBarDirty}>
          {dirty ? (
            <View style={styles.dirtyDotRow}>
              <View style={styles.dirtyDot} />
              <Text style={styles.dirtyText}>{t('seller.settings.notifications.dirtyIndicator')}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Live region */}
        {announce ? <Text style={styles.srOnly} accessibilityLiveRegion="assertive">{announce}</Text> : null}

        {/* Toggle categories */}
        <Section title={t('seller.settings.notifications.sectionToggles')}>
          <View style={styles.catList}>
            {SELLER_NOTIFICATION_CATEGORIES.map(cat => (
              <View key={cat.id} style={styles.catCard}>
                <Text accessibilityRole="header" style={styles.catTitle}>{t(cat.labelKey)}</Text>
                <View style={styles.channelRow}>
                  {SELLER_NOTIFICATION_CHANNELS.map(ch => {
                    const on = prefs.toggles[cat.id]?.[ch.id] ?? false
                    return (
                      <View key={ch.id} style={styles.channelItem}>
                        <Text style={styles.channelLabel}>{t(ch.labelKey)}</Text>
                        <Switch
                          value={on}
                          onValueChange={() => toggleChannel(cat.id, ch.id)}
                          accessibilityRole="switch"
                          accessibilityLabel={t('seller.settings.notifications.toggleAria', { category: t(cat.labelKey), channel: t(ch.labelKey) })}
                          trackColor={{ false: colors.border, true: colors.primary }}
                        />
                      </View>
                    )
                  })}
                </View>
              </View>
            ))}
          </View>
        </Section>

        {/* Quiet hours */}
        <Section title={t('seller.settings.notifications.sectionQuietHours')}>
          <View style={styles.quietRow}>
            <View style={styles.quietField}>
              <Text style={styles.fieldLabel}>{t('seller.settings.notifications.quietStart')}</Text>
              <TouchableOpacity
                onPress={() => {}}
                accessibilityRole="button"
                accessibilityLabel={t('seller.settings.notifications.quietAriaStart')}
                style={styles.timePicker}
              >
                <Text style={styles.timePickerText}>{prefs.quietHoursStart}</Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>{t('seller.settings.notifications.quietStartHint')}</Text>
            </View>
            <View style={styles.quietField}>
              <Text style={styles.fieldLabel}>{t('seller.settings.notifications.quietEnd')}</Text>
              <TouchableOpacity
                onPress={() => {}}
                accessibilityRole="button"
                accessibilityLabel={t('seller.settings.notifications.quietAriaEnd')}
                style={styles.timePicker}
              >
                <Text style={styles.timePickerText}>{prefs.quietHoursEnd}</Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>{t('seller.settings.notifications.quietEndHint')}</Text>
            </View>
          </View>
        </Section>

        {/* Summary */}
        <Section title={t('seller.settings.notifications.sectionSummary')}>
          <ToggleRow
            label={t('seller.settings.notifications.dailySummary')}
            hint={t('seller.settings.notifications.dailySummaryHint')}
            on={prefs.dailySummary}
            onToggle={() => setField('dailySummary', !prefs.dailySummary)}
            ariaLabel={t('seller.settings.notifications.summaryAria', { label: t('seller.settings.notifications.dailySummary') })}
          />
          <ToggleRow
            label={t('seller.settings.notifications.weeklySummary')}
            hint={t('seller.settings.notifications.weeklySummaryHint')}
            on={prefs.weeklySummary}
            onToggle={() => setField('weeklySummary', !prefs.weeklySummary)}
            ariaLabel={t('seller.settings.notifications.summaryAria', { label: t('seller.settings.notifications.weeklySummary') })}
          />
        </Section>

        {/* App preferences */}
        <Section title={t('seller.settings.notifications.sectionPreferences')}>
          <View>
            <Text style={styles.fieldLabel}>{t('seller.settings.notifications.language')}</Text>
            <View style={styles.langRow}>
              {(['en', 'ne'] as const).map(lang => {
                const active = prefs.language === lang
                const label = lang === 'ne' ? t('seller.settings.notifications.languageNe') : t('seller.settings.notifications.languageEn')
                return (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => handleLanguageChange(lang)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t('seller.settings.notifications.languageAria', { lang: label })}
                    style={[styles.langBtn, active && styles.langBtnActive]}
                  >
                    <Text style={[styles.langBtnText, active && styles.langBtnTextActive]}>{label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <Text style={styles.fieldHint}>{t('seller.settings.notifications.languageHint')}</Text>
          </View>

          <View>
            <Text style={styles.fieldLabel}>{t('seller.settings.notifications.landingTab')}</Text>
            <View style={styles.tabRow}>
              {SELLER_LANDING_TABS.map(tab => {
                const active = prefs.landingTab === tab.id
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setField('landingTab', tab.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t('seller.settings.notifications.landingTab')}
                    style={[styles.tabBtn, active && styles.tabBtnActive]}
                  >
                    <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{t(tab.labelKey)}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <Text style={styles.fieldHint}>{t('seller.settings.notifications.landingTabHint')}</Text>
          </View>

          <View>
            <Text style={styles.fieldLabel}>{t('seller.settings.notifications.currency')}</Text>
            <View style={styles.tabRow}>
              {SELLER_CURRENCIES.map(c => {
                const active = prefs.currency === c.id
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setField('currency', c.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t('seller.settings.notifications.currency')}
                    style={[styles.tabBtn, active && styles.tabBtnActive]}
                  >
                    <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{t(c.labelKey)}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <Text style={styles.fieldHint}>{t('seller.settings.notifications.currencyHint')}</Text>
          </View>
        </Section>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Save bar */}
      <View style={styles.saveBar}>
        <View style={styles.saveBarLeft}>
          {saved ? (
            <View style={styles.savedRow}><View style={styles.savedDot} /><Text style={styles.savedText}>{t('seller.settings.notifications.saved')}</Text></View>
          ) : dirty ? (
            <View style={styles.savedRow}><View style={styles.dirtyDot} /><Text style={styles.dirtyText}>{t('seller.settings.notifications.dirtyIndicator')}</Text></View>
          ) : (
            <Text style={styles.saveBarIdle}>{t('seller.settings.notifications.editSubtitle')}</Text>
          )}
        </View>
        <View style={styles.saveBarRight}>
          <TouchableOpacity onPress={() => { setPrefs(initialRef.current); setSaved(false) }} disabled={!dirty || saving} accessibilityRole="button" accessibilityLabel={t('seller.settings.notifications.discard')} style={[styles.discardBtn, (!dirty || saving) && styles.btnDisabled]}>
            <Text style={styles.discardText}>{t('seller.settings.notifications.discard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={!dirty || saving} accessibilityRole="button" accessibilityLabel={t('seller.settings.notifications.save')} style={[styles.saveBtn, (!dirty || saving) && styles.btnDisabled]}>
            <Text style={styles.saveBtnText}>{saving ? t('seller.settings.notifications.saving') : t('seller.settings.notifications.save')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dirty dialog */}
      <Modal visible={dirtyDialog} transparent animationType="fade" onRequestClose={() => setDirtyDialog(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDirtyDialog(false)} />
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{t('seller.settings.storefront.dirtyDialogTitle')}</Text>
          <Text style={styles.dialogBody}>{t('seller.settings.storefront.dirtyDialogBody')}</Text>
          <TouchableOpacity onPress={() => { setDirtyDialog(false); handleSave(); pendingNav?.(); setPendingNav(null) }} accessibilityRole="button" style={styles.dialogSaveBtn}>
            <Text style={styles.dialogSaveText}>{t('seller.settings.storefront.dirtyDialogSave')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDirtyDialog(false); pendingNav?.(); setPendingNav(null) }} accessibilityRole="button" style={styles.dialogDiscardBtn}>
            <Text style={styles.dialogDiscardText}>{t('seller.settings.storefront.dirtyDialogDiscard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDirtyDialog(false); setPendingNav(null) }} accessibilityRole="button" style={styles.dialogStayBtn}>
            <Text style={styles.dialogStayText}>{t('seller.settings.storefront.dirtyDialogStay')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function ToggleRow({ label, hint, on, onToggle, ariaLabel }: { label: string; hint?: string; on: boolean; onToggle: () => void; ariaLabel: string }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleRowInfo}>
        <Text style={styles.toggleRowLabel}>{label}</Text>
        {hint ? <Text style={styles.toggleRowHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={on}
        onValueChange={onToggle}
        accessibilityRole="switch"
        accessibilityLabel={ariaLabel}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[3], paddingVertical: spacing[3], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  topBarBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  topBarDirty: { width: 100, alignItems: 'flex-end' },
  dirtyDotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  dirtyDot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: colors.warning },
  dirtyText: { fontSize: 10, fontWeight: '600', color: colors.warning },
  scroll: { padding: spacing[4], gap: spacing[3] },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4] },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing[3] },
  sectionBody: { gap: spacing[4] },
  catList: { gap: spacing[3] },
  catCard: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.md, padding: spacing[3] },
  catTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing[2.5] },
  channelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  channelItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  channelLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  quietRow: { flexDirection: 'row', gap: spacing[3] },
  quietField: { flex: 1 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing[1] },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing[1] },
  timePicker: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], alignItems: 'center' },
  timePickerText: { fontSize: 16, fontWeight: '600', color: colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleRowInfo: { flex: 1, gap: 2 },
  toggleRowLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  toggleRowHint: { fontSize: 12, color: colors.textMuted },
  langRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[1] },
  langBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingVertical: spacing[2.5], alignItems: 'center' },
  langBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  langBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  langBtnTextActive: { color: colors.primary },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5], marginBottom: spacing[1] },
  tabBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1.5] },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  tabBtnTextActive: { color: colors.white },
  saveBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight },
  saveBarLeft: { flex: 1 },
  saveBarIdle: { fontSize: 12, color: colors.textTertiary },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  savedDot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: colors.success },
  savedText: { fontSize: 12, fontWeight: '600', color: colors.success },
  saveBarRight: { flexDirection: 'row', gap: spacing[2] },
  discardBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  discardText: { fontSize: 13, fontWeight: '600', color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2.5] },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  btnDisabled: { opacity: 0.4 },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: colors.overlay },
  dialogCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], padding: spacing[5], gap: spacing[3] },
  dialogTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  dialogBody: { fontSize: 14, color: colors.textSecondary },
  dialogSaveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  dialogSaveText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  dialogDiscardBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  dialogDiscardText: { color: colors.error, fontWeight: '600', fontSize: 14 },
  dialogStayBtn: { paddingVertical: spacing[2], alignItems: 'center' },
  dialogStayText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
})
