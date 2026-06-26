'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'

interface DeliverySectionProps {
  sellerName: string
  stock: string
}

export default function DeliverySection({ sellerName, stock }: DeliverySectionProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      {/* Estimated delivery */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
          <span className="text-base">🚚</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text">{t('product.estimatedDelivery')}</p>
          <p className="text-sm text-text-muted">2–4 business days to Kathmandu Valley</p>
        </div>
      </div>

      {/* COD badge */}
      <div className="flex items-center gap-2">
        <span className="inline-block bg-success-light text-success text-xs font-semibold px-2.5 py-1 rounded-full">
          {t('product.codAvailable')}
        </span>
      </div>

      {/* Return policy */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
          <span className="text-base">↩️</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text">{t('product.returnPolicy')}</p>
          <p className="text-sm text-text-muted">{t('product.returnNote')}</p>
        </div>
      </div>
    </div>
  )
}
