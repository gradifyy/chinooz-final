import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, radii, spacing, duration } from '@chinooz/theme'
import { usePaymentsStore, useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { PaymentMethodSkeleton } from '../components/Skeletons'
import type { LinkedPaymentMethod, PaymentType } from '@chinooz/state'

const METHOD_META: Record<PaymentType, { icon: string; color: string }> = {
  cod: { icon: '💵', color: '#16A34A' },
  khalti: { icon: '💜', color: '#5C2D91' },
  esewa: { icon: '💚', color: '#60BB46' },
}

export default function PaymentsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)

  const methods = usePaymentsStore(s => s.methods)
  const setDefault = usePaymentsStore(s => s.setDefault)
  const connect = usePaymentsStore(s => s.connect)
  const remove = usePaymentsStore(s => s.remove)

  const [connectId, setConnectId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn])

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleSetDefault = useCallback((id: string) => {
    setDefault(id)
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [setDefault])

  const handleConnect = useCallback(() => {
    if (!connectId) return
    setConnecting(true)
    setTimeout(() => {
      connect(connectId)
      setConnecting(false)
      setConnectId(null)
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    }, 1500)
  }, [connectId, connect])

  const handleRemove = useCallback(() => {
    if (removeId) {
      remove(removeId)
      setRemoveId(null)
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
    }
  }, [removeId, remove])

  const connectedMethods = methods.filter(m => m.connected)
  const unconnectedMethods = methods.filter(m => !m.connected)

  const connectTarget = connectId ? methods.find(m => m.id === connectId) : null

  if (!isLoggedIn) return null

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('payments.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {initialLoading ? (
          <Animated.View entering={FadeIn.duration(duration.normal)} accessibilityRole="progressbar" accessibilityLabel={t('common.loadingPayments')}>
            {[0, 1, 2].map(i => <PaymentMethodSkeleton key={i} />)}
          </Animated.View>
        ) : connectedMethods.length === 0 && unconnectedMethods.length === 0 ? (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(duration.normal)} style={s.emptyWrap}>
            <Text style={s.emptyIcon}>💳</Text>
            <Text style={s.emptyTitle}>{t('payments.emptyTitle')}</Text>
            <Text style={s.emptySub}>{t('payments.emptySubtitle')}</Text>
          </Animated.View>
        ) : (
          <>
            {connectedMethods.map((method, i) => {
              const meta = METHOD_META[method.type]
              return (
                <Animated.View
                  key={method.id}
                  entering={reduced ? undefined : FadeIn.delay(i * 50).duration(duration.normal)}
                  layout={reduced ? undefined : Layout.springify()}
                  exiting={reduced ? undefined : FadeOut.duration(250)}
                >
                  <View style={[s.card, method.isDefault && s.cardDefault]}>
                    <View style={s.cardRow}>
                      <View style={[s.logo, { backgroundColor: meta.color + '15' }]}>
                        <Text style={s.logoIcon}>{meta.icon}</Text>
                      </View>
                      <View style={s.cardInfo}>
                        <Text style={s.methodName}>{t(`payments.${method.type === 'cod' ? 'cashOnDelivery' : method.type}`)}</Text>
                        <Text style={s.methodNote}>{t(`payments.${method.type === 'cod' ? 'codNote' : method.type + 'Note'}`)}</Text>
                      </View>
                      <View style={s.cardRight}>
                        {method.isDefault ? (
                          <View style={s.defaultBadge}>
                            <Text style={s.defaultBadgeText}>{t('payments.default')}</Text>
                          </View>
                        ) : (
                          <TouchableOpacity onPress={() => handleSetDefault(method.id)} style={s.setDefaultBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('payments.setDefault')}>
                            <Text style={s.setDefaultText}>{t('payments.setDefault')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {method.type !== 'cod' && (
                      <View style={s.cardActions}>
                        <TouchableOpacity onPress={() => setRemoveId(method.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('payments.remove')}>
                          <Text style={s.removeText}>{t('payments.remove')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )
            })}

            {unconnectedMethods.length > 0 && (
              <View style={s.sectionHeader}>
                <Text style={s.sectionLabel}>{t('payments.addMethod')}</Text>
              </View>
            )}

            {unconnectedMethods.map((method, i) => {
              const meta = METHOD_META[method.type]
              return (
                <Animated.View
                  key={method.id}
                  entering={reduced ? undefined : FadeIn.delay((connectedMethods.length + i) * 50).duration(duration.normal)}
                  layout={reduced ? undefined : Layout.springify()}
                >
                  <TouchableOpacity
                    onPress={() => setConnectId(method.id)}
                    activeOpacity={0.7}
                    style={s.card}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('payments.connect')} ${t(`payments.${method.type}`)}`}
                  >
                    <View style={s.cardRow}>
                      <View style={[s.logo, { backgroundColor: meta.color + '15' }]}>
                        <Text style={s.logoIcon}>{meta.icon}</Text>
                      </View>
                      <View style={s.cardInfo}>
                        <Text style={s.methodName}>{t(`payments.${method.type}`)}</Text>
                        <Text style={s.methodNote}>{t(`payments.${method.type + 'Note'}`)}</Text>
                      </View>
                      <Text style={s.connectArrow}>›</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )
            })}
          </>
        )}

        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {/* Connect bottom sheet */}
      <Modal visible={connectId !== null} transparent animationType="none" onRequestClose={() => { if (!connecting) setConnectId(null) }}>
        <Pressable style={s.overlay} onPress={() => { if (!connecting) setConnectId(null) }}>
          <Pressable onPress={e => e.stopPropagation()}>
            <Animated.View entering={reduced ? undefined : SlideInDown.duration(300)} exiting={reduced ? undefined : SlideOutDown.duration(250)} style={s.sheet}>
              <View style={s.sheetHandle} />
              <View style={s.sheetContent}>
                {connectTarget && (
                  <>
                    <View style={[s.sheetLogo, { backgroundColor: METHOD_META[connectTarget.type].color + '15' }]}>
                      <Text style={s.sheetLogoIcon}>{METHOD_META[connectTarget.type].icon}</Text>
                    </View>
                    <Text style={s.sheetTitle}>{t('payments.connect')} {t(`payments.${connectTarget.type}`)}</Text>
                    <Text style={s.sheetNote}>{t(`payments.${connectTarget.type}Note`)}</Text>
                    <TouchableOpacity
                      onPress={handleConnect}
                      disabled={connecting}
                      style={[s.connectBtn, connecting && s.connectBtnLoading]}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={connecting ? t('payments.connecting') : t('payments.connect')}
                    >
                      {connecting ? (
                        <View style={s.connectBtnRow}>
                          <ActivityIndicator size="small" color={colors.white} />
                          <Text style={s.connectBtnText}>{t('payments.connecting')}</Text>
                        </View>
                      ) : (
                        <Text style={s.connectBtnText}>{t('payments.connect')}</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Remove confirm */}
      <Modal visible={removeId !== null} transparent animationType="fade" onRequestClose={() => setRemoveId(null)}>
        <Pressable style={s.overlay} onPress={() => setRemoveId(null)}>
          <Pressable style={s.dialog} onPress={e => e.stopPropagation()}>
            <Text style={s.dialogTitle}>{t('payments.removeTitle')}</Text>
            <Text style={s.dialogMsg}>{t('payments.removeMsg')}</Text>
            <View style={s.dialogActions}>
              <TouchableOpacity onPress={() => setRemoveId(null)} style={s.dialogCancel} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
                <Text style={s.dialogCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRemove} style={s.dialogDelete} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('payments.remove')}>
                <Text style={s.dialogDeleteText}>{t('payments.remove')}</Text>
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
  list: { padding: spacing[4], gap: spacing[3] },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], gap: spacing[3] },
  emptyIcon: { fontSize: 48, marginBottom: spacing[2] },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.borderLight, gap: spacing[2], shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardDefault: { borderColor: colors.primary, borderWidth: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  logo: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 20 },
  cardInfo: { flex: 1, gap: spacing[0.5] },
  methodName: { fontSize: 16, fontWeight: '600', color: colors.text },
  methodNote: { fontSize: 14, fontWeight: '400', color: colors.textMuted },
  cardRight: { alignItems: 'flex-end' },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full, backgroundColor: colors.primary },
  defaultBadgeText: { fontSize: 12, fontWeight: '600', color: colors.white },
  setDefaultBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  setDefaultText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing[0.5] },
  removeText: { fontSize: 12, fontWeight: '600', color: colors.error },
  connectArrow: { fontSize: 20, color: colors.textTertiary, fontWeight: '300' },

  sectionHeader: { marginTop: spacing[2] },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing[3], marginBottom: spacing[2] },
  sheetContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[6], alignItems: 'center', gap: spacing[3] },
  sheetLogo: { width: 56, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing[2] },
  sheetLogoIcon: { fontSize: 28 },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  sheetNote: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  connectBtn: { marginTop: spacing[2], alignSelf: 'stretch', height: 48, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  connectBtnLoading: { opacity: 0.8 },
  connectBtnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  connectBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  dialog: { backgroundColor: colors.surface, borderRadius: radii['2xl'], padding: spacing[5], width: '100%', maxWidth: 360, alignSelf: 'center' },
  dialogTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing[2] },
  dialogMsg: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: spacing[5] },
  dialogActions: { flexDirection: 'row', gap: spacing[3] },
  dialogCancel: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  dialogCancelText: { fontSize: 14, fontWeight: '600', color: colors.text },
  dialogDelete: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  dialogDeleteText: { fontSize: 14, fontWeight: '600', color: colors.white },
})
