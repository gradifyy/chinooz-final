'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { addressFormSchema } from '@chinooz/validation'
import { useSessionStore, useUIStore, useAddressStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { SlideUp } from '@chinooz/ui-web'

const KATHMANDU_AREAS = [
  'Baneshwor', 'Thamel', 'New Road', 'Patan', 'Bhaktapur', 'Koteshwor',
  'Tokha', 'Budhanilkantha', 'Balaju', 'Maharajgunj', 'Lazimpat', 'Durbar Marg',
  'Putalisadak', 'Maitidevi', 'Sinamangal', 'Chabahil', 'Swayambhu', 'Kalanki',
  'Thankot', 'Chandragiri', 'Godawari', 'Lubhu', 'Sankhu', 'Jorpati',
]

export default function LocationPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || ''
  const reduced = useReducedMotion()

  const profile = useSessionStore(s => s.profile)
  const addAddress = useAddressStore(s => s.addAddress)
  const setLocationCoords = useAddressStore(s => s.setLocationCoords)
  const setAddressReminderPending = useUIStore(s => s.setAddressReminderPending)
  const addToast = useUIStore(s => s.addToast)

  const [mode, setMode] = useState<'permission' | 'manual' | 'granting'>('permission')
  const [grantError, setGrantError] = useState('')
  const [name, setName] = useState(profile.name || '')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [city] = useState('Kathmandu')
  const [label, setLabel] = useState<'home' | 'work' | 'other'>('home')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const handleAllowLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setMode('manual')
      setGrantError(t('location.denied'))
      addToast({ message: t('location.denied'), variant: 'warning' })
      return
    }

    setMode('granting')
    setGrantError('')

    const timeout = setTimeout(() => {
      setMode('manual')
      setGrantError(t('location.denied'))
      addToast({ message: t('location.denied'), variant: 'warning' })
    }, 5000)

    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(timeout)
        setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        if (from === 'profile') {
          router.back()
        } else {
          router.push('/')
        }
      },
      () => {
        clearTimeout(timeout)
        setMode('manual')
        setGrantError(t('location.denied'))
        addToast({ message: t('location.denied'), variant: 'warning' })
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    )
  }, [t, from, router, setLocationCoords, addToast])

  const handleEnterManually = useCallback(() => setMode('manual'), [])

  const handleSkip = useCallback(() => {
    setAddressReminderPending(true)
    if (from === 'profile') {
      router.back()
    } else {
      router.push('/')
    }
  }, [from, router, setAddressReminderPending])

  const validate = useCallback(() => {
    const result = addressFormSchema.safeParse({ fullName: name, phone, street, area, city, label })
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => { newErrors[issue.path[0] as string] = issue.message })
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }, [name, phone, street, area, city, label])

  const isValid = name.trim().length >= 2 && phone.length === 10 && street.length >= 3 && area.length >= 2

  const handleSave = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      await new Promise(r => setTimeout(r, 400))
      addAddress({ fullName: name.trim(), phone, street: street.trim(), area, city, label })
      setAddressReminderPending(false)
      addToast({ message: t('location.saved'), variant: 'success' })
      if (from === 'profile') {
        router.back()
      } else {
        router.push('/')
      }
    } catch {} finally {
      setSaving(false)
    }
  }, [name, phone, street, area, city, label, validate, addAddress, setAddressReminderPending, addToast, t, from, router])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full py-8">
        <AnimatePresence mode="wait">
          {mode === 'permission' || mode === 'granting' ? (
            <motion.div
              key="permission"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -20 }}
              transition={{ duration: reduced ? 0 : 0.3 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <motion.div
                animate={reduced ? {} : { y: [0, -6, 6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-48 h-48 rounded-full bg-primary-50 flex items-center justify-center"
              >
                <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary shadow-lg shadow-primary/30" />
                </div>
              </motion.div>

              <div>
                <h1 className="text-[26px] font-bold text-text tracking-tight mb-2">
                  {t('location.title')}
                </h1>
                <p className="text-[15px] text-text-muted leading-relaxed max-w-[320px] mx-auto">
                  {t('location.subtitle')}
                </p>
              </div>

              {grantError && (
                <p className="text-sm text-warning">{grantError}</p>
              )}

              <div className="w-full flex flex-col gap-3">
                <motion.button
                  onClick={handleAllowLocation}
                  disabled={mode === 'granting'}
                  whileHover={reduced ? {} : { scale: 1.02 }}
                  whileTap={reduced ? {} : { scale: 0.97 }}
                  className="w-full bg-primary text-white h-13 rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {mode === 'granting' ? (
                    <div className="flex items-center gap-1.5">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <motion.span key={i} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: d }} className="w-2 h-2 rounded-full bg-white/60" />
                      ))}
                    </div>
                  ) : (
                    t('location.allow')
                  )}
                </motion.button>

                <button onClick={handleEnterManually} className="text-base font-semibold text-primary py-2 hover:underline">
                  {t('location.enterManually')}
                </button>

                <button onClick={handleSkip} className="text-sm text-text-muted py-1 hover:text-text transition-colors">
                  {t('location.skip')}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="manual"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -20 }}
              transition={{ duration: reduced ? 0 : 0.3 }}
            >
              <SlideUp delay={reduced ? 0 : 0.1}>
                <h1 className="text-[26px] font-bold text-text tracking-tight mb-6">
                  {t('location.manualTitle')}
                </h1>
              </SlideUp>

              <SlideUp delay={reduced ? 0 : 0.15}>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">{t('location.fullName')} *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={100}
                      className={`w-full h-13 bg-surface rounded-xl border-[1.5px] px-4 text-base text-text outline-none focus:border-primary ${errors.fullName ? 'border-error' : 'border-border'}`} />
                    {errors.fullName && <p className="text-xs text-error mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">{t('location.phone')} *</label>
                    <input type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} placeholder="98XXXXXXXX"
                      className={`w-full h-13 bg-surface rounded-xl border-[1.5px] px-4 text-base text-text outline-none focus:border-primary ${errors.phone ? 'border-error' : 'border-border'}`} />
                    {errors.phone && <p className="text-xs text-error mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">{t('location.street')} *</label>
                    <input type="text" value={street} onChange={e => setStreet(e.target.value)} maxLength={200}
                      className={`w-full h-13 bg-surface rounded-xl border-[1.5px] px-4 text-base text-text outline-none focus:border-primary ${errors.street ? 'border-error' : 'border-border'}`} />
                    {errors.street && <p className="text-xs text-error mt-1">{errors.street}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">{t('location.area')} *</label>
                    <div className="flex flex-wrap gap-2">
                      {KATHMANDU_AREAS.map(a => (
                        <button key={a} type="button" onClick={() => setArea(a)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border-[1.5px] transition-colors ${
                            area === a ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-surface text-text-muted'
                          }`}>
                          {a}
                        </button>
                      ))}
                    </div>
                    {errors.area && <p className="text-xs text-error mt-1">{errors.area}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">{t('location.city')}</label>
                    <input type="text" value={city} disabled className="w-full h-13 bg-background rounded-xl border-[1.5px] border-border px-4 text-base text-text-muted" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">{t('location.label')}</label>
                    <div className="flex gap-2">
                      {(['home', 'work', 'other'] as const).map(l => (
                        <button key={l} type="button" onClick={() => setLabel(l)}
                          className={`flex-1 h-11 rounded-xl border-[1.5px] font-semibold text-sm transition-colors ${
                            label === l ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-surface text-text-muted'
                          }`}>
                          {t(`location.${l}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-3">
                    <motion.button type="submit" disabled={!isValid || saving}
                      whileHover={reduced || !isValid ? {} : { scale: 1.02 }}
                      whileTap={reduced || !isValid ? {} : { scale: 0.97 }}
                      className="w-full bg-primary text-white h-13 rounded-xl font-bold text-base disabled:opacity-50 hover:bg-primary-dark transition-colors flex items-center justify-center">
                      {saving ? (
                        <div className="flex items-center gap-1.5">
                          {[0, 0.2, 0.4].map((d, i) => (
                            <motion.span key={i} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: d }} className="w-2 h-2 rounded-full bg-white/60" />
                          ))}
                        </div>
                      ) : t('location.save')}
                    </motion.button>

                    <button type="button" onClick={handleSkip} className="text-sm text-text-muted text-center py-1 hover:text-text transition-colors">
                      {t('location.skip')}
                    </button>
                  </div>
                </form>
              </SlideUp>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
