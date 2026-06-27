'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'
import { useAddressStore, useSessionStore } from '@chinooz/state'
import { addressFormSchema } from '@chinooz/validation'
import { useReducedMotion } from '@chinooz/ui-web'
import { duration } from '@chinooz/theme'
import type { SavedAddress } from '@chinooz/state'

const KATHMANDU_AREAS = [
  'Baneshwor', 'Thamel', 'New Road', 'Patan', 'Bhaktapur', 'Koteshwor',
  'Tokha', 'Budhanilkantha', 'Balaju', 'Maharajgunj', 'Lazimpat', 'Durbar Marg',
  'Putalisadak', 'Maitidevi', 'Sinamangal', 'Chabahil', 'Swayambhu', 'Kalanki',
]

const LABEL_COLORS: Record<string, { bg: string; text: string }> = {
  home: { bg: 'bg-primary-50', text: 'text-primary' },
  work: { bg: 'bg-info-light', text: 'text-info' },
  other: { bg: 'bg-border', text: 'text-text-muted' },
}

function AddressFormModal({
  open,
  editingId,
  onClose,
  onSaved,
}: {
  open: boolean
  editingId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const addAddress = useAddressStore(s => s.addAddress)
  const removeAddress = useAddressStore(s => s.removeAddress)
  const addresses = useAddressStore(s => s.addresses)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [label, setLabel] = useState<'home' | 'work' | 'other'>('home')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && editingId) {
      const addr = addresses.find(a => a.id === editingId)
      if (addr) {
        setName(addr.fullName); setPhone(addr.phone); setStreet(addr.street)
        setArea(addr.area); setLabel(addr.label)
      }
    } else if (open) {
      setName(''); setPhone(''); setStreet(''); setArea(''); setLabel('home')
    }
    setErrors({})
  }, [open, editingId, addresses])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

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
    onSaved()
  }, [name, phone, street, area, label, editingId, addAddress, removeAddress, onSaved])

  const isValid = name.trim().length >= 2 && phone.length === 10 && street.length >= 3 && area.length >= 2

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: duration.fast / 1000 }}
        className="relative bg-surface rounded-2xl p-6 w-full max-w-[480px] max-h-[85vh] overflow-y-auto shadow-xl"
      >
        <h2 className="text-lg font-semibold text-text mb-4">
          {editingId ? t('addresses.editAddress') : t('addresses.addNew')}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.fullName')} *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('location.fullNamePlaceholder')}
              className={`w-full h-12 bg-surface rounded-xl border-[1.5px] px-3 text-sm text-text outline-none focus:border-primary transition-colors ${errors.fullName ? 'border-error' : 'border-border'}`}
              aria-label={t('location.fullName')} />
            {errors.fullName && <p className="text-xs text-error mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.phone')} *</label>
            <input type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98XXXXXXXX" maxLength={10}
              className={`w-full h-12 bg-surface rounded-xl border-[1.5px] px-3 text-sm text-text outline-none focus:border-primary transition-colors ${errors.phone ? 'border-error' : 'border-border'}`}
              aria-label={t('location.phone')} />
            {errors.phone && <p className="text-xs text-error mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.street')} *</label>
            <input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder={t('location.street')}
              className={`w-full h-12 bg-surface rounded-xl border-[1.5px] px-3 text-sm text-text outline-none focus:border-primary transition-colors ${errors.street ? 'border-error' : 'border-border'}`}
              aria-label={t('location.street')} />
            {errors.street && <p className="text-xs text-error mt-1">{errors.street}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.area')} *</label>
            <div className="flex flex-wrap gap-2">
              {KATHMANDU_AREAS.map(a => (
                <button key={a} type="button" onClick={() => setArea(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-[1.5px] transition-colors ${area === a ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-surface text-text-muted'}`}>
                  {a}
                </button>
              ))}
            </div>
            {errors.area && <p className="text-xs text-error mt-1">{errors.area}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.city')}</label>
            <input type="text" value="Kathmandu" disabled className="w-full h-12 bg-background rounded-xl border-[1.5px] border-border px-3 text-sm text-text-muted outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.label')}</label>
            <div className="flex gap-2">
              {(['home', 'work', 'other'] as const).map(l => (
                <button key={l} type="button" onClick={() => setLabel(l)}
                  className={`flex-1 h-11 rounded-xl border-[1.5px] font-semibold text-sm transition-colors ${label === l ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-surface text-text-muted'}`}>
                  {t(`addresses.${l}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border-[1.5px] border-border font-semibold text-sm text-text hover:bg-background transition-colors">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} disabled={!isValid}
              className="flex-1 h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors">
              {t('location.save')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function DeleteConfirmDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation()
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  useEffect(() => { if (open) setTimeout(() => cancelRef.current?.focus(), 50) }, [open])
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
        className="relative bg-surface rounded-2xl p-6 w-full max-w-[360px] shadow-xl">
        <h2 className="text-lg font-semibold text-text mb-2">{t('addresses.deleteTitle')}</h2>
        <p className="text-sm text-text-muted leading-5 mb-6">{t('addresses.deleteMsg')}</p>
        <div className="flex gap-3">
          <button ref={cancelRef} onClick={onClose} className="flex-1 h-11 rounded-xl bg-background text-sm font-semibold text-text hover:bg-border-light transition-colors" aria-label={t('common.cancel')}>
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 h-11 rounded-xl bg-error text-white text-sm font-semibold hover:bg-red-700 transition-colors" aria-label={t('common.delete')}>
            {t('common.delete')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AddressesPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)

  const addresses = useAddressStore(s => s.addresses)
  const removeAddress = useAddressStore(s => s.removeAddress)
  const setDefault = useAddressStore(s => s.setDefault)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn])

  const handleDelete = useCallback(() => {
    if (deleteId) { removeAddress(deleteId); setDeleteId(null) }
  }, [deleteId, removeAddress])

  if (!isLoggedIn) return null

  return (
    <Screen>
      <Container className="py-6 max-w-[800px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors" aria-label={t('common.back')}>
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('addresses.title')}</h1>
        </div>

        {addresses.length === 0 ? (
          <motion.div initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 px-8">
            <span className="text-5xl mb-4">📍</span>
            <h3 className="text-lg font-semibold text-text text-center">{t('addresses.emptyTitle')}</h3>
            <p className="text-sm text-text-muted text-center mt-2 max-w-xs">{t('addresses.emptySubtitle')}</p>
          </motion.div>
        ) : (
          <div className="space-y-3 mb-4">
            <AnimatePresence mode="popLayout">
              {addresses.map((addr, i) => {
                const lc = LABEL_COLORS[addr.label] ?? LABEL_COLORS.other
                return (
                  <motion.div
                    key={addr.id}
                    initial={reduced ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, height: 0, overflow: 'hidden' }}
                    transition={{ duration: reduced ? 0 : duration.normal / 1000, delay: reduced ? 0 : i * 0.05 }}
                  >
                    <div className={`bg-surface rounded-2xl p-4 shadow-sm ${addr.isDefault ? 'border-2 border-primary' : 'border border-border-light'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${lc.bg} ${lc.text}`}>
                            {t(`addresses.${addr.label}`)}
                          </span>
                          {addr.isDefault && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-white">
                              {t('addresses.default')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => { setEditingId(addr.id); setShowForm(true) }} className="text-xs font-semibold text-primary hover:underline" aria-label={t('common.edit')}>
                            {t('common.edit')}
                          </button>
                          <button onClick={() => setDeleteId(addr.id)} className="text-xs font-semibold text-error hover:underline" aria-label={t('common.delete')}>
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                      <p className="text-base font-semibold text-text">{addr.fullName}</p>
                      <p className="text-xs text-text-muted">{addr.phone}</p>
                      <p className="text-sm text-text-muted leading-5 line-clamp-3">{addr.street}, {addr.area}, {addr.city}</p>
                      {!addr.isDefault && (
                        <button onClick={() => setDefault(addr.id)} className="mt-2 text-xs font-semibold text-text-muted hover:text-primary transition-colors" aria-label={t('addresses.setDefault')}>
                          {t('addresses.setDefault')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        <button
          onClick={() => { setEditingId(null); setShowForm(true) }}
          className="w-full p-3 rounded-xl border-[1.5px] border-dashed border-border flex flex-col items-center gap-1 hover:border-primary/30 transition-colors"
          aria-label={t('addresses.addNew')}
        >
          <span className="text-xl text-primary">+</span>
          <span className="text-sm font-semibold text-primary">{t('addresses.addNew')}</span>
        </button>
      </Container>

      <AddressFormModal
        open={showForm}
        editingId={editingId}
        onClose={() => { setShowForm(false); setEditingId(null) }}
        onSaved={() => { setShowForm(false); setEditingId(null) }}
      />

      <DeleteConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Screen>
  )
}
