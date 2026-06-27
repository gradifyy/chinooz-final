'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, Screen, EmptyState, QuantityStepper } from '@chinooz/ui-web'
import { formatNPR } from '@chinooz/utils'
import { useCartStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import type { CartItem } from '@chinooz/types'

function getInitials(name: string): string {
  return name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2)
}

function groupBySeller(items: CartItem[]): Map<string, CartItem[]> {
  const groups = new Map<string, CartItem[]>()
  for (const item of items) {
    const seller = item.name.split('—')[0]?.trim().split(' ')[0] || 'Other'
    if (!groups.has(seller)) groups.set(seller, [])
    groups.get(seller)!.push(item)
  }
  return groups
}

export default function CartPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const items = useCartStore(s => s.items)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const removeItem = useCartStore(s => s.removeItem)

  const [selected, setSelected] = useState<Set<string>>(new Set(items.map(i => i.id)))

  const sellerGroups = useMemo(() => groupBySeller(items), [items])
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const selectedItems = items.filter(i => selected.has(i.id))
  const selectedTotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const allSelected = items.length > 0 && items.every(i => selected.has(i.id))

  const toggleItem = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(items.map(i => i.id)))
  }, [allSelected, items])

  const toggleSeller = useCallback((sellerItems: CartItem[]) => {
    setSelected(prev => {
      const next = new Set(prev)
      const allSellerSelected = sellerItems.every(i => next.has(i.id))
      for (const item of sellerItems) {
        if (allSellerSelected) next.delete(item.id)
        else next.add(item.id)
      }
      return next
    })
  }, [])

  if (items.length === 0) {
    return (
      <Screen>
        <Container className="py-6">
          <EmptyState
            icon={<span className="text-5xl">🛒</span>}
            title={t('cart.empty')}
            subtitle={t('cart.emptySubtitle')}
            action={{ label: t('cart.startShopping'), onPress: () => router.push('/') }}
          />
        </Container>
      </Screen>
    )
  }

  return (
    <Screen>
      <Container className="py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text">{t('cart.title')}</h1>
            <span className="text-sm text-text-muted">({count})</span>
          </div>
          <button
            onClick={toggleAll}
            className={`text-sm font-semibold ${allSelected ? 'text-primary' : 'text-text-muted'} hover:underline`}
          >
            {allSelected ? '✓ ' : ''}{t('cart.selectAll')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Items list */}
          <div className="md:col-span-3 space-y-4">
            {Array.from(sellerGroups.entries()).map(([seller, sellerItems]) => {
              const allSellerSelected = sellerItems.every(i => selected.has(i.id))
              return (
                <div key={seller}>
                  {/* Seller header */}
                  <div className="flex items-center gap-2 py-2 px-1">
                    <button
                      onClick={() => toggleSeller(sellerItems)}
                      className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors ${
                        allSellerSelected
                          ? 'border-primary bg-primary'
                          : 'border-border bg-transparent'
                      }`}
                      aria-label={t('cart.selectFromSeller', { seller })}
                    >
                      {allSellerSelected && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                    <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">{getInitials(seller)}</span>
                    </div>
                    <span className="text-sm font-semibold text-text">{seller}</span>
                  </div>

                  {/* Items */}
                  {sellerItems.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : i * 0.05 }}
                      className="flex items-center gap-3 py-3 px-1 border-b border-border-light"
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                          selected.has(item.id)
                            ? 'border-primary bg-primary'
                            : 'border-border bg-transparent'
                        }`}
                        aria-label={t('cart.selectItem', { name: item.name })}
                      >
                        {selected.has(item.id) && <span className="text-white text-xs font-bold">✓</span>}
                      </button>

                      <div className="w-16 h-16 rounded-lg bg-border overflow-hidden shrink-0 flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{item.name}</p>
                        <p className="text-base font-bold text-text tabular-nums mt-0.5">{formatNPR(item.price)}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <QuantityStepper
                            value={item.quantity}
                            min={1}
                            max={item.maxQuantity}
                            onChange={(qty) => updateQuantity(item.id, qty)}
                          />
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-error font-medium ml-auto hover:underline"
                          >
                            {t('cart.remove')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Summary panel — sticky on md+ */}
          <div className="md:col-span-2">
            <div className="md:sticky md:top-24 space-y-4 p-4 border border-border rounded-xl bg-surface">
              <h2 className="text-base font-semibold text-text">{t('cart.summary')}</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">{t('cart.subtotal')} ({selectedItems.length})</span>
                  <span className="text-text tabular-nums">{formatNPR(selectedTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">{t('cart.shipping')}</span>
                  <span className="text-success font-semibold">{t('cart.freeShipping')}</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between">
                  <span className="text-base font-semibold text-text">{t('cart.total')}</span>
                  <span className="text-xl font-bold text-text tabular-nums">{formatNPR(selectedTotal)}</span>
                </div>
              </div>

              <motion.button
                onClick={() => router.push('/checkout')}
                disabled={selectedItems.length === 0}
                whileHover={reduced || selectedItems.length === 0 ? {} : { scale: 1.02 }}
                whileTap={reduced || selectedItems.length === 0 ? {} : { scale: 0.97 }}
                className="w-full bg-primary text-white h-13 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
                aria-label={t('cart.checkout')}
                aria-disabled={selectedItems.length === 0}
              >
                {selectedItems.length === 0 ? t('cart.selectAtLeastOne') : t('cart.checkout')}
              </motion.button>

              <p className="text-xs text-text-muted text-center">
                {t('cart.selectedCount', { count: selectedItems.length })}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Screen>
  )
}
