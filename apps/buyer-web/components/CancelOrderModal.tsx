'use client'

import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useCancelOrder } from '@chinooz/hooks'
import Modal from '@chinooz/ui-web/Modal'
import type { CancelReason } from '@chinooz/types'

const REASONS: { key: CancelReason; labelKey: string }[] = [
  { key: 'changed_mind', labelKey: 'orderActions.reasonChangedMind' },
  { key: 'cheaper_elsewhere', labelKey: 'orderActions.reasonCheaperElsewhere' },
  { key: 'ordered_by_mistake', labelKey: 'orderActions.reasonOrderedByMistake' },
  { key: 'other', labelKey: 'orderActions.reasonOther' },
]

interface CancelOrderModalProps {
  visible: boolean
  orderId: string
  onClose: () => void
  onSuccess: () => void
}

export default function CancelOrderModal({
  visible,
  orderId,
  onClose,
  onSuccess,
}: CancelOrderModalProps) {
  const { t } = useTranslation()
  const cancelOrder = useCancelOrder()
  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null)
  const [reasonDetail, setReasonDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCancel = useCallback(async () => {
    if (!selectedReason) return
    setSubmitting(true)
    try {
      const result = await cancelOrder.mutateAsync({
        orderId,
        reason: selectedReason,
        reasonDetail: reasonDetail.trim() || undefined,
      })
      if (result.success) {
        setSelectedReason(null)
        setReasonDetail('')
        onSuccess()
        onClose()
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }, [selectedReason, reasonDetail, orderId, cancelOrder, onSuccess, onClose])

  const handleClose = useCallback(() => {
    setSelectedReason(null)
    setReasonDetail('')
    onClose()
  }, [onClose])

  return (
    <Modal visible={visible} onClose={handleClose} title={t('orderActions.cancelConfirmTitle')}>
      <p className="text-sm text-text-muted mb-4 leading-relaxed">
        {t('orderActions.cancelConfirmMsg')}
      </p>

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

      {/* Confirm button */}
      <button
        onClick={handleCancel}
        disabled={!selectedReason || submitting}
        className={`w-full h-12 rounded-xl font-bold text-base transition-colors ${
          !selectedReason
            ? 'bg-border text-text-muted cursor-not-allowed'
            : 'bg-error text-white hover:bg-error/90'
        }`}
        aria-label={t('orderActions.confirmCancel')}
      >
        {submitting ? '...' : t('orderActions.confirmCancel')}
      </button>
    </Modal>
  )
}
