'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'
import { usePaymentsStore, useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { duration } from '@chinooz/theme'
import { PaymentMethodSkeleton } from '../../components/skeletons/ProfileSkeletons'
import type { LinkedPaymentMethod, PaymentType } from '@chinooz/state'

const METHOD_META: Record<PaymentType, { icon: string; color: string }> = {
  cod: { icon: '💵', color: '#16A34A' },
  khalti: { icon: '💜', color: '#5C2D91' },
  esewa: { icon: '💚', color: '#60BB46' },
}

function ConnectModal({
  open,
  method,
  onClose,
  onConnected,
}: {
  open: boolean
  method: LinkedPaymentMethod | null
  onClose: () => void
  onConnected: () => void
}) {
  const { t } = useTranslation()
  const connect = usePaymentsStore(s => s.connect)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!open) { setConnecting(false); return }
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !connecting) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, connecting, onClose])

  const handleConnect = useCallback(() => {
    if (!method) return
    setConnecting(true)
    setTimeout(() => {
      connect(method.id)
      setConnecting(false)
      onConnected()
    }, 1500)
  }, [method, connect, onConnected])

  if (!open || !method) return null

  const meta = METHOD_META[method.type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/40" onClick={() => { if (!connecting) onClose() }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: duration.fast / 1000 }}
        className="relative bg-surface rounded-2xl p-6 w-full max-w-[400px] shadow-xl flex flex-col items-center text-center"
      >
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: meta.color + '15' }}>
          <span className="text-[28px]">{meta.icon}</span>
        </div>
        <h2 className="text-lg font-semibold text-text mb-1">{t('payments.connect')} {t(`payments.${method.type}`)}</h2>
        <p className="text-sm text-text-muted mb-5">{t(`payments.${method.type}Note`)}</p>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full h-12 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary-dark transition-colors disabled:opacity-80 flex items-center justify-center gap-2"
          aria-label={connecting ? t('payments.connecting') : t('payments.connect')}
        >
          {connecting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {t('payments.connecting')}
            </>
          ) : (
            t('payments.connect')
          )}
        </button>
      </motion.div>
    </div>
  )
}

function RemoveConfirmDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
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
        <h2 className="text-lg font-semibold text-text mb-2">{t('payments.removeTitle')}</h2>
        <p className="text-sm text-text-muted leading-5 mb-6">{t('payments.removeMsg')}</p>
        <div className="flex gap-3">
          <button ref={cancelRef} onClick={onClose} className="flex-1 h-11 rounded-xl bg-background text-sm font-semibold text-text hover:bg-border-light transition-colors" aria-label={t('common.cancel')}>
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 h-11 rounded-xl bg-error text-white text-sm font-semibold hover:bg-red-700 transition-colors" aria-label={t('payments.remove')}>
            {t('payments.remove')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function PaymentsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)

  const methods = usePaymentsStore(s => s.methods)
  const setDefault = usePaymentsStore(s => s.setDefault)
  const remove = usePaymentsStore(s => s.remove)

  const [connectId, setConnectId] = useState<string | null>(null)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn])

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = useCallback(() => {
    if (removeId) { remove(removeId); setRemoveId(null) }
  }, [removeId, remove])

  const connectedMethods = methods.filter(m => m.connected)
  const unconnectedMethods = methods.filter(m => !m.connected)
  const connectTarget = connectId ? methods.find(m => m.id === connectId) ?? null : null

  if (!isLoggedIn) return null

  return (
    <Screen>
      <Container className="py-6 max-w-[800px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors" aria-label={t('common.back')}>
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('payments.title')}</h1>
        </div>

        {initialLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label={t('common.loadingPayments')}>
            {[0, 1, 2].map(i => <PaymentMethodSkeleton key={i} />)}
          </div>
        ) : connectedMethods.length === 0 && unconnectedMethods.length === 0 ? (
          <motion.div initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 px-8">
            <span className="text-5xl mb-4">💳</span>
            <h3 className="text-lg font-semibold text-text text-center">{t('payments.emptyTitle')}</h3>
            <p className="text-sm text-text-muted text-center mt-2 max-w-xs">{t('payments.emptySubtitle')}</p>
          </motion.div>
        ) : (
          <div className="space-y-3 mb-4">
            <AnimatePresence mode="popLayout">
              {connectedMethods.map((method, i) => {
                const meta = METHOD_META[method.type]
                return (
                  <motion.div
                    key={method.id}
                    initial={reduced ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, height: 0, overflow: 'hidden' }}
                    transition={{ duration: reduced ? 0 : duration.normal / 1000, delay: reduced ? 0 : i * 0.05 }}
                  >
                    <div className={`bg-surface rounded-2xl p-4 shadow-sm ${method.isDefault ? 'border-2 border-primary' : 'border border-border-light'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.color + '15' }}>
                          <span className="text-xl">{meta.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-text">{t(`payments.${method.type === 'cod' ? 'cashOnDelivery' : method.type}`)}</p>
                          <p className="text-sm text-text-muted">{t(`payments.${method.type === 'cod' ? 'codNote' : method.type + 'Note'}`)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {method.isDefault ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-white">
                              {t('payments.default')}
                            </span>
                          ) : (
                            <button onClick={() => setDefault(method.id)} className="text-xs font-semibold text-text-muted hover:text-primary transition-colors" aria-label={t('payments.setDefault')}>
                              {t('payments.setDefault')}
                            </button>
                          )}
                        </div>
                      </div>
                      {method.type !== 'cod' && (
                        <div className="flex justify-end mt-2">
                          <button onClick={() => setRemoveId(method.id)} className="text-xs font-semibold text-error hover:underline" aria-label={t('payments.remove')}>
                            {t('payments.remove')}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {unconnectedMethods.length > 0 && (
              <p className="text-sm font-semibold text-text-muted pt-2">{t('payments.addMethod')}</p>
            )}

            {unconnectedMethods.map((method, i) => {
              const meta = METHOD_META[method.type]
              return (
                <motion.div
                  key={method.id}
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : duration.normal / 1000, delay: reduced ? 0 : (connectedMethods.length + i) * 0.05 }}
                >
                  <button
                    onClick={() => setConnectId(method.id)}
                    className="w-full bg-surface rounded-2xl p-4 border border-border-light shadow-sm flex items-center gap-3 hover:border-primary/30 transition-colors text-left"
                    aria-label={`${t('payments.connect')} ${t(`payments.${method.type}`)}`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.color + '15' }}>
                      <span className="text-xl">{meta.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-text">{t(`payments.${method.type}`)}</p>
                      <p className="text-sm text-text-muted">{t(`payments.${method.type}Note`)}</p>
                    </div>
                    <span className="text-lg text-text-tertiary font-light">›</span>
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </Container>

      <ConnectModal
        open={connectId !== null}
        method={connectTarget}
        onClose={() => setConnectId(null)}
        onConnected={() => setConnectId(null)}
      />

      <RemoveConfirmDialog
        open={removeId !== null}
        onClose={() => setRemoveId(null)}
        onConfirm={handleRemove}
      />
    </Screen>
  )
}
