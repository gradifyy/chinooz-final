'use client'

import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useRequestReturn } from '@chinooz/hooks'
import Modal from '@chinooz/ui-web/Modal'
import type { CartItem, CancelReason } from '@chinooz/types'

const REASONS: { key: CancelReason; labelKey: string }[] = [
  { key: 'changed_mind', labelKey: 'orderActions.reasonChangedMind' },
  { key: 'cheaper_elsewhere', labelKey: 'orderActions.reasonCheaperElsewhere' },
  { key: 'ordered_by_mistake', labelKey: 'orderActions.reasonOrderedByMistake' },
  { key: 'other', labelKey: 'orderActions.reasonOther' },
]

interface ReturnRequestModalProps {
  visible: boolean
  orderId: string
  items: CartItem[]
  onClose: () => void
  onSuccess: () => void
}

export default function ReturnRequestModal({
  visible,
  orderId,
  items,
  onClose,
  onSuccess,
}: ReturnRequestModalProps) {
  const { t } = useTranslation()
  const requestReturn = useRequestReturn()
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null)
  const [reasonDetail, setReasonDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setError(null)
  }, [])

  const handleReturn = useCallback(async () => {
    if (selectedItems.size === 0) {
      setError(t('orderActions.selectAtLeastOne'))
      return
    }
    if (!selectedReason) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await requestReturn.mutateAsync({
        orderId,
        itemIds: [...selectedItems],
        reason: selectedReason,
        reasonDetail: reasonDetail.trim() || undefined,
      })
      if (result.success) {
        setSelectedItems(new Set())
        setSelectedReason(null)
        setReasonDetail('')
        onSuccess()
        onClose()
      }
    } catch {
      setError(t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }, [selectedItems, selectedReason, reasonDetail, orderId, requestReturn, onSuccess, onClose, t])

  const handleClose = useCallback(() => {
    setSelectedItems(new Set())
    setSelectedReason(null)
    setReasonDetail('')
    setError(null)
    onClose()
  }, [onClose])

  return (
    <Modal visible={visible} onClose={handleClose} title={t('orderActions.returnConfirmTitle')}>
      <p className="text-sm text-text-muted mb-4 leading-relaxed">
        {t('orderActions.returnConfirmMsg')}
      </p>

      {/* Item selection */}
      <h4 className="text-base font-semibold text-text mb-3">
        {t('orderActions.selectItems')}
      </h4>

      <div className="space-y-2 mb-4">
        {items.map(item => {
          const isSelected = selectedItems.has(item.id)
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-[1.5px] transition-colors text-left ${
                isSelected
                  ? 'bg-primary-50 border-primary'
                  : 'bg-surface border-border hover:border-primary/50'
              }`}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${item.name}, ${formatNPR(item.price * item.quantity)}`}
            >
              {/* Checkbox */}
              <div
                className={`w-[22px] h-[22px] rounded flex items-center justify-center flex-shrink-0 border-2 ${
                  isSelected
                    ? 'bg-primary border-primary'
                    : 'border-border bg-transparent'
                }`}
              >
                {isSelected && (
                  <span className="text-sm text-white font-bold">✓</span>
                )}
              </div>

              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-lg bg-shimmer overflow-hidden flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm text-text truncate">
                  {item.name.split('—')[0]?.trim() || item.name}
                </p>
                <p className="text-xs text-text-muted">
                  {t('orders.quantity')}: {item.quantity}
                </p>
              </div>

              {/* Price */}
              <span className="text-sm font-semibold text-text tabular-nums flex-shrink-0">
                {formatNPR(item.price * item.quantity)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Reason picker */}
      <h4 className="text-base font-semibold text-text mb-3">
        {t('orderActions.selectReason')}
      </h4>

      <div className="space-y-2 mb-4" role="radiogroup" aria-label={t('orderActions.selectReason')}>
        {REASONS.map(reason => {
          const isSelected = selectedReason === reason.key
          return (
            <button
              key={reason.key}
              onClick={() => setSelectedReason(reason.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-[1.5px] transition-colors text-left ${
                isSelected
                  ? 'bg-primary-50 border-primary'
                  : 'bg-surface border-border hover:border-primary/50'
              }`}
              role="radio"
              aria-checked={isSelected}
              aria-label={t(reason.labelKey)}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'border-primary' : 'border-border'
                }`}
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-base text-text">{t(reason.labelKey)}</span>
            </button>
          )
        })}
      </div>

      {/* Other reason text area */}
      {selectedReason === 'other' && (
        <textarea
          value={reasonDetail}
          onChange={e => setReasonDetail(e.target.value)}
          placeholder={t('orderActions.reasonPlaceholder')}
          maxLength={500}
          rows={3}
          className="w-full bg-surface rounded-xl border-[1.5px] border-border px-4 py-3 text-base text-text placeholder-text-tertiary resize-none focus:outline-none focus:border-primary mb-4"
        />
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-error mb-3">{error}</p>
      )}

      {/* Confirm button */}
      <button
        onClick={handleReturn}
        disabled={selectedItems.size === 0 || !selectedReason || submitting}
        className={`w-full h-12 rounded-xl font-bold text-base transition-colors ${
          selectedItems.size === 0 || !selectedReason
            ? 'bg-border text-text-muted cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary-dark'
        }`}
        aria-label={t('orderActions.confirmReturn')}
      >
        {submitting ? '...' : t('orderActions.confirmReturn')}
      </button>
    </Modal>
  )
}
