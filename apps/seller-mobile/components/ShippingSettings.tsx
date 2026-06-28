import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Switch,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { ChevronLeft, Plus, Pencil, Trash2 } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import {
  SELLER_SHIPPING_DEFAULTS,
  SELLER_CARRIERS,
  type ShippingZone,
  type ShippingRule,
  type ShippingSettings,
} from '@chinooz/mock-data'

type Errors = {
  freeThreshold?: string
  handlingDays?: string
  returnWindow?: string
}

function cloneDefaults(): ShippingSettings {
  return JSON.parse(JSON.stringify(SELLER_SHIPPING_DEFAULTS))
}

export default function ShippingSettings() {
  const { t } = useTranslation()
  const router = useRouter()

  const [settings, setSettings] = useState<ShippingSettings>(cloneDefaults)
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null)
  const [removingZone, setRemovingZone] = useState<ShippingZone | null>(null)
  const [dirtyDialog, setDirtyDialog] = useState(false)
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null)

  const initialRef = useRef<ShippingSettings>(settings)

  useEffect(() => {
    analytics.screen({ name: 'seller-settings-shipping' })
  }, [])

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialRef.current), [settings])

  const validate = useCallback((): Errors => {
    const errs: Errors = {}
    if (settings.freeShippingThresholdNpr < 0) errs.freeThreshold = t('seller.settings.shipping.freeThresholdError')
    if (settings.handlingDays < 0) errs.handlingDays = t('seller.settings.shipping.handlingDaysError')
    if (settings.returnWindowDays < 0) errs.returnWindow = t('seller.settings.shipping.returnWindowError')
    return errs
  }, [settings, t])

  const handleSave = useCallback(() => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    setTimeout(() => {
      initialRef.current = settings
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 600)
  }, [settings, validate])

  const guardedNav = useCallback((fn: () => void) => {
    if (dirty) { setPendingNav(() => fn); setDirtyDialog(true) }
    else fn()
  }, [dirty])

  const updateZone = (id: string, patch: Partial<ShippingZone>) => {
    setSettings(prev => ({ ...prev, zones: prev.zones.map(z => z.id === id ? { ...z, ...patch } : z) }))
    setSaved(false)
  }

  const addZone = () => {
    const id = `zone-${Date.now()}`
    const newZone: ShippingZone = { id, name: '', areas: '', feeNpr: 0, estimatedDays: 1, codAvailable: false, carriers: [] }
    setSettings(prev => ({ ...prev, zones: [...prev.zones, newZone] }))
    setEditingZone(newZone)
    setSaved(false)
  }

  const removeZone = (id: string) => {
    setSettings(prev => ({ ...prev, zones: prev.zones.filter(z => z.id !== id) }))
    setRemovingZone(null)
    setSaved(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => guardedNav(() => router.back())} accessibilityRole="button" accessibilityLabel={t('seller.settings.shipping.backToSettings')} hitSlop={8} style={styles.topBarBtn}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{t('seller.settings.shipping.editTitle')}</Text>
        <View style={styles.topBarDirty}>
          {dirty ? (
            <View style={styles.dirtyDotRow}>
              <View style={styles.dirtyDot} />
              <Text style={styles.dirtyText}>{t('seller.settings.shipping.dirtyIndicator')}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Zones */}
        <Section title={t('seller.settings.shipping.sectionZones')} action={
          <TouchableOpacity onPress={addZone} accessibilityRole="button" accessibilityLabel={t('seller.settings.shipping.addZone')} style={styles.addBtn}>
            <Plus size={14} color={colors.white} />
            <Text style={styles.addBtnText}>{t('seller.settings.shipping.addZone')}</Text>
          </TouchableOpacity>
        }>
          {settings.zones.length === 0 ? (
            <Text style={styles.emptyText}>{t('seller.settings.shipping.noZones')}</Text>
          ) : (
            <View style={styles.zoneList}>
              {settings.zones.map(zone => (
                <View key={zone.id} style={styles.zoneCard} accessibilityLabel={t('seller.settings.shipping.zoneAria', { name: zone.name, fee: zone.feeNpr, days: zone.estimatedDays, cod: zone.codAvailable ? t('common.yes') : t('common.no') })}>
                  <View style={styles.zoneCardTop}>
                    <View style={styles.zoneCardInfo}>
                      <Text style={styles.zoneName}>{zone.name || '—'}</Text>
                      <Text style={styles.zoneAreas} numberOfLines={2}>{zone.areas}</Text>
                    </View>
                    <View style={styles.zoneCardActions}>
                      <TouchableOpacity onPress={() => setEditingZone(zone)} accessibilityRole="button" accessibilityLabel={`${t('seller.settings.shipping.editZone')} — ${zone.name}`} hitSlop={8} style={styles.iconBtn}>
                        <Pencil size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setRemovingZone(zone)} accessibilityRole="button" accessibilityLabel={`${t('seller.settings.shipping.zoneRemove')} — ${zone.name}`} hitSlop={8} style={styles.iconBtn}>
                        <Trash2 size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.zoneCardRow}>
                    <View style={styles.zoneField}>
                      <Text style={styles.zoneFieldLabel}>{t('seller.settings.shipping.colFee')}</Text>
                      <TextInput
                        value={String(zone.feeNpr)}
                        onChangeText={(v) => updateZone(zone.id, { feeNpr: parseInt(v) || 0 })}
                        keyboardType="number-pad"
                        accessibilityLabel={`${t('seller.settings.shipping.zoneFee')} — ${zone.name}`}
                        style={styles.zoneInput}
                      />
                    </View>
                    <View style={styles.zoneField}>
                      <Text style={styles.zoneFieldLabel}>{t('seller.settings.shipping.colDays')}</Text>
                      <TextInput
                        value={String(zone.estimatedDays)}
                        onChangeText={(v) => updateZone(zone.id, { estimatedDays: parseInt(v) || 0 })}
                        keyboardType="number-pad"
                        accessibilityLabel={`${t('seller.settings.shipping.zoneDays')} — ${zone.name}`}
                        style={styles.zoneInput}
                      />
                    </View>
                    <View style={styles.zoneCodCol}>
                      <Text style={styles.zoneFieldLabel}>{t('seller.settings.shipping.colCod')}</Text>
                      <Switch
                        value={zone.codAvailable}
                        onValueChange={(v) => updateZone(zone.id, { codAvailable: v })}
                        accessibilityLabel={`${t('seller.settings.shipping.zoneCod')} — ${zone.name}`}
                        trackColor={{ false: colors.border, true: colors.success }}
                      />
                    </View>
                  </View>
                  {zone.carriers.length > 0 && (
                    <View style={styles.zoneCarriers}>
                      {zone.carriers.map(cid => {
                        const carrier = SELLER_CARRIERS.find(c => c.id === cid)
                        return carrier ? (
                          <View key={cid} style={styles.carrierChip}>
                            <Text style={styles.carrierChipText}>{t(carrier.labelKey)}</Text>
                          </View>
                        ) : null
                      })}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* Rules */}
        <Section title={t('seller.settings.shipping.sectionRules')}>
          <View>
            <Text style={styles.fieldLabel}>{t('seller.settings.shipping.ruleLabel')}</Text>
            <View style={styles.ruleRow}>
              {(['flat', 'weight'] as ShippingRule[]).map(rule => {
                const active = settings.rule === rule
                return (
                  <TouchableOpacity
                    key={rule}
                    onPress={() => { setSettings(prev => ({ ...prev, rule })); setSaved(false) }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={rule === 'flat' ? t('seller.settings.shipping.ruleFlat') : t('seller.settings.shipping.ruleWeight')}
                    style={[styles.ruleBtn, active && styles.ruleBtnActive]}
                  >
                    <Text style={[styles.ruleBtnTitle, active && styles.ruleBtnTitleActive]}>
                      {rule === 'flat' ? t('seller.settings.shipping.ruleFlat') : t('seller.settings.shipping.ruleWeight')}
                    </Text>
                    <Text style={styles.ruleBtnHint}>
                      {rule === 'flat' ? t('seller.settings.shipping.ruleFlatHint') : t('seller.settings.shipping.ruleWeightHint')}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <Field label={t('seller.settings.shipping.freeThreshold')} hint={t('seller.settings.shipping.freeThresholdHint')} error={errors.freeThreshold}>
            <TextInput value={String(settings.freeShippingThresholdNpr)} onChangeText={(v) => { setSettings(prev => ({ ...prev, freeShippingThresholdNpr: parseInt(v) || 0 })); setSaved(false) }} keyboardType="number-pad" accessibilityLabel={t('seller.settings.shipping.freeThreshold')} style={[styles.input, errors.freeThreshold && styles.inputError]} />
          </Field>
          <Field label={t('seller.settings.shipping.handlingDays')} hint={t('seller.settings.shipping.handlingDaysHint')} error={errors.handlingDays}>
            <TextInput value={String(settings.handlingDays)} onChangeText={(v) => { setSettings(prev => ({ ...prev, handlingDays: parseInt(v) || 0 })); setSaved(false) }} keyboardType="number-pad" accessibilityLabel={t('seller.settings.shipping.handlingDays')} style={[styles.input, errors.handlingDays && styles.inputError]} />
          </Field>
          <Field label={t('seller.settings.shipping.returnWindow')} hint={t('seller.settings.shipping.returnWindowHint')} error={errors.returnWindow}>
            <TextInput value={String(settings.returnWindowDays)} onChangeText={(v) => { setSettings(prev => ({ ...prev, returnWindowDays: parseInt(v) || 0 })); setSaved(false) }} keyboardType="number-pad" accessibilityLabel={t('seller.settings.shipping.returnWindow')} style={[styles.input, errors.returnWindow && styles.inputError]} />
          </Field>
        </Section>

        {/* Returns */}
        <Section title={t('seller.settings.shipping.sectionReturns')}>
          <Field label={t('seller.settings.shipping.returnPolicy')} hint={t('seller.settings.shipping.returnPolicyHint')}>
            <TextInput
              value={settings.returnPolicyText}
              onChangeText={(v) => { setSettings(prev => ({ ...prev, returnPolicyText: v })); setSaved(false) }}
              multiline
              accessibilityLabel={t('seller.settings.shipping.returnPolicy')}
              style={styles.textarea}
              placeholder={t('seller.settings.shipping.returnPolicyPlaceholder')}
            />
          </Field>
        </Section>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Save bar */}
      <View style={styles.saveBar}>
        <View style={styles.saveBarLeft}>
          {saved ? (
            <View style={styles.savedRow}><View style={styles.savedDot} /><Text style={styles.savedText}>{t('seller.settings.shipping.saved')}</Text></View>
          ) : dirty ? (
            <View style={styles.savedRow}><View style={styles.dirtyDot} /><Text style={styles.dirtyText}>{t('seller.settings.shipping.dirtyIndicator')}</Text></View>
          ) : (
            <Text style={styles.saveBarIdle}>{t('seller.settings.shipping.editSubtitle')}</Text>
          )}
        </View>
        <View style={styles.saveBarRight}>
          <TouchableOpacity onPress={() => { setSettings(initialRef.current); setErrors({}); setSaved(false) }} disabled={!dirty || saving} accessibilityRole="button" accessibilityLabel={t('seller.settings.shipping.discard')} style={[styles.discardBtn, (!dirty || saving) && styles.btnDisabled]}>
            <Text style={styles.discardText}>{t('seller.settings.shipping.discard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={!dirty || saving} accessibilityRole="button" accessibilityLabel={t('seller.settings.shipping.save')} style={[styles.saveBtn, (!dirty || saving) && styles.btnDisabled]}>
            <Text style={styles.saveBtnText}>{saving ? t('seller.settings.shipping.saving') : t('seller.settings.shipping.save')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Zone dialog */}
      {editingZone && (
        <ZoneDialogMobile zone={editingZone} t={t} onApply={(updated) => { updateZone(updated.id, updated); setEditingZone(null) }} onCancel={() => setEditingZone(null)} />
      )}

      {/* Remove confirm */}
      <Modal visible={!!removingZone} transparent animationType="fade" onRequestClose={() => setRemovingZone(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRemovingZone(null)} />
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{t('seller.settings.shipping.zoneRemoveConfirm')}</Text>
          <Text style={styles.dialogBody}>{t('seller.settings.shipping.zoneRemoveConfirmBody')}</Text>
          <View style={styles.confirmBtnRow}>
            <TouchableOpacity onPress={() => setRemovingZone(null)} accessibilityRole="button" style={styles.confirmCancelBtn}>
              <Text style={styles.confirmCancelText}>{t('seller.settings.shipping.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removingZone && removeZone(removingZone.id)} accessibilityRole="button" style={styles.confirmDangerBtn}>
              <Text style={styles.confirmDangerText}>{t('seller.settings.shipping.zoneRemove')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError} accessibilityRole="alert">{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  )
}

function ZoneDialogMobile({ zone, t, onApply, onCancel }: { zone: ShippingZone; t: (k: string, o?: Record<string, unknown>) => string; onApply: (z: ShippingZone) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<ShippingZone>(zone)
  const update = <K extends keyof ShippingZone>(key: K, value: ShippingZone[K]) => setDraft(prev => ({ ...prev, [key]: value }))
  const toggleCarrier = (cid: string) => {
    setDraft(prev => ({ ...prev, carriers: prev.carriers.includes(cid) ? prev.carriers.filter(c => c !== cid) : [...prev.carriers, cid] }))
  }

  return (
    <Modal visible={!!zone} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel} />
      <View style={styles.zoneDialogCard}>
        <View style={styles.zoneDialogHeader}>
          <Text style={styles.dialogTitle}>{t('seller.settings.shipping.zoneDialogTitle')}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.zoneDialogBody} showsVerticalScrollIndicator={false}>
          <Field label={t('seller.settings.shipping.zoneName')}>
            <TextInput value={draft.name} onChangeText={(v) => update('name', v)} accessibilityLabel={t('seller.settings.shipping.zoneName')} style={styles.input} placeholder={t('seller.settings.shipping.zoneNamePlaceholder')} />
          </Field>
          <Field label={t('seller.settings.shipping.zoneAreas')}>
            <TextInput value={draft.areas} onChangeText={(v) => update('areas', v)} accessibilityLabel={t('seller.settings.shipping.zoneAreas')} style={styles.input} placeholder={t('seller.settings.shipping.zoneAreasPlaceholder')} />
          </Field>
          <View style={styles.row2}>
            <Field label={t('seller.settings.shipping.zoneFee')} hint={t('seller.settings.shipping.zoneFeeHint')}>
              <TextInput value={String(draft.feeNpr)} onChangeText={(v) => update('feeNpr', parseInt(v) || 0)} keyboardType="number-pad" accessibilityLabel={t('seller.settings.shipping.zoneFee')} style={styles.input} />
            </Field>
            <Field label={t('seller.settings.shipping.zoneDays')} hint={t('seller.settings.shipping.zoneDaysHint')}>
              <TextInput value={String(draft.estimatedDays)} onChangeText={(v) => update('estimatedDays', parseInt(v) || 0)} keyboardType="number-pad" accessibilityLabel={t('seller.settings.shipping.zoneDays')} style={styles.input} />
            </Field>
          </View>
          <View style={styles.codRow}>
            <View>
              <Text style={styles.fieldLabel}>{t('seller.settings.shipping.zoneCod')}</Text>
              <Text style={styles.fieldHint}>{t('seller.settings.shipping.zoneCodHint')}</Text>
            </View>
            <Switch value={draft.codAvailable} onValueChange={(v) => update('codAvailable', v)} accessibilityLabel={t('seller.settings.shipping.zoneCod')} trackColor={{ false: colors.border, true: colors.success }} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>{t('seller.settings.shipping.zoneCarriers')}</Text>
            <View style={styles.carrierToggleRow}>
              {SELLER_CARRIERS.map(c => {
                const active = draft.carriers.includes(c.id)
                return (
                  <TouchableOpacity key={c.id} onPress={() => toggleCarrier(c.id)} accessibilityRole="button" accessibilityLabel={t(c.labelKey)} style={[styles.carrierToggle, active && styles.carrierToggleActive]}>
                    <Text style={[styles.carrierToggleText, active && styles.carrierToggleTextActive]}>{t(c.labelKey)}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </ScrollView>
        <View style={styles.confirmBtnRow}>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button" style={styles.confirmCancelBtn}>
            <Text style={styles.confirmCancelText}>{t('seller.settings.shipping.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onApply(draft)} accessibilityRole="button" style={styles.confirmSaveBtn}>
            <Text style={styles.confirmSaveText}>{t('seller.settings.shipping.apply')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionBody: { gap: spacing[4] },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[2.5], paddingVertical: spacing[1.5] },
  addBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing[4] },
  zoneList: { gap: spacing[3] },
  zoneCard: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.lg, padding: spacing[3], gap: spacing[2.5] },
  zoneCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  zoneCardInfo: { flex: 1, gap: 2 },
  zoneName: { fontSize: 15, fontWeight: '600', color: colors.text },
  zoneAreas: { fontSize: 12, color: colors.textMuted },
  zoneCardActions: { flexDirection: 'row', gap: spacing[1] },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  zoneCardRow: { flexDirection: 'row', gap: spacing[2] },
  zoneField: { flex: 1 },
  zoneCodCol: { alignItems: 'flex-start' },
  zoneFieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: spacing[1] },
  zoneInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[2.5], paddingVertical: spacing[2], fontSize: 14, color: colors.text },
  zoneCarriers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  carrierChip: { backgroundColor: colors.primary50, borderRadius: radii.full, paddingHorizontal: spacing[2], paddingVertical: spacing[0.5] },
  carrierChipText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing[1] },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing[1] },
  fieldError: { fontSize: 12, color: colors.error, marginTop: spacing[1] },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], fontSize: 14, color: colors.text },
  inputError: { borderColor: colors.error },
  textarea: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], fontSize: 14, color: colors.text, minHeight: 100 },
  ruleRow: { flexDirection: 'row', gap: spacing[2] },
  ruleBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingVertical: spacing[3], paddingHorizontal: spacing[3] },
  ruleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  ruleBtnTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  ruleBtnTitleActive: { color: colors.primary },
  ruleBtnHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  row2: { flexDirection: 'row', gap: spacing[2] },
  codRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  carrierToggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] },
  carrierToggle: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.full, paddingHorizontal: spacing[2.5], paddingVertical: spacing[1.5] },
  carrierToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  carrierToggleText: { fontSize: 12, fontWeight: '600', color: colors.text },
  carrierToggleTextActive: { color: colors.white },
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
  zoneDialogCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '90%' },
  zoneDialogHeader: { paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[2] },
  zoneDialogBody: { paddingHorizontal: spacing[5], paddingBottom: spacing[3], gap: spacing[3] },
  dialogTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  dialogBody: { fontSize: 14, color: colors.textSecondary },
  dialogSaveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  dialogSaveText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  dialogDiscardBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  dialogDiscardText: { color: colors.error, fontWeight: '600', fontSize: 14 },
  dialogStayBtn: { paddingVertical: spacing[2], alignItems: 'center' },
  dialogStayText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  confirmBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2], paddingHorizontal: spacing[5], paddingBottom: spacing[5] },
  confirmCancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  confirmCancelText: { fontSize: 13, fontWeight: '600', color: colors.text },
  confirmSaveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2.5] },
  confirmSaveText: { fontSize: 13, fontWeight: '700', color: colors.white },
  confirmDangerBtn: { backgroundColor: colors.error, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2.5] },
  confirmDangerText: { fontSize: 13, fontWeight: '700', color: colors.white },
})
