'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { MAX_QTY } from '@chinooz/utils'
import { SafeImage } from '@chinooz/ui-web'
import { useCartStore } from '@chinooz/state'
import { useFrequentlyBoughtTogether } from '@chinooz/hooks'
import type { Product } from '@chinooz/types'

export default function FrequentlyBoughtTogether({ productId }: { productId: string }) {
  const { t } = useTranslation()
  const { data } = useFrequentlyBoughtTogether(productId)
  const addItem = useCartStore(s => s.addItem)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState(false)

  // Build the bundle list once data arrives: anchor (always selected) + companions.
  const bundle = useMemo<Product[]>(() => {
    if (!data) return []
    return [data.anchor, ...data.companions]
  }, [data])

  // Default-select all bundle items the first time they load.
  React.useEffect(() => {
    if (bundle.length > 0) setSelected(new Set(bundle.map(p => p.id)))
  }, [bundle])

  const toggle = useCallback((id: string, isAnchor: boolean) => {
    if (isAnchor) return // anchor stays selected
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const total = useMemo(
    () => bundle.filter(p => selected.has(p.id)).reduce((sum, p) => sum + p.price, 0),
    [bundle, selected],
  )
  const selectedCount = bundle.filter(p => selected.has(p.id)).length

  const handleAddBundle = useCallback(() => {
    for (const p of bundle) {
      if (!selected.has(p.id)) continue
      addItem({
        id: `ci-${p.id}`,
        productId: p.id,
        name: p.name,
        image: p.images?.[0]?.uri ?? '',
        price: p.price,
        quantity: 1,
        maxQuantity: MAX_QTY,
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }, [bundle, selected, addItem])

  if (!data || data.companions.length === 0) return null

  return (
    <section aria-label={t('product.fbt.title')}>
      <h2 className="text-lg font-semibold text-text mb-4">{t('product.fbt.title')}</h2>

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Item row with + separators */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {bundle.map((p, i) => {
            const isAnchor = i === 0
            const isSelected = selected.has(p.id)
            return (
              <React.Fragment key={p.id}>
                {i > 0 && <span className="text-2xl text-text-muted shrink-0">+</span>}
                <button
                  onClick={() => toggle(p.id, isAnchor)}
                  className={`relative shrink-0 w-[110px] text-left rounded-xl border p-2 transition-colors ${
                    isSelected ? 'border-primary bg-primary-50/40' : 'border-border bg-surface opacity-60'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={p.name}
                >
                  <div className="absolute top-1 left-1 w-5 h-5 rounded border-medium flex items-center justify-center z-10"
                    style={{ borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)', background: isSelected ? 'var(--color-primary)' : 'transparent' }}
                  >
                    {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <div className="w-full h-[90px] rounded-lg overflow-hidden bg-border mb-1.5">
                    <SafeImage src={p.images?.[0]?.uri} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-text line-clamp-2 leading-tight min-h-[28px]">{p.name}</p>
                  <p className="text-xs font-bold text-text tabular-nums mt-0.5">{formatNPR(p.price)}</p>
                  {isAnchor && (
                    <span className="text-xs font-semibold text-primary">{t('product.fbt.thisItem')}</span>
                  )}
                </button>
              </React.Fragment>
            )
          })}
        </div>

        {/* Total + CTA */}
        <div className="lg:ml-auto shrink-0">
          <p className="text-xs text-text-muted">{t('product.fbt.totalFor', { count: selectedCount })}</p>
          <p className="text-xl font-bold text-text tabular-nums mb-2">{formatNPR(total)}</p>
          <button
            onClick={handleAddBundle}
            disabled={selectedCount === 0}
            className="w-full lg:w-auto px-6 bg-primary text-white h-11 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-primary-dark transition-colors"
          >
            {added ? `✓ ${t('product.addedToCart')}` : t('product.fbt.addBundle', { count: selectedCount })}
          </button>
        </div>
      </div>
    </section>
  )
}
