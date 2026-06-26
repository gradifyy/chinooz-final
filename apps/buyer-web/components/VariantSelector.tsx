'use client'

import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'
import type { ProductVariant } from '@chinooz/types'

const COLOR_MAP: Record<string, string> = {
  'ice blue': '#A8D8EA',
  'navy': '#1B3A5C',
  'black': '#1F2937',
  'white': '#F9FAFB',
  'red': '#DC2626',
  'blue': '#2563EB',
  'green': '#16A34A',
  'gold': '#E0A93B',
  'silver': '#9CA3AF',
  'cream': '#FEF3C7',
  'maroon': '#7F1D1D',
  'natural cream': '#FEF3C7',
  'standard red': '#DC2626',
  'standard blue': '#2563EB',
  'midnight black': '#111827',
  'ocean teal': '#0D9488',
}

interface VariantGroup {
  key: string
  label: string
  options: {
    value: string
    variantIds: string[]
    available: boolean
  }[]
}

function parseVariantGroups(variants: ProductVariant[]): VariantGroup[] {
  const groups = new Map<string, Map<string, string[]>>()

  for (const v of variants) {
    for (const [attrKey, attrValue] of Object.entries(v.attributes)) {
      if (!groups.has(attrKey)) groups.set(attrKey, new Map())
      const values = groups.get(attrKey)!
      if (!values.has(attrValue)) values.set(attrValue, [])
      values.get(attrValue)!.push(v.id)
    }
  }

  return Array.from(groups.entries()).map(([key, values]) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    options: Array.from(values.entries()).map(([value, variantIds]) => ({
      value,
      variantIds,
      available: variantIds.some(id => {
        const v = variants.find(v => v.id === id)
        return v && v.stock !== 'out_of_stock'
      }),
    })),
  }))
}

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedId: string
  onSelect: (variantId: string) => void
  promptError?: string | null
}

export default function VariantSelector({
  variants,
  selectedId,
  onSelect,
  promptError,
}: VariantSelectorProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const groups = useMemo(() => parseVariantGroups(variants), [variants])
  const selectedVariant = variants.find(v => v.id === selectedId)

  const handleGroupSelect = useCallback((groupKey: string, value: string, variantIds: string[]) => {
    const bestVariant = variantIds.find(id => {
      const v = variants.find(v => v.id === id)
      return v && v.stock !== 'out_of_stock'
    }) || variantIds[0]
    onSelect(bestVariant)
  }, [variants, onSelect])

  if (variants.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-text">{t('product.selectVariant')}</h3>

      {groups.map(group => (
        <div key={group.key} className="space-y-2">
          <p className="text-sm text-text-secondary">
            {group.label}
            {selectedVariant?.attributes[group.key] && (
              <span className="text-primary font-semibold ml-1">
                : {selectedVariant.attributes[group.key]}
              </span>
            )}
          </p>

          {group.key === 'color' ? (
            <div className="flex flex-wrap gap-3">
              {group.options.map(opt => {
                const selected = selectedVariant?.attributes[group.key] === opt.value
                const colorHex = COLOR_MAP[opt.value.toLowerCase()] || '#E5E5E5'

                return (
                  <button
                    key={opt.value}
                    onClick={() => handleGroupSelect(group.key, opt.value, opt.variantIds)}
                    disabled={!opt.available}
                    className={`flex flex-col items-center gap-1 min-w-[44px] ${
                      !opt.available ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    aria-label={`${group.label}: ${opt.value}${selected ? `, ${t('product.selected')}` : ''}`}
                    aria-disabled={!opt.available}
                  >
                    <motion.div
                      whileHover={reduced || !opt.available ? {} : { scale: 1.05 }}
                      whileTap={reduced || !opt.available ? {} : { scale: 0.95 }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                        selected ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full"
                        style={{ backgroundColor: colorHex }}
                      />
                    </motion.div>
                    <span className={`text-xs font-medium ${
                      !opt.available ? 'line-through text-text-muted' : 'text-text-muted'
                    }`}>
                      {opt.value}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {group.options.map(opt => {
                const selected = selectedVariant?.attributes[group.key] === opt.value

                return (
                  <motion.button
                    key={opt.value}
                    onClick={() => handleGroupSelect(group.key, opt.value, opt.variantIds)}
                    disabled={!opt.available}
                    whileHover={reduced || !opt.available ? {} : { scale: 1.03 }}
                    whileTap={reduced || !opt.available ? {} : { scale: 0.97 }}
                    className={`min-h-[44px] px-3.5 py-2 rounded-md border-[1.5px] text-sm font-medium transition-colors ${
                      !opt.available
                        ? 'opacity-50 cursor-not-allowed border-border bg-surface text-text-muted line-through'
                        : selected
                          ? 'border-primary bg-primary text-white font-semibold'
                          : 'border-border bg-surface text-text hover:border-primary/30'
                    }`}
                    aria-label={`${group.label}: ${opt.value}${selected ? `, ${t('product.selected')}` : ''}`}
                    aria-disabled={!opt.available}
                  >
                    {opt.value}
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {promptError && (
        <p className="text-sm font-medium text-error">{promptError}</p>
      )}
    </div>
  )
}
