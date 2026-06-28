import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Switch,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  Plus,
  X,
  ShieldCheck,
  Pencil,
  Trash2,
  Send,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import {
  SELLER_STAFF_DEFAULTS,
  SELLER_STAFF_ROLES,
  SELLER_PERMISSIONS,
  type StaffMember,
  type StaffRole,
} from '@chinooz/mock-data'

const ROLE_COLOR: Record<StaffRole, { bg: string; text: string }> = {
  owner: { bg: colors.primary50, text: colors.primary },
  manager: { bg: colors.infoLight, text: colors.info },
  staff: { bg: colors.borderLight, text: colors.textMuted },
}

type InviteErrors = { name?: string; phone?: string; email?: string }

export default function StaffSettings() {
  const { t } = useTranslation()
  const router = useRouter()

  const [staff, setStaff] = useState<StaffMember[]>(SELLER_STAFF_DEFAULTS)
  const [showInvite, setShowInvite] = useState(false)
  const [editRoleFor, setEditRoleFor] = useState<StaffMember | null>(null)
  const [removing, setRemoving] = useState<StaffMember | null>(null)
  const [cancellingInvite, setCancellingInvite] = useState<StaffMember | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    analytics.screen({ name: 'seller-settings-staff' })
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const addStaff = (member: StaffMember) => {
    setStaff(prev => [...prev, member])
    showToast(t('seller.settings.staff.inviteSent', { name: member.name }))
    setShowInvite(false)
  }

  const updateRole = (id: string, role: StaffRole) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, role } : s))
    showToast(t('seller.settings.staff.saved'))
    setEditRoleFor(null)
  }

  const removeStaff = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id))
    setRemoving(null)
  }

  const cancelInvite = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id))
    setCancellingInvite(null)
  }

  const resendInvite = (id: string) => {
    showToast(t('seller.settings.staff.inviteSent', { name: staff.find(s => s.id === id)?.name ?? '' }))
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('seller.settings.staff.backToSettings')} hitSlop={8} style={styles.topBarBtn}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{t('seller.settings.staff.editTitle')}</Text>
        <TouchableOpacity onPress={() => setShowInvite(true)} accessibilityRole="button" accessibilityLabel={t('seller.settings.staff.invite')} hitSlop={8} style={styles.topBarBtn}>
          <Plus size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {toast ? <Text style={styles.srOnly} accessibilityLiveRegion="polite">{toast}</Text> : null}

        {/* Staff list */}
        <Section title={t('seller.settings.staff.sectionStaff')}>
          {staff.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{t('seller.settings.staff.noStaff')}</Text>
              <Text style={styles.emptyHint}>{t('seller.settings.staff.noStaffHint')}</Text>
            </View>
          ) : (
            <View style={styles.staffList}>
              {staff.map(member => {
                const rc = ROLE_COLOR[member.role]
                const isOwner = member.role === 'owner'
                return (
                  <View
                    key={member.id}
                    style={styles.staffRow}
                    accessibilityLabel={`${member.name}, ${t(`seller.settings.staff.roles.${member.role}`)}, ${member.status === 'active' ? t('seller.settings.staff.statusActive') : t('seller.settings.staff.statusPending')}`}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.staffBody}>
                      <View style={styles.staffNameRow}>
                        <Text style={styles.staffName} numberOfLines={1}>{member.name}</Text>
                        {isOwner ? (
                          <View style={styles.ownerChip}>
                            <Text style={styles.ownerChipText}>{t('seller.settings.staff.ownerChip')}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.staffStatusRow}>
                        <View style={[styles.statusDot, { backgroundColor: member.status === 'pending' ? colors.warning : colors.success }]} />
                        <Text style={[styles.statusText, { color: member.status === 'pending' ? colors.warning : colors.success }]}>
                          {member.status === 'pending' ? t('seller.settings.staff.statusPending') : t('seller.settings.staff.statusActive')}
                        </Text>
                      </View>
                      <View style={[styles.rolePill, { backgroundColor: rc.bg }]}>
                        <Text style={[styles.rolePillText, { color: rc.text }]}>{t(`seller.settings.staff.roles.${member.role}`)}</Text>
                      </View>
                    </View>
                    <View style={styles.staffActions}>
                      {member.status === 'pending' ? (
                        <>
                          <TouchableOpacity onPress={() => resendInvite(member.id)} accessibilityRole="button" accessibilityLabel={`${t('seller.settings.staff.resendInvite')} — ${member.name}`} hitSlop={8} style={styles.iconBtn}>
                            <Send size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setCancellingInvite(member)} accessibilityRole="button" accessibilityLabel={`${t('seller.settings.staff.cancelInvite')} — ${member.name}`} hitSlop={8} style={styles.iconBtn}>
                            <X size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity onPress={() => setEditRoleFor(member)} disabled={isOwner} accessibilityRole="button" accessibilityLabel={`${t('seller.settings.staff.editRole')} — ${member.name}`} hitSlop={8} style={[styles.iconBtn, isOwner && styles.iconBtnDisabled]}>
                            <Pencil size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setRemoving(member)} disabled={isOwner} accessibilityRole="button" accessibilityLabel={`${t('seller.settings.staff.removeStaff')} — ${member.name}`} hitSlop={8} style={[styles.iconBtn, isOwner && styles.iconBtnDisabled]}>
                            <Trash2 size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
          <View style={styles.ownerNote}>
            <Text style={styles.ownerNoteText}>{t('seller.settings.staff.ownerProtected')}</Text>
          </View>
        </Section>

        {/* Gating */}
        <Section title={t('seller.settings.staff.sectionGating')}>
          <Text style={styles.gatingHint}>{t('seller.settings.staff.gatingHint')}</Text>
          <View style={styles.gatingList}>
            <View style={styles.gatingRow}>
              <ShieldCheck size={16} color={colors.primary} />
              <Text style={styles.gatingRowText}>{t('seller.settings.staff.gatingFinance')}</Text>
            </View>
            <View style={styles.gatingRow}>
              <ShieldCheck size={16} color={colors.primary} />
              <Text style={styles.gatingRowText}>{t('seller.settings.staff.gatingSettings')}</Text>
            </View>
            <View style={styles.gatingRow}>
              <ShieldCheck size={16} color={colors.primary} />
              <Text style={styles.gatingRowText}>{t('seller.settings.staff.gatingStaff')}</Text>
            </View>
          </View>
        </Section>

        {/* Permissions summary */}
        <Section title={t('seller.settings.staff.permissionsSummary')}>
          <View style={styles.permList}>
            {SELLER_PERMISSIONS.map(perm => (
              <View key={perm.key} style={styles.permRow}>
                <Text style={styles.permLabel}>{t(perm.labelKey)}</Text>
                <View style={styles.permChecks}>
                  <Text style={[styles.permCheck, perm.owner ? styles.permYes : styles.permNo]}>{perm.owner ? '✓' : '—'}</Text>
                  <Text style={[styles.permCheck, perm.manager ? styles.permYes : styles.permNo]}>{perm.manager ? '✓' : '—'}</Text>
                  <Text style={[styles.permCheck, perm.staff ? styles.permYes : styles.permNo]}>{perm.staff ? '✓' : '—'}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.permHeader}>
            <Text style={styles.permHeaderLabel} />
            <Text style={styles.permHeaderCol}>{t('seller.settings.staff.colOwner')}</Text>
            <Text style={styles.permHeaderCol}>{t('seller.settings.staff.colManager')}</Text>
            <Text style={styles.permHeaderCol}>{t('seller.settings.staff.colStaff')}</Text>
          </View>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Invite modal */}
      {showInvite && (
        <InviteModalMobile t={t} onInvite={addStaff} onCancel={() => setShowInvite(false)} />
      )}

      {/* Edit role modal */}
      {editRoleFor && (
        <EditRoleModalMobile member={editRoleFor} t={t} onApply={(role) => updateRole(editRoleFor.id, role)} onCancel={() => setEditRoleFor(null)} />
      )}

      {/* Remove confirm */}
      <Modal visible={!!removing} transparent animationType="fade" onRequestClose={() => setRemoving(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRemoving(null)} />
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{t('seller.settings.staff.removeConfirmTitle')}</Text>
          <Text style={styles.dialogBody}>{t('seller.settings.staff.removeConfirmBody', { name: removing?.name })}</Text>
          <View style={styles.confirmBtnRow}>
            <TouchableOpacity onPress={() => setRemoving(null)} accessibilityRole="button" style={styles.confirmCancelBtn}>
              <Text style={styles.confirmCancelText}>{t('seller.settings.staff.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removing && removeStaff(removing.id)} accessibilityRole="button" style={styles.confirmDangerBtn}>
              <Text style={styles.confirmDangerText}>{t('seller.settings.staff.removeConfirmBtn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cancel invite confirm */}
      <Modal visible={!!cancellingInvite} transparent animationType="fade" onRequestClose={() => setCancellingInvite(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCancellingInvite(null)} />
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{t('seller.settings.staff.cancelInviteConfirmTitle')}</Text>
          <Text style={styles.dialogBody}>{t('seller.settings.staff.cancelInviteConfirmBody', { name: cancellingInvite?.name })}</Text>
          <View style={styles.confirmBtnRow}>
            <TouchableOpacity onPress={() => setCancellingInvite(null)} accessibilityRole="button" style={styles.confirmCancelBtn}>
              <Text style={styles.confirmCancelText}>{t('seller.settings.staff.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => cancellingInvite && cancelInvite(cancellingInvite.id)} accessibilityRole="button" style={styles.confirmDangerBtn}>
              <Text style={styles.confirmDangerText}>{t('seller.settings.staff.cancelInviteConfirmBtn')}</Text>
            </TouchableOpacity>
          </View>
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

function InviteModalMobile({ t, onInvite, onCancel }: { t: (k: string, o?: Record<string, unknown>) => string; onInvite: (m: StaffMember) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('staff')
  const [errors, setErrors] = useState<InviteErrors>({})
  const [sending, setSending] = useState(false)

  const validate = (): InviteErrors => {
    const e: InviteErrors = {}
    if (name.trim().length < 2) e.name = t('seller.settings.staff.fieldNameError')
    if (phone && !/^\d{10}$/.test(phone)) e.phone = t('seller.settings.staff.fieldPhoneError')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t('seller.settings.staff.fieldEmailError')
    if (!phone && !email) e.email = t('seller.settings.staff.fieldEmailError')
    return e
  }

  const handleSubmit = () => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSending(true)
    setTimeout(() => {
      onInvite({
        id: `staff-${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        status: 'pending',
        invitedAt: new Date().toISOString().slice(0, 10),
      })
      setSending(false)
    }, 500)
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel} />
      <View style={styles.inviteDialogCard}>
        <View style={styles.inviteHeader}>
          <Text style={styles.dialogTitle}>{t('seller.settings.staff.inviteTitle')}</Text>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button" accessibilityLabel={t('seller.settings.staff.cancel')} hitSlop={8}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.inviteHint}>{t('seller.settings.staff.inviteHint')}</Text>
        <ScrollView contentContainerStyle={styles.inviteBody} showsVerticalScrollIndicator={false}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('seller.settings.staff.fieldName')}</Text>
            <TextInput value={name} onChangeText={setName} accessibilityLabel={t('seller.settings.staff.fieldName')} style={[styles.input, errors.name && styles.inputError]} placeholder={t('seller.settings.staff.fieldNamePlaceholder')} />
            {errors.name ? <Text style={styles.fieldError} accessibilityRole="alert">{errors.name}</Text> : null}
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('seller.settings.staff.fieldPhone')}</Text>
              <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" accessibilityLabel={t('seller.settings.staff.fieldPhone')} style={[styles.input, errors.phone && styles.inputError]} placeholder={t('seller.settings.staff.fieldPhonePlaceholder')} />
              {errors.phone ? <Text style={styles.fieldError} accessibilityRole="alert">{errors.phone}</Text> : null}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('seller.settings.staff.fieldEmail')}</Text>
              <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" accessibilityLabel={t('seller.settings.staff.fieldEmail')} style={[styles.input, errors.email && styles.inputError]} placeholder={t('seller.settings.staff.fieldEmailPlaceholder')} />
              {errors.email ? <Text style={styles.fieldError} accessibilityRole="alert">{errors.email}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={styles.fieldLabel}>{t('seller.settings.staff.fieldRole')}</Text>
            <View style={styles.rolePickerList}>
              {SELLER_STAFF_ROLES.filter(r => r.id !== 'owner').map(r => {
                const active = role === r.id
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => setRole(r.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(r.labelKey)}
                    style={[styles.rolePickerBtn, active && styles.rolePickerBtnActive]}
                  >
                    <View style={[styles.radioDot, active && styles.radioDotActive]}>
                      {active ? <View style={styles.radioDotFill} /> : null}
                    </View>
                    <View>
                      <Text style={[styles.rolePickerTitle, active && styles.rolePickerTitleActive]}>{t(r.labelKey)}</Text>
                      <Text style={styles.rolePickerDesc}>{t(r.descKey)}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
            <Text style={styles.fieldHint}>{t('seller.settings.staff.fieldRoleHint')}</Text>
          </View>
        </ScrollView>
        <View style={styles.confirmBtnRow}>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button" style={styles.confirmCancelBtn}>
            <Text style={styles.confirmCancelText}>{t('seller.settings.staff.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSubmit} disabled={sending} accessibilityRole="button" style={[styles.confirmSaveBtn, sending && styles.btnDisabled]}>
            <Text style={styles.confirmSaveText}>{sending ? t('seller.settings.staff.sending') : t('seller.settings.staff.sendInvite')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function EditRoleModalMobile({ member, t, onApply, onCancel }: { member: StaffMember; t: (k: string, o?: Record<string, unknown>) => string; onApply: (role: StaffRole) => void; onCancel: () => void }) {
  const [role, setRole] = useState<StaffRole>(member.role === 'owner' ? 'manager' : member.role)

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel} />
      <View style={styles.inviteDialogCard}>
        <View style={styles.inviteHeader}>
          <Text style={styles.dialogTitle}>{t('seller.settings.staff.editRole')} — {member.name}</Text>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button" accessibilityLabel={t('seller.settings.staff.cancel')} hitSlop={8}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.rolePickerList}>
          {SELLER_STAFF_ROLES.filter(r => r.id !== 'owner').map(r => {
            const active = role === r.id
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => setRole(r.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t(r.labelKey)}
                style={[styles.rolePickerBtn, active && styles.rolePickerBtnActive]}
              >
                <View style={[styles.radioDot, active && styles.radioDotActive]}>
                  {active ? <View style={styles.radioDotFill} /> : null}
                </View>
                <View>
                  <Text style={[styles.rolePickerTitle, active && styles.rolePickerTitleActive]}>{t(r.labelKey)}</Text>
                  <Text style={styles.rolePickerDesc}>{t(r.descKey)}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
        <View style={styles.confirmBtnRow}>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button" style={styles.confirmCancelBtn}>
            <Text style={styles.confirmCancelText}>{t('seller.settings.staff.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onApply(role)} accessibilityRole="button" style={styles.confirmSaveBtn}>
            <Text style={styles.confirmSaveText}>{t('seller.settings.staff.save')}</Text>
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
  scroll: { padding: spacing[4], gap: spacing[3] },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4] },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing[3] },
  sectionBody: { gap: spacing[2] },
  emptyBox: { paddingVertical: spacing[4], alignItems: 'center', gap: spacing[1] },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  emptyHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  staffList: { gap: 0 },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3] },
  avatar: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  staffBody: { flex: 1, gap: 3 },
  staffNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  staffName: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  ownerChip: { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing[1.5], paddingVertical: 2 },
  ownerChipText: { fontSize: 10, fontWeight: '700', color: colors.white },
  staffStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  statusDot: { width: 6, height: 6, borderRadius: radii.full },
  statusText: { fontSize: 12, fontWeight: '500' },
  rolePill: { alignSelf: 'flex-start', borderRadius: radii.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  rolePillText: { fontSize: 11, fontWeight: '600' },
  staffActions: { flexDirection: 'row', gap: spacing[1] },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  iconBtnDisabled: { opacity: 0.3 },
  ownerNote: { backgroundColor: colors.background, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], marginTop: spacing[2] },
  ownerNoteText: { fontSize: 12, color: colors.textMuted },
  gatingHint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing[3], lineHeight: 18 },
  gatingList: { gap: spacing[2] },
  gatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.background, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  gatingRowText: { fontSize: 13, fontWeight: '500', color: colors.text, flex: 1 },
  permList: { gap: 0 },
  permHeader: { flexDirection: 'row', paddingVertical: spacing[1.5], borderBottomWidth: 1, borderBottomColor: colors.borderLight, marginTop: spacing[1] },
  permHeaderLabel: { flex: 1 },
  permHeaderCol: { width: 60, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
  permRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2.5], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  permLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.text },
  permChecks: { flexDirection: 'row' },
  permCheck: { width: 60, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  permYes: { color: colors.success },
  permNo: { color: colors.textTertiary },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: colors.overlay },
  dialogCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], padding: spacing[5], gap: spacing[3] },
  inviteDialogCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '90%' },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[2] },
  inviteHint: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: spacing[5], paddingBottom: spacing[2] },
  inviteBody: { paddingHorizontal: spacing[5], paddingBottom: spacing[3], gap: spacing[3] },
  field: { flex: 1 },
  fieldRow: { flexDirection: 'row', gap: spacing[2] },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing[1] },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing[1] },
  fieldError: { fontSize: 12, color: colors.error, marginTop: spacing[1] },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], fontSize: 14, color: colors.text },
  inputError: { borderColor: colors.error },
  rolePickerList: { gap: spacing[2] },
  rolePickerBtn: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3] },
  rolePickerBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  radioDot: { width: 18, height: 18, borderRadius: radii.full, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioDotActive: { borderColor: colors.primary },
  radioDotFill: { width: 8, height: 8, borderRadius: radii.full, backgroundColor: colors.primary },
  rolePickerTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  rolePickerTitleActive: { color: colors.primary },
  rolePickerDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  dialogTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  dialogBody: { fontSize: 14, color: colors.textSecondary },
  confirmBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2], paddingHorizontal: spacing[5], paddingBottom: spacing[5] },
  confirmCancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  confirmCancelText: { fontSize: 13, fontWeight: '600', color: colors.text },
  confirmSaveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2.5] },
  confirmSaveText: { fontSize: 13, fontWeight: '700', color: colors.white },
  confirmDangerBtn: { backgroundColor: colors.error, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2.5] },
  confirmDangerText: { fontSize: 13, fontWeight: '700', color: colors.white },
  btnDisabled: { opacity: 0.4 },
})
