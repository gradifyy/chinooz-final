'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from '@chinooz/ui-web'
import type { Product } from '@chinooz/types'

export interface FilterState {
  priceMin: number
  priceMax: number
  minRating: number
  brands: Set<string>
  inStock: boolean
  onSale: boolean
}

interface FilterPanelProps {
  visible: boolean
  onClose: () => void
  products: Product[]
  filters: FilterState
  onApply: (filters: FilterState) => void
  onReset: () => void
}

const RATING_OPTIONS = [4, 3, 2, 1]

export default function FilterPanel({
  visible,
  onClose,
  products,
  filters,
  onApply,
  onReset,
}: FilterPanelProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const [local, setLocal] = useState<FilterState>(filters)

  const brands = useMemo(() => {
    const set = new Set(products.map(p => p.sellerName))
    return Array.from(set).sort()
  }, [products])

  const priceRange = useMemo(() => {
    if (!products.length) return { min: 0, max: 10000 }
    const prices = products.map(p => p.price)
    return { min: Math.min(...prices), max: Math.max(...prices) }
  }, [products])

  const filteredCount = useMemo(() => {
    return products.filter(p => {
      if (local.inStock && p.stock === 'out_of_stock') return false
      if (local.onSale && (!p.compareAtPrice || p.compareAtPrice <= p.price)) return false
      if (local.minRating > 0 && p.rating < local.minRating) return false
      if (local.brands.size > 0 && !local.brands.has(p.sellerName)) return false
      if (p.price < local.priceMin || p.price > local.priceMax) return false
      return true
    }).length
  }, [products, local])

  const toggleBrand = useCallback((brand: string) => {
    setLocal(prev => {
      const next = new Set(prev.brands)
      if (next.has(brand)) next.delete(brand)
      else next.add(brand)
      return { ...prev, brands: next }
    })
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={reduced ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduced ? undefined : { x: '100%' }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-[400px] max-w-[90vw] bg-background z-50 flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
              <h2 className="text-lg font-semibold text-text">{t('categories.filters')}</h2>
              <div className="flex items-center gap-3">
                <button onClick={onReset} className="text-sm text-text-muted hover:text-text transition-colors">
                  {t('categories.reset')}
                </button>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-background flex items-center justify-center hover:bg-border transition-colors" aria-label="Close">
                  <span className="text-lg text-text-muted">✕</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">
              {/* Price range */}
              <div className="py-3 space-y-2">
                <h3 className="text-base font-semibold text-text">{t('categories.priceRange')}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text tabular-nums">{formatNPR(local.priceMin)}</span>
                  <span className="text-sm text-text-muted">—</span>
                  <span className="text-sm font-semibold text-text tabular-nums">{formatNPR(local.priceMax)}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { label: 'Under 500', min: 0, max: 500 },
                    { label: '500–2000', min: 500, max: 2000 },
                    { label: '2000–5000', min: 2000, max: 5000 },
                    { label: '5000+', min: 5000, max: 999999 },
                  ].map(range => (
                    <button
                      key={range.label}
                      onClick={() => setLocal(prev => ({ ...prev, priceMin: range.min, priceMax: range.max }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        local.priceMin === range.min && local.priceMax === range.max
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-border bg-surface text-text'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-border-light" />

              {/* Rating */}
              <div className="py-3 space-y-2">
                <h3 className="text-base font-semibold text-text">{t('categories.rating')}</h3>
                <div className="flex flex-wrap gap-2">
                  {RATING_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setLocal(prev => ({ ...prev, minRating: prev.minRating === r ? 0 : r }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        local.minRating === r
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-border bg-surface text-text-muted'
                      }`}
                    >
                      {'★'.repeat(r)}{'☆'.repeat(5 - r)}+
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-border-light" />

              {/* Brand/Seller */}
              <div className="py-3 space-y-2">
                <h3 className="text-base font-semibold text-text">{t('categories.brand')}</h3>
                <div className="space-y-1">
                  {brands.map(brand => (
                    <button
                      key={brand}
                      onClick={() => toggleBrand(brand)}
                      className="flex items-center gap-2 w-full py-2 text-left hover:bg-background rounded transition-colors"
                    >
                      <div className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors ${
                        local.brands.has(brand) ? 'border-primary bg-primary' : 'border-border'
                      }`}>
                        {local.brands.has(brand) && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <span className="text-sm text-text">{brand}</span>
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-border-light" />

              {/* Availability + On Sale */}
              <div className="py-3 space-y-1">
                <h3 className="text-base font-semibold text-text mb-1">{t('categories.availability')}</h3>
                <button
                  onClick={() => setLocal(prev => ({ ...prev, inStock: !prev.inStock }))}
                  className="flex items-center gap-2 w-full py-2 text-left hover:bg-background rounded transition-colors"
                >
                  <div className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors ${
                    local.inStock ? 'border-primary bg-primary' : 'border-border'
                  }`}>
                    {local.inStock && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="text-sm text-text">{t('categories.inStock')}</span>
                </button>
                <button
                  onClick={() => setLocal(prev => ({ ...prev, onSale: !prev.onSale }))}
                  className="flex items-center gap-2 w-full py-2 text-left hover:bg-background rounded transition-colors"
                >
                  <div className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors ${
                    local.onSale ? 'border-primary bg-primary' : 'border-border'
                  }`}>
                    {local.onSale && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="text-sm text-text">{t('categories.onSale')}</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border-light">
              <button
                onClick={() => onApply(local)}
                className="w-full bg-primary text-white h-12 rounded-md font-semibold text-base hover:bg-primary-dark transition-colors"
              >
                {t('categories.filterResults', { count: filteredCount })}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
