'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, Screen, Avatar } from '@chinooz/ui-web'
import { useOrders, useUserProfile } from '@chinooz/hooks'
import { useSessionStore } from '@chinooz/state'
import { duration } from '@chinooz/theme'

interface MenuItem {
  key: string
  labelKey: string
  icon: string
  href?: string
  onPress?: () => void
  destructive?: boolean
}

interface MenuSection {
  headerKey: string
  items: MenuItem[]
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative bg-surface rounded-2xl p-6 w-full max-w-[360px] shadow-xl"
      >
        <h2 className="text-lg font-semibold text-text mb-2">{t('profile.confirmSignOutTitle')}</h2>
        <p className="text-sm text-text-muted leading-5 mb-6">{t('profile.confirmSignOutMsg')}</p>
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-background text-sm font-semibold text-text hover:bg-border-light transition-colors"
            aria-label={t('profile.stay')}
          >
            {t('profile.stay')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-xl bg-error text-white text-sm font-semibold hover:bg-red-700 transition-colors"
            aria-label={t('profile.signOutAction')}
          >
            {t('profile.signOutAction')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function MenuRow({ item, showDivider }: { item: MenuItem; showDivider: boolean }) {
  const { t } = useTranslation()
  const router = useRouter()

  const handleClick = () => {
    if (item.onPress) item.onPress()
    else if (item.href) router.push(item.href)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`
          flex items-center w-full h-14 px-4 gap-3 text-left
          hover:bg-background transition-colors cursor-pointer
          ${showDivider ? 'border-b border-[#E5E5E5]' : ''}
        `}
        aria-label={t(item.labelKey)}
      >
        <span className="text-2xl w-8 text-center">{item.icon}</span>
        <span className={`flex-1 text-base font-medium ${item.destructive ? 'text-error' : 'text-text'}`}>
          {t(item.labelKey)}
        </span>
        <span className="text-lg text-text-tertiary font-light">›</span>
      </button>
    </>
  )
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const router = useRouter()

  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const logout = useSessionStore(s => s.logout)

  const { data: profile } = useUserProfile()
  const { data: allOrders } = useOrders()

  const [showSignOut, setShowSignOut] = useState(false)

  const orderCounts = useMemo(() => {
    const orders = allOrders ?? []
    return {
      toPay: orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
    }
  }, [allOrders])

  const requireAuth = useCallback((onAuthed: () => void) => {
    if (isLoggedIn) {
      onAuthed()
    } else {
      router.push('/phone-entry')
    }
  }, [isLoggedIn, router])

  const statusChips = [
    { key: 'to_pay', label: t('orders.tabToPay'), count: orderCounts.toPay, icon: '💳', color: '#F59E0B' },
    { key: 'processing', label: t('orders.tabProcessing'), count: orderCounts.processing, icon: '⚙️', color: '#2563EB' },
    { key: 'shipped', label: t('orders.tabShipped'), count: orderCounts.shipped, icon: '🚚', color: '#2563EB' },
    { key: 'delivered', label: t('orders.tabDelivered'), count: orderCounts.delivered, icon: '✅', color: '#16A34A' },
  ]

  const authedSections: MenuSection[] = [
    {
      headerKey: 'profile.shoppingSection',
      items: [
        { key: 'orders', labelKey: 'profile.myOrders', icon: '📦', href: '/orders' },
        { key: 'wishlist', labelKey: 'profile.wishlist', icon: '❤️' },
        { key: 'reviews', labelKey: 'profile.reviews', icon: '⭐' },
      ],
    },
    {
      headerKey: 'profile.accountSection',
      items: [
        { key: 'addresses', labelKey: 'profile.addresses', icon: '📍' },
        { key: 'payment', labelKey: 'profile.paymentMethods', icon: '💳' },
      ],
    },
    {
      headerKey: 'profile.preferencesSection',
      items: [
        { key: 'language', labelKey: 'profile.language', icon: '🌐' },
        { key: 'notifications', labelKey: 'profile.notifications', icon: '🔔' },
        { key: 'appearance', labelKey: 'profile.appearance', icon: '🌙' },
      ],
    },
    {
      headerKey: 'profile.supportSection',
      items: [
        { key: 'help', labelKey: 'profile.helpCenter', icon: '❓' },
        { key: 'contact', labelKey: 'profile.contactUs', icon: '✉️' },
        { key: 'about', labelKey: 'profile.about', icon: 'ℹ️' },
        { key: 'terms', labelKey: 'profile.termsPrivacy', icon: '📄' },
      ],
    },
  ]

  const safeItems: MenuItem[] = [
    { key: 'language', labelKey: 'profile.language', icon: '🌐' },
    { key: 'help', labelKey: 'profile.helpCenter', icon: '❓' },
    { key: 'about', labelKey: 'profile.about', icon: 'ℹ️' },
    { key: 'terms', labelKey: 'profile.termsPrivacy', icon: '📄' },
  ]

  const handleSignOut = () => {
    setShowSignOut(false)
    logout()
  }

  return (
    <Screen>
      <Container className="py-6 max-w-[800px]">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label={t('common.back')}
          >
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('profile.title')}</h1>
        </div>

        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div
              key="logged-out"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.normal / 1000 }}
            >
              <div className="bg-surface rounded-2xl p-6 shadow-sm flex flex-col items-center text-center mb-5">
                <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-5">
                  <span className="text-[36px]">👤</span>
                </div>
                <h2 className="text-[22px] font-semibold text-text mb-2">
                  {t('profile.welcomeTitle')}
                </h2>
                <p className="text-sm text-text-muted leading-5 mb-6 max-w-xs">
                  {t('profile.welcomeSubtitle')}
                </p>
                <button
                  onClick={() => router.push('/phone-entry')}
                  className="w-full h-12 rounded-xl bg-primary text-white text-base font-semibold hover:bg-primary-dark transition-colors"
                  aria-label={t('profile.signIn')}
                >
                  {t('profile.signIn')}
                </button>
              </div>

