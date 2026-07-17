import { useMemo, useCallback } from 'react'
import type { ProductVariant } from '@chinooz/types'

export interface VariantGroup {
  key: string
  label: string
  options: {
    value: string
    variantIds: string[]
    available: boolean
  }[]
}

// Product-attribute swatch colors — these map product color *names* (e.g.
// "ice blue", "ocean teal") to the display hex used for the variant swatch.
// They are product data, not @chinooz/theme design tokens, so hard-coded
// hex is intentional here. The theme's semantic tokens (warning/info/success/
// error/primary/gold/cream) cover the brand palette; product attribute colors
// are intentionally outside that system.
// eslint-disable-next-line no-restricted-syntax
export const COLOR_MAP: Record<string, string> = {
  'ice blue': '#A8D8EA',
  navy: '#1B3A5C',
  black: '#1F2937',
  white: '#F9FAFB',
  red: '#DC2626',
  blue: '#2563EB',
  green: '#16A34A',
  gold: '#E0A93B',
  silver: '#9CA3AF',
  cream: '#FEF3C7',
  maroon: '#7F1D1D',
  'natural cream': '#FEF3C7',
  'standard red': '#DC2626',
  'standard blue': '#2563EB',
  'midnight black': '#111827',
  'ocean teal': '#0D9488',
}

export function parseVariantGroups(variants: ProductVariant[]): VariantGroup[] {
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

export function useVariantGroups(
  variants: ProductVariant[],
  options?: { selectedId?: string; onSelect?: (variantId: string) => void },
) {
  const groups = useMemo(() => parseVariantGroups(variants), [variants])
  const selectedId = options?.selectedId
  const onSelect = options?.onSelect

  const selectedVariant = useMemo(
    () => variants.find(v => v.id === selectedId),
    [variants, selectedId],
  )

  const selectedValues = useMemo<Record<string, string>>(() => {
    const vals: Record<string, string> = {}
    if (selectedVariant) {
      for (const [k, v] of Object.entries(selectedVariant.attributes)) {
        vals[k] = v
      }
    }
    return vals
  }, [selectedVariant])

  const isAvailable = selectedVariant ? selectedVariant.stock !== 'out_of_stock' : false

  const toggleValue = useCallback(
    (_groupKey: string, _value: string, variantIds: string[]) => {
      const bestVariant =
        variantIds.find(id => {
          const v = variants.find(v => v.id === id)
          return v && v.stock !== 'out_of_stock'
        }) || variantIds[0]
      onSelect?.(bestVariant)
    },
    [variants, onSelect],
  )

  return {
    groups,
    selectedValues,
    toggleValue,
    selectedVariantId: selectedId ?? '',
    isAvailable,
  }
}
