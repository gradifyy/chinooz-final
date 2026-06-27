import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
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
import { useAddressStore, useSessionStore } from '@chinooz/state'
import { addressFormSchema } from '@chinooz/validation'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { AddressCardSkeleton } from '../components/Skeletons'
import type { SavedAddress } from '@chinooz/state'

const KATHMANDU_AREAS = [
  'Baneshwor', 'Thamel', 'New Road', 'Patan', 'Bhaktapur', 'Koteshwor',
  'Tokha', 'Budhanilkantha', 'Balaju', 'Maharajgunj', 'Lazimpat', 'Durbar Marg',
  'Putalisadak', 'Maitidevi', 'Sinamangal', 'Chabahil', 'Swayambhu', 'Kalanki',
]

const LABEL_COLORS: Record<string, { bg: string; text: string }> = {
  home: { bg: colors.primary50, text: colors.primary },
  work: { bg: colors.infoLight, text: colors.info },
  other: { bg: colors.border, text: colors.textMuted },
}

export default function AddressesScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)

  const addresses = useAddressStore(s => s.addresses)
  const addAddress = useAddressStore(s => s.addAddress)
  const removeAddress = useAddressStore(s => s.removeAddress)
  const setDefault = useAddressStore(s => s.setDefault)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [label, setLabel] = useState<'home' | 'work' | 'other'>('home')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn])

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const openAdd = useCallback(() => {
    setName(''); setPhone(''); setStreet(''); setArea(''); setLabel('home'); setErrors({})
    setEditingId(null)
    setShowForm(true)
  }, [])

  const openEdit = useCallback((addr: SavedAddress) => {
    setName(addr.fullName); setPhone(addr.phone); setStreet(addr.street)
    setArea(addr.area); setLabel(addr.label); setErrors({})
    setEditingId(addr.id)
    setShowForm(true)
  }, [])

  const handleSave = useCallback(() => {
    const result = addressFormSchema.safeParse({ fullName: name, phone, street, area, city: 'Kathmandu', label })
    if (!result.success) {
      const e: Record<string, string> = {}
      result.error.issues.forEach(i => { e[i.path[0] as string] = i.message })
      setErrors(e)
      return
    }
    setErrors({})
    if (editingId) removeAddress(editingId)
    addAddress({ fullName: name.trim(), phone, street: street.trim(), area, city: 'Kathmandu', label })
    setShowForm(false)
    setEditingId(null)
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
  }, [name, phone, street, area, label, editingId, addAddress, removeAddress])

  const handleDelete = useCallback(() => {
    if (deleteId) {
      removeAddress(deleteId)
      setDeleteId(null)
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
    }
  }, [deleteId, removeAddress])

  const handleSetDefault = useCallback((id: string) => {
    setDefault(id)
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [setDefault])

  const isValid = name.trim().length >= 2 && phone.length === 10 && street.length >= 3 && area.length >= 2

  if (!isLoggedIn) return null

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('addresses.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {initialLoading ? (
          <Animated.View entering={FadeIn.duration(duration.normal)} accessibilityRole="progressbar" accessibilityLabel={t('common.loadingAddresses')}>
            {[0, 1, 2].map(i => <AddressCardSkeleton key={i} />)}
          </Animated.View>
        ) : addresses.length === 0 ? (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(duration.normal)} style={s.emptyWrap}>
            <Text style={s.emptyIcon}>📍</Text>
            <Text style={s.emptyTitle}>{t('addresses.emptyTitle')}</Text>
            <Text style={s.emptySub}>{t('addresses.emptySubtitle')}</Text>
            <TouchableOpacity onPress={openAdd} activeOpacity={0.85} style={s.emptyCta} accessibilityRole="button" accessibilityLabel={t('addresses.addNew')}>
              <Text style={s.emptyCtaText}>{t('addresses.addNew')}</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          addresses.map((addr, i) => {
            const lc = LABEL_COLORS[addr.label] ?? LABEL_COLORS.other
            return (
              <Animated.View
                key={addr.id}
                entering={reduced ? undefined : FadeIn.delay(i * 50).duration(duration.normal)}
                layout={reduced ? undefined : Layout.springify()}
                exiting={reduced ? undefined : FadeOut.duration(250)}
              >
                <View style={[s.card, addr.isDefault && s.cardDefault]}>
                  <View style={s.cardHeader}>
                    <View style={s.badgeRow}>
                      <View style={[s.labelChip, { backgroundColor: lc.bg }]}>
                        <Text style={[s.labelChipText, { color: lc.text }]}>{t(`addresses.${addr.label}`)}</Text>
                      </View>
                      {addr.isDefault && (
                        <View style={s.defaultBadge}>
                          <Text style={s.defaultBadgeText}>{t('addresses.default')}</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.cardActions}>
                      <TouchableOpacity onPress={() => openEdit(addr)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.edit')}>
                        <Text style={s.editText}>{t('common.edit')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setDeleteId(addr.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                        <Text style={s.deleteText}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={s.addrName}>{addr.fullName}</Text>
                  <Text style={s.addrPhone}>{addr.phone}</Text>
                  <Text style={s.addrLine} numberOfLines={3}>{addr.street}, {addr.area}, {addr.city}</Text>

                  {!addr.isDefault && (
                    <TouchableOpacity onPress={() => handleSetDefault(addr.id)} style={s.setDefaultBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('addresses.setDefault')}>
                      <Text style={s.setDefaultText}>{t('addresses.setDefault')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            )
          })
        )}

        <TouchableOpacity onPress={openAdd} style={s.addBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('addresses.addNew')}>
          <Text style={s.addIcon}>+</Text>
          <Text style={s.addText}>{t('addresses.addNew')}</Text>
        </TouchableOpacity>

        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {/* Add/Edit bottom sheet */}
      <Modal visible={showForm} transparent animationType="none" onRequestClose={() => setShowForm(false)}>
        <Pressable style={s.overlay} onPress={() => setShowForm(false)}>
          <Pressable onPress={e => e.stopPropagation()}>
            <Animated.View entering={reduced ? undefined : SlideInDown.duration(300)} exiting={reduced ? undefined : SlideOutDown.duration(250)} style={s.sheet}>
              <View style={s.sheetHandle} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetContent}>
                <Text style={s.sheetTitle}>{editingId ? t('addresses.editAddress') : t('addresses.addNew')}</Text>

                <View style={s.field}>
                  <Text style={s.fieldLabel}>{t('location.fullName')} *</Text>
                  <TextInput style={[s.input, errors.fullName && s.inputError]} value={name} onChangeText={setName} placeholder={t('location.fullNamePlaceholder')} placeholderTextColor={colors.textTertiary} accessibilityLabel={t('location.fullName')} />
                  {errors.fullName && <Text style={s.fieldError}>{errors.fullName}</Text>}
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLabel}>{t('location.phone')} *</Text>
                  <TextInput style={[s.input, errors.phone && s.inputError]} value={phone} onChangeText={v => setPhone(v.replace(/\D/g, '').slice(0, 10))} placeholder="98XXXXXXXX" placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" maxLength={10} accessibilityLabel={t('location.phone')} />
                  {errors.phone && <Text style={s.fieldError}>{errors.phone}</Text>}
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLabel}>{t('location.street')} *</Text>
                  <TextInput style={[s.input, errors.street && s.inputError]} value={street} onChangeText={setStreet} placeholder={t('location.street')} placeholderTextColor={colors.textTertiary} accessibilityLabel={t('location.street')} />
                  {errors.street && <Text style={s.fieldError}>{errors.street}</Text>}
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLabel}>{t('location.area')} *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
                    {KATHMANDU_AREAS.map(a => (
                      <TouchableOpacity key={a} onPress={() => setArea(a)} style={[s.areaChip, area === a && s.areaChipActive]} activeOpacity={0.7}>
                        <Text style={[s.areaChipText, area === a && s.areaChipTextActive]}>{a}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {errors.area && <Text style={s.fieldError}>{errors.area}</Text>}
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLabel}>{t('location.city')}</Text>
                  <TextInput style={[s.input, s.inputDisabled]} value="Kathmandu" editable={false} />
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLabel}>{t('location.label')}</Text>
                  <View style={s.labelRow}>
                    {(['home', 'work', 'other'] as const).map(l => (
                      <TouchableOpacity key={l} onPress={() => setLabel(l)} style={[s.labelBtn, label === l && s.labelBtnActive]} activeOpacity={0.7}>
                        <Text style={[s.labelBtnText, label === l && s.labelBtnTextActive]}>{t(`addresses.${l}`)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={s.formActions}>
                  <TouchableOpacity onPress={() => { setShowForm(false); setEditingId(null) }} style={s.cancelBtn} activeOpacity={0.7}>
                    <Text style={s.cancelBtnText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} disabled={!isValid} style={[s.saveBtn, !isValid && s.saveBtnDisabled]} activeOpacity={0.85}>
                    <Text style={[s.saveBtnText, !isValid && s.saveBtnTextDisabled]}>{t('location.save')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={deleteId !== null} transparent animationType="fade" onRequestClose={() => setDeleteId(null)}>
        <Pressable style={s.overlay} onPress={() => setDeleteId(null)}>
          <Pressable style={s.dialog} onPress={e => e.stopPropagation()}>
            <Text style={s.dialogTitle}>{t('addresses.deleteTitle')}</Text>
            <Text style={s.dialogMsg}>{t('addresses.deleteMsg')}</Text>
            <View style={s.dialogActions}>
              <TouchableOpacity onPress={() => setDeleteId(null)} style={s.dialogCancel} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
                <Text style={s.dialogCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={s.dialogDelete} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                <Text style={s.dialogDeleteText}>{t('common.delete')}</Text>
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
  emptyCta: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[5],
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: { fontSize: 14, fontWeight: '600', color: colors.primary },

  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.borderLight, gap: spacing[1.5], shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardDefault: { borderColor: colors.primary, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  labelChip: { paddingHorizontal: spacing[2], paddingVertical: spacing[0.5], borderRadius: radii.full },
  labelChipText: { fontSize: 12, fontWeight: '500' },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full, backgroundColor: colors.primary },
  defaultBadgeText: { fontSize: 12, fontWeight: '600', color: colors.white },
  cardActions: { flexDirection: 'row', gap: spacing[3] },
  editText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  deleteText: { fontSize: 12, fontWeight: '600', color: colors.error },
  addrName: { fontSize: 16, fontWeight: '600', color: colors.text },
  addrPhone: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  addrLine: { fontSize: 14, fontWeight: '400', color: colors.textMuted, lineHeight: 20 },
  setDefaultBtn: { marginTop: spacing[1] },
  setDefaultText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },

  addBtn: { marginTop: spacing[2], padding: spacing[3], borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', gap: spacing[1] },
  addIcon: { fontSize: 20, color: colors.primary },
  addText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '85%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing[3], marginBottom: spacing[2] },
  sheetContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[6], gap: spacing[3] },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing[1] },

  field: { gap: spacing[1] },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  input: { height: 48, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing[3], fontSize: 15, color: colors.text },
  inputError: { borderColor: colors.error },
  inputDisabled: { backgroundColor: colors.background, color: colors.textMuted },
  fieldError: { fontSize: 12, color: colors.error },

  areaChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  areaChipActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  areaChipText: { fontSize: 13, fontWeight: '400', color: colors.text },
  areaChipTextActive: { fontWeight: '600', color: colors.primary },

  labelRow: { flexDirection: 'row', gap: spacing[2] },
  labelBtn: { flex: 1, height: 44, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  labelBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  labelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  labelBtnTextActive: { color: colors.primary },

  formActions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  cancelBtn: { flex: 1, height: 44, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  saveBtn: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { backgroundColor: colors.border, opacity: 0.5 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  saveBtnTextDisabled: { color: colors.textMuted },

  dialog: { backgroundColor: colors.surface, borderRadius: radii['2xl'], padding: spacing[5], width: '100%', maxWidth: 360, alignSelf: 'center' },
  dialogTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing[2] },
  dialogMsg: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: spacing[5] },
  dialogActions: { flexDirection: 'row', gap: spacing[3] },
  dialogCancel: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  dialogCancelText: { fontSize: 14, fontWeight: '600', color: colors.text },
  dialogDelete: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  dialogDeleteText: { fontSize: 14, fontWeight: '600', color: colors.white },
})