              <div className="mb-5">
                <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
                  {safeItems.map((item, ii) => (
                    <MenuRow key={item.key} item={item} showDivider={ii < safeItems.length - 1} />
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="logged-in"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.normal / 1000 }}
            >
              <div className="bg-surface rounded-2xl p-5 shadow-sm flex flex-col items-center text-center mb-5">
                <Avatar source={profile?.avatar} name={profile?.name} size="xl" />
                <h2 className="text-[22px] font-semibold text-text mt-3">
                  {profile?.name ?? '—'}
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  {profile?.phone ?? profile?.email ?? ''}
                </p>
                <button
                  onClick={() => {}}
                  className="flex items-center gap-1 mt-3 group"
                  aria-label={t('profile.editProfile')}
                >
                  <span className="text-sm font-semibold text-primary group-hover:underline">
                    {t('profile.editProfile')}
                  </span>
                  <span className="text-lg text-primary transition-transform group-hover:translate-x-0.5">›</span>
                </button>
              </div>

              <div className="flex gap-3 mb-6 overflow-x-auto scrollbar-none md:overflow-visible">
                {statusChips.map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => router.push(`/orders?status=${chip.key}`)}
                    className="flex-1 min-w-[80px] bg-surface rounded-xl p-3 shadow-sm flex flex-col items-center gap-1.5 hover:shadow-md transition-shadow cursor-pointer"
                    aria-label={`${chip.label}: ${chip.count} orders`}
                  >
                    <span className="text-2xl" style={{ color: chip.color }}>{chip.icon}</span>
                    <span className="text-base font-semibold text-text">{chip.count}</span>
                    <span className="text-xs text-text-muted">{chip.label}</span>
                  </button>
                ))}
              </div>

              {authedSections.map(section => (
                <div key={section.headerKey} className="mb-5">
                  <p className="text-xs font-semibold text-text-muted uppercase pl-4 mb-2">
                    {t(section.headerKey)}
                  </p>
                  <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
                    {section.items.map((item, ii) => (
                      <MenuRow key={item.key} item={item} showDivider={ii < section.items.length - 1} />
                    ))}
                  </div>
                </div>
              ))}

              <div className="mb-5">
                <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowSignOut(true)}
                    className="flex items-center w-full h-14 px-4 gap-3 text-left hover:bg-red-50 transition-colors cursor-pointer"
                    aria-label={t('profile.signOut')}
                  >
                    <span className="text-2xl w-8 text-center">🚪</span>
                    <span className="flex-1 text-base font-medium text-[#DC2626]">{t('profile.signOut')}</span>
                    <span className="text-lg text-text-tertiary font-light">›</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>

      <ConfirmDialog
        open={showSignOut}
        onClose={() => setShowSignOut(false)}
        onConfirm={handleSignOut}
      />
    </Screen>
  )
}
