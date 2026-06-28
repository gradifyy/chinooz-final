'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Check, X, ShieldCheck, Pencil, Trash2, Send } from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { analytics } from '@chinooz/analytics'
import {
  SELLER_STAFF_DEFAULTS,
  SELLER_STAFF_ROLES,
  SELLER_PERMISSIONS,
  type StaffMember,
  type StaffRole,
} from '@chinooz/mock-data'

type InviteErrors = { name?: string; phone?: string; email?: string }

const ROLE_STYLE: Record<StaffRole, { bg: string; text: string }> = {
  owner: { bg: 'bg-primary-50', text: 'text-primary' },
  manager: { bg: 'bg-info-light', text: 'text-info' },
  staff: { bg: 'bg-border-light', text: 'text-text-muted' },
}

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
    <Screen>
      <Container>
        <div className="py-6 md:py-8">
          <div className="xl:mx-auto xl:max-w-4xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link href="/settings" onClick={(e) => { e.preventDefault(); router.push('/settings') }} className="inline-flex min-touch items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-text-muted hover:bg-background hover:text-text transition-colors">
                <ChevronLeft size={18} aria-hidden="true" />
                <span>{t('seller.settings.staff.backToSettings')}</span>
              </Link>
              <h1 className="text-lg font-semibold text-text md:text-xl">{t('seller.settings.staff.editTitle')}</h1>
              <button type="button" onClick={() => setShowInvite(true)} className="inline-flex min-touch items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
                <Plus size={16} aria-hidden="true" />
                {t('seller.settings.staff.invite')}
              </button>
            </div>

            <div className="sr-only" aria-live="polite" role="status">{toast}</div>

            <div className="space-y-6">
              {/* Staff list */}
              <Section title={t('seller.settings.staff.sectionStaff')}>
                {staff.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-sm font-semibold text-text">{t('seller.settings.staff.noStaff')}</p>
                    <p className="mt-1 text-xs text-text-muted">{t('seller.settings.staff.noStaffHint')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-light">
                    {staff.map(member => {
                      const rs = ROLE_STYLE[member.role]
                      const isOwner = member.role === 'owner'
                      return (
                        <div key={member.id} className="flex items-center gap-3 py-3" aria-label={`${member.name}, ${t(`seller.settings.staff.roles.${member.role}`)}, ${member.status === 'active' ? t('seller.settings.staff.statusActive') : t('seller.settings.staff.statusPending')}`}>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary" aria-hidden="true">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-text">{member.name}</span>
                              {isOwner && <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">{t('seller.settings.staff.ownerChip')}</span>}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              {member.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-warning"><span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />{t('seller.settings.staff.statusPending')}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />{t('seller.settings.staff.statusActive')}</span>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${rs.bg} ${rs.text}`}>
                            {t(`seller.settings.staff.roles.${member.role}`)}
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            {member.status === 'pending' ? (
                              <>
                                <button type="button" onClick={() => resendInvite(member.id)} aria-label={`${t('seller.settings.staff.resendInvite')} — ${member.name}`} className="rounded-md p-1.5 text-text-muted hover:bg-background hover:text-primary transition-colors"><Send size={14} /></button>
                                <button type="button" onClick={() => setCancellingInvite(member)} aria-label={`${t('seller.settings.staff.cancelInvite')} — ${member.name}`} className="rounded-md p-1.5 text-text-muted hover:bg-error-light hover:text-error transition-colors"><X size={14} /></button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => setEditRoleFor(member)} disabled={isOwner} aria-label={`${t('seller.settings.staff.editRole')} — ${member.name}`} className="rounded-md p-1.5 text-text-muted hover:bg-background hover:text-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><Pencil size={14} /></button>
                                <button type="button" onClick={() => setRemoving(member)} disabled={isOwner} aria-label={`${t('seller.settings.staff.removeStaff')} — ${member.name}`} className="rounded-md p-1.5 text-text-muted hover:bg-error-light hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 size={14} /></button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <p className="mt-3 rounded-md bg-background px-3 py-2 text-xs text-text-muted" role="note">{t('seller.settings.staff.ownerProtected')}</p>
              </Section>

              {/* Gating */}
              <Section title={t('seller.settings.staff.sectionGating')}>
                <p className="mb-3 text-sm text-text-muted">{t('seller.settings.staff.gatingHint')}</p>
                <div className="space-y-2">
                  <GatingRow label={t('seller.settings.staff.gatingFinance')} />
                  <GatingRow label={t('seller.settings.staff.gatingSettings')} />
                  <GatingRow label={t('seller.settings.staff.gatingStaff')} />
                </div>
              </Section>

              {/* Permissions summary */}
              <Section title={t('seller.settings.staff.permissionsSummary')}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                        <th scope="col" className="py-2 pr-3 font-semibold">{t('seller.settings.staff.colPermission')}</th>
                        <th scope="col" className="py-2 px-3 text-center font-semibold">{t('seller.settings.staff.colOwner')}</th>
                        <th scope="col" className="py-2 px-3 text-center font-semibold">{t('seller.settings.staff.colManager')}</th>
                        <th scope="col" className="py-2 px-3 text-center font-semibold">{t('seller.settings.staff.colStaff')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SELLER_PERMISSIONS.map(perm => (
                        <tr key={perm.key} className="border-b border-border-light last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-text">{t(perm.labelKey)}</td>
                          <td className="py-2.5 px-3 text-center">{perm.owner ? <Check size={16} className="mx-auto text-success" aria-label={t('seller.settings.staff.permissionsYes')} /> : <span className="text-xs text-text-tertiary">—</span>}</td>
                          <td className="py-2.5 px-3 text-center">{perm.manager ? <Check size={16} className="mx-auto text-success" aria-label={t('seller.settings.staff.permissionsYes')} /> : <span className="text-xs text-text-tertiary">—</span>}</td>
                          <td className="py-2.5 px-3 text-center">{perm.staff ? <Check size={16} className="mx-auto text-success" aria-label={t('seller.settings.staff.permissionsYes')} /> : <span className="text-xs text-text-tertiary">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </Container>

      {showInvite && <InviteModal t={t} onInvite={addStaff} onCancel={() => setShowInvite(false)} />}
      {editRoleFor && <EditRoleModal member={editRoleFor} t={t} onApply={(role) => updateRole(editRoleFor.id, role)} onCancel={() => setEditRoleFor(null)} />}
      {removing && <ConfirmDialog title={t('seller.settings.staff.removeConfirmTitle')} body={t('seller.settings.staff.removeConfirmBody', { name: removing.name })} confirmLabel={t('seller.settings.staff.removeConfirmBtn')} cancelLabel={t('seller.settings.staff.cancel')} danger onConfirm={() => removeStaff(removing.id)} onCancel={() => setRemoving(null)} />}
      {cancellingInvite && <ConfirmDialog title={t('seller.settings.staff.cancelInviteConfirmTitle')} body={t('seller.settings.staff.cancelInviteConfirmBody', { name: cancellingInvite.name })} confirmLabel={t('seller.settings.staff.cancelInviteConfirmBtn')} cancelLabel={t('seller.settings.staff.cancel')} danger onConfirm={() => cancelInvite(cancellingInvite.id)} onCancel={() => setCancellingInvite(null)} />}
    </Screen>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-border-light bg-surface p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-text">{title}</h2>{children}</section>
}

function GatingRow({ label }: { label: string }) {
  return <div className="flex items-center gap-2 rounded-md bg-background px-3 py-2.5 text-sm"><ShieldCheck size={16} className="shrink-0 text-primary" aria-hidden="true" /><span className="font-medium text-text">{label}</span></div>
}

function InviteModal({ t, onInvite, onCancel }: { t: (k: string, o?: Record<string, unknown>) => string; onInvite: (m: StaffMember) => void; onCancel: () => void }) {
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
      onInvite({ id: `staff-${Date.now()}`, name: name.trim(), email: email.trim(), phone: phone.trim(), role, status: 'pending', invitedAt: new Date().toISOString().slice(0, 10) })
      setSending(false)
    }, 500)
  }

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={t('seller.settings.staff.inviteTitle')}>
      <button className="absolute inset-0 bg-overlay" onClick={onCancel} aria-label={t('seller.settings.staff.cancel')} />
      <div className="relative mx-4 max-w-md rounded-lg bg-surface p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">{t('seller.settings.staff.inviteTitle')}</h2>
          <button type="button" onClick={onCancel} aria-label={t('seller.settings.staff.cancel')} className="rounded-md p-1 text-text-muted hover:bg-background"><X size={18} /></button>
        </div>
        <p className="mb-4 text-sm text-text-secondary">{t('seller.settings.staff.inviteHint')}</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-text">{t('seller.settings.staff.fieldName')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} aria-label={t('seller.settings.staff.fieldName')} aria-invalid={!!errors.name} className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.name ? 'border-error' : 'border-border'}`} placeholder={t('seller.settings.staff.fieldNamePlaceholder')} />
            {errors.name && <p className="mt-1 text-xs text-error" role="alert">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-text">{t('seller.settings.staff.fieldPhone')}</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label={t('seller.settings.staff.fieldPhone')} aria-invalid={!!errors.phone} className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.phone ? 'border-error' : 'border-border'}`} placeholder={t('seller.settings.staff.fieldPhonePlaceholder')} />
              {errors.phone && <p className="mt-1 text-xs text-error" role="alert">{errors.phone}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-text">{t('seller.settings.staff.fieldEmail')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label={t('seller.settings.staff.fieldEmail')} aria-invalid={!!errors.email} className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.email ? 'border-error' : 'border-border'}`} placeholder={t('seller.settings.staff.fieldEmailPlaceholder')} />
              {errors.email && <p className="mt-1 text-xs text-error" role="alert">{errors.email}</p>}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-text" aria-describedby="role-desc">{t('seller.settings.staff.fieldRole')}</label>
            <div className="space-y-2">
              {SELLER_STAFF_ROLES.filter(r => r.id !== 'owner').map(r => {
                const active = role === r.id
                return (
                  <button key={r.id} type="button" role="radio" aria-checked={active} aria-describedby="role-desc" aria-label={t(r.labelKey)} onClick={() => setRole(r.id)} className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors ${active ? 'border-primary bg-primary-50' : 'border-border bg-surface hover:bg-background'}`}>
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-primary' : 'border-border'}`}>{active && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                    <span><span className={`block text-sm font-semibold ${active ? 'text-primary' : 'text-text'}`}>{t(r.labelKey)}</span><span className="block text-xs text-text-muted">{t(r.descKey)}</span></span>
                  </button>
                )
              })}
            </div>
            <p id="role-desc" className="mt-2 text-xs text-text-muted">{t('seller.settings.staff.fieldRoleHint')}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-background transition-colors">{t('seller.settings.staff.cancel')}</button>
          <button type="button" onClick={handleSubmit} disabled={sending} className="inline-flex min-touch items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-40">{sending ? t('seller.settings.staff.sending') : t('seller.settings.staff.sendInvite')}</button>
        </div>
      </div>
    </div>
  )
}

function EditRoleModal({ member, t, onApply, onCancel }: { member: StaffMember; t: (k: string, o?: Record<string, unknown>) => string; onApply: (role: StaffRole) => void; onCancel: () => void }) {
  const [role, setRole] = useState<StaffRole>(member.role === 'owner' ? 'manager' : member.role)
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={t('seller.settings.staff.editRole')}>
      <button className="absolute inset-0 bg-overlay" onClick={onCancel} aria-label={t('seller.settings.staff.cancel')} />
      <div className="relative mx-4 max-w-md rounded-lg bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">{t('seller.settings.staff.editRole')} — {member.name}</h2>
          <button type="button" onClick={onCancel} aria-label={t('seller.settings.staff.cancel')} className="rounded-md p-1 text-text-muted hover:bg-background"><X size={18} /></button>
        </div>
        <div className="space-y-2">
          {SELLER_STAFF_ROLES.filter(r => r.id !== 'owner').map(r => {
            const active = role === r.id
            return (
              <button key={r.id} type="button" role="radio" aria-checked={active} aria-label={t(r.labelKey)} onClick={() => setRole(r.id)} className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors ${active ? 'border-primary bg-primary-50' : 'border-border bg-surface hover:bg-background'}`}>
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-primary' : 'border-border'}`}>{active && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                <span><span className={`block text-sm font-semibold ${active ? 'text-primary' : 'text-text'}`}>{t(r.labelKey)}</span><span className="block text-xs text-text-muted">{t(r.descKey)}</span></span>
              </button>
            )
          })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-background transition-colors">{t('seller.settings.staff.cancel')}</button>
          <button type="button" onClick={() => onApply(role)} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-dark transition-colors">{t('seller.settings.staff.save')}</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({ title, body, confirmLabel, cancelLabel, danger, onConfirm, onCancel }: { title: string; body: string; confirmLabel: string; cancelLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-overlay" onClick={onCancel} aria-label={cancelLabel} />
      <div className="relative mx-4 max-w-sm rounded-lg bg-surface p-5 shadow-xl">
        <h2 className="mb-2 text-base font-semibold text-text">{title}</h2>
        <p className="mb-4 text-sm text-text-secondary">{body}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text hover:bg-background transition-colors">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={`inline-flex min-touch items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors ${danger ? 'bg-error hover:opacity-90' : 'bg-primary hover:bg-primary-dark'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
