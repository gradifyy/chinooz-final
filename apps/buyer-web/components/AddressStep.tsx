'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'
import { useAddressStore, useCheckoutStore } from '@chinooz/state'
import { addressFormSchema } from '@chinooz/validation'
import type { SavedAddress } from '@chinooz/state'

const KATHMANDU_AREAS = [
  'Baneshwor', 'Thamel', 'New Road', 'Patan', 'Bhaktapur', 'Koteshwor',
  'Tokha', 'Budhanilkantha', 'Balaju', 'Maharajgunj', 'Lazimpat', 'Durbar Marg',
  'Putalisadak', 'Maitidevi', 'Sinamangal', 'Chabahil', 'Swayambhu', 'Kalanki',
]

interface AddressStepProps {
  onValidChange?: (valid: boolean) => void
}

export default function AddressStep({ onValidChange }: AddressStepProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const addresses = useAddressStore(s => s.addresses)
  const addAddress = useAddressStore(s => s.addAddress)
  const removeAddress = useAddressStore(s => s.removeAddress)
  const setDefault = useAddressStore(s => s.setDefault)
  const checkoutAddress = useCheckoutStore(s => s.address)
  const setCheckoutAddress = useCheckoutStore(s => s.setAddress)

  const [selectedId, setSelectedId] = useState<string | null>(
    checkoutAddress ? null : addresses.find(a => a.isDefault)?.id || null
  )
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [label, setLabel] = useState<'home' | 'work' | 'other'>('home')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSelect = useCallback((addr: SavedAddress) => {
    setSelectedId(addr.id)
    setCheckoutAddress({
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      area: addr.area,
      city: addr.city,
      label: addr.label,
    })
    onValidChange?.(true)
  }, [setCheckoutAddress, onValidChange])

  const handleAddNew = useCallback(() => {
    setName('')
    setPhone('')
    setStreet('')
    setArea('')
    setLabel('home')
    setErrors({})
    setEditingId(null)
    setShowForm(true)
  }, [])

  const handleEdit = useCallback((addr: SavedAddress) => {
    setName(addr.fullName)
    setPhone(addr.phone)
    setStreet(addr.street)
    setArea(addr.area)
    setLabel(addr.label)
    setErrors({})
    setEditingId(addr.id)
    setShowForm(true)
  }, [])

  const handleDelete = useCallback((id: string) => {
    if (window.confirm(t('checkout.confirmDelete'))) {
      removeAddress(id)
      if (selectedId === id) {
        setSelectedId(null)
        onValidChange?.(false)
      }
    }
  }, [selectedId, removeAddress, onValidChange, t])

  const handleSave = useCallback(() => {
    const result = addressFormSchema.safeParse({ fullName: name, phone, street, area, city: 'Kathmandu', label })
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        newErrors[issue.path[0] as string] = issue.message
      })
      setErrors(newErrors)
      return
    }
    setErrors({})
    if (editingId) removeAddress(editingId)
    addAddress({ fullName: name.trim(), phone, street: street.trim(), area, city: 'Kathmandu', label })
    setShowForm(false)
    setEditingId(null)
  }, [name, phone, street, area, label, editingId, addAddress, removeAddress])

  const isValid = name.trim().length >= 2 && phone.length === 10 && street.length >= 3 && area.length >= 2

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text">{t('checkout.address')}</h2>

      {/* Saved addresses */}
      {addresses.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-text-secondary">{t('checkout.savedAddresses')}</p>
          {addresses.map((addr, i) => {
            const isSelected = selectedId === addr.id
            return (
              <motion.div
                key={addr.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : i * 0.05 }}
              >
                <button
                  onClick={() => handleSelect(addr)}
                  className={`w-full p-3 rounded-xl border-2 text-left space-y-1.5 transition-colors ${
                    isSelected ? 'border-primary bg-surface' : 'border-border bg-surface hover:border-primary/30'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        addr.label === 'home' ? 'bg-primary-50 text-primary' : addr.label === 'work' ? 'bg-info-light text-info' : 'bg-border text-text-muted'
                      }`}>
                        {t(`location.${addr.label}`)}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-success-light text-success">
                          {t('checkout.default')}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 400 }}
                        className="text-lg text-primary font-bold"
                      >
                        ✓
                      </motion.span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-text">{addr.fullName}</p>
                  <p className="text-xs text-text-muted">{addr.phone}</p>
                  <p className="text-xs text-text-muted">{addr.street}, {addr.area}, {addr.city}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(addr) }} className="text-xs font-semibold text-primary hover:underline">
                      {t('common.edit')}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(addr.id) }} className="text-xs font-semibold text-error hover:underline">
                      {t('common.delete')}
                    </button>
                    {!addr.isDefault && (
                      <button onClick={(e) => { e.stopPropagation(); setDefault(addr.id) }} className="text-xs font-semibold text-text-muted hover:underline">
                        {t('checkout.setDefault')}
                      </button>
                    )}
                  </div>
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add new address */}
      {!showForm ? (
        <button
          onClick={handleAddNew}
          className="w-full p-3 rounded-xl border-[1.5px] border-dashed border-border flex flex-col items-center gap-1 hover:border-primary/30 transition-colors"
        >
          <span className="text-xl text-primary">+</span>
          <span className="text-sm font-semibold text-primary">{t('checkout.addNewAddress')}</span>
        </button>
      ) : (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          className="space-y-3"
        >
          <h3 className="text-base font-semibold text-text">
            {editingId ? t('checkout.editAddress') : t('checkout.addNewAddress')}
          </h3>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.fullName')} *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('location.fullNamePlaceholder')}
              className={`w-full h-12 bg-surface rounded-xl border-[1.5px] px-3 text-sm text-text outline-none focus:border-primary transition-colors ${errors.fullName ? 'border-error' : 'border-border'}`}
              aria-label={t('location.fullName')}
            />
            {errors.fullName && <p className="text-xs text-error mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.phone')} *</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="98XXXXXXXX"
              maxLength={10}
              className={`w-full h-12 bg-surface rounded-xl border-[1.5px] px-3 text-sm text-text outline-none focus:border-primary transition-colors ${errors.phone ? 'border-error' : 'border-border'}`}
              aria-label={t('location.phone')}
            />
            {errors.phone && <p className="text-xs text-error mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.street')} *</label>
            <input
              type="text"
              value={street}
              onChange={e => setStreet(e.target.value)}
              placeholder={t('location.street')}
              className={`w-full h-12 bg-surface rounded-xl border-[1.5px] px-3 text-sm text-text outline-none focus:border-primary transition-colors ${errors.street ? 'border-error' : 'border-border'}`}
              aria-label={t('location.street')}
            />
            {errors.street && <p className="text-xs text-error mt-1">{errors.street}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.area')} *</label>
            <div className="flex flex-wrap gap-2">
              {KATHMANDU_AREAS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArea(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-[1.5px] transition-colors ${
                    area === a ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-surface text-text-muted'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            {errors.area && <p className="text-xs text-error mt-1">{errors.area}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.city')}</label>
            <input
              type="text"
              value="Kathmandu"
              disabled
              className="w-full h-12 bg-background rounded-xl border-[1.5px] border-border px-3 text-sm text-text-muted outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('location.label')}</label>
            <div className="flex gap-2">
              {(['home', 'work', 'other'] as const).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLabel(l)}
                  className={`flex-1 h-11 rounded-xl border-[1.5px] font-semibold text-sm transition-colors ${
                    label === l ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-surface text-text-muted'
                  }`}
                >
                  {t(`location.${l}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="flex-1 h-11 rounded-xl border-[1.5px] border-border font-semibold text-sm text-text hover:bg-background transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
            >
              {t('location.save')}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
