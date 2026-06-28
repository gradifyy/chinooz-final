'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, AlertCircle, Zap, Users, X } from 'lucide-react'
import { Container, Screen, useReducedMotion, EmptyState, Toast } from '@chinooz/ui-web'
import { analytics } from '@chinooz/analytics'
import { getCampaignStatusPill, type Campaign } from '@chinooz/mock-data'
import { useCampaigns, useOptIntoCampaign, useWithdrawFromCampaign, useSellerProducts } from '@chinooz/hooks'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatExposure(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)
}

export default function CampaignsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()

  const [optInCampaign, setOptInCampaign] = useState<Campaign | null>(null)
  const [withdrawCampaign, setWithdrawCampaign] = useState<Campaign | null>(null)
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message })
    setTimeout(() => setToast({ visible: false, message: '' }), 3000)
  }, [])

  useEffect(() => {
    analytics.screen({ name: 'seller-campaigns' })
  }, [])

  const { data, isLoading, isError, refetch } = useCampaigns()
  const optInMutation = useOptIntoCampaign()
  const withdrawMutation = useWithdrawFromCampaign()

  const campaigns = data ?? []

  const handleOptInSuccess = useCallback(async (campaignId: string, productIds: string[], discountValue: number) => {
    await optInMutation.mutateAsync({ campaignId, productIds, discountValue })
    setOptInCampaign(null)
    const camp = campaigns.find(c => c.id === campaignId)
    showToast(t('seller.promotions.campaigns.optInSuccess', { name: camp?.name ?? '' }))
  }, [optInMutation, campaigns, showToast, t])

  const handleWithdraw = useCallback(async (campaignId: string) => {
    await withdrawMutation.mutateAsync(campaignId)
    setWithdrawCampaign(null)
    const camp = campaigns.find(c => c.id === campaignId)
    showToast(t('seller.promotions.campaigns.withdrawSuccess', { name: camp?.name ?? '' }))
  }, [withdrawMutation, campaigns, showToast, t])

  return (
    <Screen>
      <div className="sticky top-0 z-sticky bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 border-b border-border-light">
        <Container>
          <div className="py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/promotions')}
              aria-label={t('seller.promotions.builder.backAria')}
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span className="hidden sm:inline">{t('seller.promotions.builder.back')}</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-[18px] font-semibold text-text truncate">{t('seller.promotions.campaigns.title')}</h1>
            </div>
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-6">
          <p className="text-sm text-text-muted mb-4">{t('seller.promotions.campaigns.subtitle')}</p>

          {isLoading ? (
            <div aria-busy="true" aria-label={t('seller.promotions.campaigns.skeletonAria')} className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border-light bg-surface p-5 animate-pulse">
                  <div className="h-6 w-48 bg-shimmer rounded mb-3" />
                  <div className="h-4 w-32 bg-shimmer rounded mb-4" />
                  <div className="h-3 w-full bg-shimmer rounded mb-2" />
                  <div className="h-3 w-2/3 bg-shimmer rounded" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              title={t('seller.promotions.campaigns.error')}
              action={{ label: t('seller.promotions.campaigns.retry'), onPress: () => refetch() }}
            />
          ) : campaigns.length === 0 ? (
            <EmptyState title={t('seller.promotions.campaigns.empty')} />
          ) : (
            <>
              <p className="text-xs text-text-muted mb-3">{t('seller.promotions.campaigns.count', { count: campaigns.length })}</p>
              <div className="flex flex-col gap-4">
                {campaigns.map((camp, i) => (
                  <CampaignCard
                    key={camp.id}
                    campaign={camp}
                    t={t}
                    reduced={reduced}
                    delay={i * 50}
                    onOptIn={() => setOptInCampaign(camp)}
                    onWithdraw={() => setWithdrawCampaign(camp)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Container>

      {/* Opt-in dialog */}
      <AnimatePresence>
        {optInCampaign && (
          <OptInDialog
            campaign={optInCampaign}
            t={t}
            reduced={reduced}
            onClose={() => setOptInCampaign(null)}
            onConfirm={handleOptInSuccess}
          />
        )}
      </AnimatePresence>

      {/* Withdraw confirm */}
      <AnimatePresence>
        {withdrawCampaign && (
          <WithdrawDialog
            campaign={withdrawCampaign}
            t={t}
            reduced={reduced}
            onClose={() => setWithdrawCampaign(null)}
            onConfirm={() => handleWithdraw(withdrawCampaign.id)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <Toast message={toast.message} variant="success" visible={toast.visible} />
    </Screen>
  )
}

type TT = (key: string, opts?: Record<string, unknown>) => string

function CampaignCard({ campaign, t, reduced, delay, onOptIn, onWithdraw }: { campaign: Campaign; t: TT; reduced: boolean; delay: number; onOptIn: () => void; onWithdraw: () => void }) {
  const pill = getCampaignStatusPill(campaign.participation?.status ?? 'upcoming')
  const isParticipating = campaign.participation && campaign.participation.status !== 'upcoming'
  const statusLabel = t(pill.label)

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.25, delay: delay / 1000 }}
      className="rounded-lg border border-border-light bg-surface shadow-sm overflow-hidden"
    >
      {/* Banner */}
      <div className={`h-20 bg-gradient-to-r ${campaign.bannerGradient} relative flex items-center px-5`}>
        <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
          <Zap size={22} className="text-gold" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <h3 className="text-[18px] font-semibold text-text leading-tight truncate" id={`camp-${campaign.id}-name`}>
            {campaign.name}
          </h3>
          <p className="text-[12px] text-text-muted mt-0.5" id={`camp-${campaign.id}-dates`}>
            {t('seller.promotions.campaigns.dateRange', { start: formatDate(campaign.startsAt), end: formatDate(campaign.endsAt) })}
          </p>
        </div>
        <span
          className="inline-flex items-center text-[12px] font-semibold rounded-full px-2.5 py-1 shrink-0"
          style={{ backgroundColor: pill.bg, color: pill.color }}
          aria-label={t('seller.promotions.campaigns.statusAria', { status: statusLabel })}
        >
          {statusLabel}
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        <p className="text-[14px] text-text-secondary leading-5 mb-3">{campaign.description}</p>

        {/* Required discount chip + exposure */}
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 text-gold text-[12px] font-semibold px-3 py-1">
            <Zap size={13} aria-hidden="true" />
            {t('seller.promotions.campaigns.requiredDiscount', { min: campaign.minDiscount, max: campaign.maxDiscount })}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            <Users size={13} aria-hidden="true" />
            {t('seller.promotions.campaigns.exposureValue', { count: formatExposure(campaign.expectedExposure) })}
          </span>
        </div>

        {/* Rules */}
        <div className="mb-4">
          <p className="text-[13px] font-semibold text-text mb-1.5">{t('seller.promotions.campaigns.rules')}</p>
          <ul className="text-[12px] text-text-muted space-y-1 pl-4 list-disc">
            {campaign.rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>

        {/* Participation info */}
        {isParticipating && campaign.participation && (
          <div className="rounded-md border border-border-light bg-background p-3 mb-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[13px] font-semibold text-text">{t('seller.promotions.campaigns.participationStatus')}</p>
              <span
                className="inline-flex items-center text-[12px] font-semibold rounded-full px-2.5 py-0.5"
                style={{ backgroundColor: pill.bg, color: pill.color }}
              >
                {statusLabel}
              </span>
            </div>
            <p className="text-[12px] text-text-muted">
              {t('seller.promotions.campaigns.productsSelected', { count: campaign.participation.productIds.length })} · {t('seller.promotions.campaigns.yourDiscount', { value: campaign.participation.discountValue })}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isParticipating || campaign.participation?.status === 'upcoming' ? (
            <button
              type="button"
              onClick={onOptIn}
              aria-label={t('seller.promotions.campaigns.optInAria', { name: campaign.name })}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-gold text-white text-[14px] font-semibold hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <Zap size={16} aria-hidden="true" />
              {t('seller.promotions.campaigns.optIn')}
            </button>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-success">
                <Check size={16} aria-hidden="true" />
                {t('seller.promotions.campaigns.optedIn')}
              </span>
              {campaign.participation?.status !== 'live' && campaign.participation?.status !== 'ended' && (
                <button
                  type="button"
                  onClick={onWithdraw}
                  aria-label={t('seller.promotions.campaigns.withdrawAria', { name: campaign.name })}
                  className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-border bg-surface text-[13px] font-semibold text-text-muted hover:text-error hover:border-error/30 transition-colors"
                >
                  {t('seller.promotions.campaigns.withdraw')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ---- Opt-in dialog ----

function OptInDialog({ campaign, t, reduced, onClose, onConfirm }: { campaign: Campaign; t: TT; reduced: boolean; onClose: () => void; onConfirm: (campaignId: string, productIds: string[], discountValue: number) => void }) {
  const { data: productData } = useSellerProducts({})
  const products = productData?.items ?? []
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(campaign.participation?.productIds ?? []))
  const [discount, setDiscount] = useState(String(campaign.participation?.discountValue ?? campaign.minDiscount))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const dv = Number(discount) || 0
  const discountValid = dv >= campaign.minDiscount && dv <= campaign.maxDiscount
  const productValid = selectedIds.size > 0
  const canSubmit = discountValid && productValid && !submitting

  const toggleProduct = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = async () => {
    if (!discountValid) {
      setError(t('seller.promotions.campaigns.discountError', { min: campaign.minDiscount, max: campaign.maxDiscount }))
      return
    }
    if (!productValid) {
      setError(t('seller.promotions.campaigns.noProductsSelected'))
      return
    }
    setError('')
    setSubmitting(true)
    await onConfirm(campaign.id, [...selectedIds], dv)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('seller.promotions.campaigns.optInTitle', { name: campaign.name })}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="relative bg-surface rounded-xl w-full max-w-[520px] max-h-[85vh] overflow-auto shadow-xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border-light px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-text">{t('seller.promotions.campaigns.optInTitle', { name: campaign.name })}</h2>
            <p className="text-[12px] text-text-muted mt-0.5">{t('seller.promotions.campaigns.optInSubtitle')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Discount input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-semibold text-text">{t('seller.promotions.campaigns.discountLabel')}</label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={discount}
                onChange={e => { setDiscount(e.target.value); setError('') }}
                aria-label={t('seller.promotions.campaigns.discountLabel')}
                aria-describedby="discount-hint"
                className={`w-full h-10 px-3 pr-10 rounded-md border bg-surface text-[14px] text-text outline-none transition-colors ${
                  !discountValid && discount ? 'border-error focus:border-error' : 'border-border focus:border-primary'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-text-muted">%</span>
            </div>
            <p id="discount-hint" className={`text-[12px] ${!discountValid && discount ? 'text-error' : 'text-text-muted'}`}>
              {t('seller.promotions.campaigns.discountHint', { min: campaign.minDiscount, max: campaign.maxDiscount })}
            </p>
          </div>

          {/* Product selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-semibold text-text">{t('seller.promotions.campaigns.selectProducts')}</label>
            <p className="text-[12px] text-text-muted">{t('seller.promotions.campaigns.selectProductsHint')}</p>
            <div className="max-h-[240px] overflow-auto rounded-md border border-border-light">
              {products.length === 0 ? (
                <p className="p-4 text-[13px] text-text-muted text-center">No products available.</p>
              ) : (
                products.map(p => {
                  const selected = selectedIds.has(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProduct(p.id)}
                      role="checkbox"
                      aria-checked={selected}
                      aria-label={p.name}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-border-light last:border-b-0 text-left transition-colors ${
                        selected ? 'bg-primary-50' : 'hover:bg-background'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        selected ? 'bg-primary border-primary' : 'border-border'
                      }`}>
                        {selected && <Check size={12} className="text-white" aria-hidden="true" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-text truncate">{p.name}</p>
                        <p className="text-[12px] text-text-muted">{p.categoryName}</p>
                      </div>
                      <span className="text-[14px] font-semibold text-text tabular-nums shrink-0">NPR {p.price.toLocaleString()}</span>
                    </button>
                  )
                })
              )}
            </div>
            <p className="text-[12px] text-text-muted">{t('seller.promotions.campaigns.productsSelected', { count: selectedIds.size })}</p>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="rounded-md border border-error/30 bg-error/5 p-3">
              <p className="text-[13px] font-semibold text-error flex items-center gap-1.5">
                <AlertCircle size={15} aria-hidden="true" />
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-md border border-border bg-background text-[14px] font-semibold text-text hover:bg-surface transition-colors">
              {t('seller.promotions.builder.actionCancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canSubmit}
              aria-label={t('seller.promotions.campaigns.confirmAria', { name: campaign.name })}
              className="h-10 px-5 rounded-md bg-gold text-white text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {submitting ? '…' : t('seller.promotions.campaigns.confirm')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ---- Withdraw dialog ----

function WithdrawDialog({ campaign, t, reduced, onClose, onConfirm }: { campaign: Campaign; t: TT; reduced: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={t('seller.promotions.campaigns.withdrawConfirm')}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="relative bg-surface rounded-xl p-5 w-full max-w-[400px] shadow-xl"
      >
        <h2 className="text-[18px] font-semibold text-text mb-2">{t('seller.promotions.campaigns.withdrawConfirm')}</h2>
        <p className="text-[14px] text-text-muted leading-5 mb-5">{t('seller.promotions.campaigns.withdrawConfirmBody')}</p>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 h-10 rounded-md border border-border bg-background text-[14px] font-semibold text-text hover:bg-surface transition-colors">
            {t('seller.promotions.builder.actionCancel')}
          </button>
          <button type="button" onClick={onConfirm} className="px-4 h-10 rounded-md bg-error text-white text-[14px] font-semibold hover:opacity-90 transition-opacity">
            {t('seller.promotions.campaigns.withdrawConfirmBtn')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
