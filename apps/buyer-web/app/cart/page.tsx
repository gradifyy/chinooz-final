'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Container,
  Screen,
  QuantityStepper,
  CartSummary,
  SafeImage,
  useReducedMotion,
} from '@chinooz/ui-web'
import { formatNPR, MAX_QTY, groupBySeller, getInitials } from '@chinooz/utils'
import { useCartStore, useWishlistStore, useCheckoutStore } from '@chinooz/state'
import { useProductsByIds } from '@chinooz/hooks'
import EmptyCart from '@/components/EmptyCart'
import type { CartItem, Product } from '@chinooz/types'

function SavedForLater({
  products,
  onMoveToCart,
  onRemove,
}: {
  products: Product[] | undefined
  onMoveToCart: (productId: string) => void
  onRemove: (productId: string) => void
}) {
  const { t } = useTranslation()
  if (!products || products.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="text-base font-semibold text-text mb-3">
        {t('cart.saveForLater')} ({products.length})
      </h2>
      <div className="space-y-3">
        {products.map(product => (
          <div
            key={product.id}
            className="flex items-center gap-3 py-3 px-1 border-b border-border-light"
          >
            <div className="w-16 h-16 rounded-lg bg-border overflow-hidden shrink-0 flex items-center justify-center">
              <SafeImage
                src={product.images?.[0]?.uri}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">{product.name}</p>
              <p className="text-base font-bold text-text tabular-nums mt-0.5">
                {formatNPR(product.price)}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  onClick={() => onMoveToCart(product.id)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  {t('wishlist.addToCart')}
                </button>
                <button
                  onClick={() => onRemove(product.id)}
                  className="text-xs text-error font-medium hover:underline"
                >
                  {t('cart.remove')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CartPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const items = useCartStore(s => s.items)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const removeItem = useCartStore(s => s.removeItem)
  const addItem = useCartStore(s => s.addItem)
  const wishlistAdd = useWishlistStore(s => s.add)
  const wishlistRemove = useWishlistStore(s => s.remove)
  const wishlistEntries = useWishlistStore(s => s.entries)

  const [selected, setSelected] = useState<Set<string>>(new Set(items.map(i => i.id)))
  // Promo lives in the checkout store so the discount persists through checkout
  // and is applied to the placed order (the cart summary writes to it).
  const coupon = useCheckoutStore(s => s.coupon)
  const setCoupon = useCheckoutStore(s => s.setCoupon)
  const setSelectedIds = useCheckoutStore(s => s.setSelectedIds)

  // Save-for-later: items the buyer moved out of the active cart into the wishlist.
  const savedIds = useMemo(() => wishlistEntries.map(e => e.productId), [wishlistEntries])
  const { data: savedProducts } = useProductsByIds(savedIds)

  const handleSaveForLater = useCallback(
    (item: CartItem) => {
      wishlistAdd(item.productId)
      removeItem(item.id)
    },
    [wishlistAdd, removeItem],
  )

  const handleMoveToCart = useCallback(
    (productId: string) => {
      const product = savedProducts?.find(p => p.id === productId)
      if (!product) return
      addItem({
        id: `ci-${product.id}`,
        productId: product.id,
        name: product.name,
        image: product.images?.[0]?.uri ?? '',
        price: product.price,
        quantity: 1,
        maxQuantity: MAX_QTY,
      })
      wishlistRemove(productId)
    },
    [savedProducts, addItem, wishlistRemove],
  )

  const sellerGroups = useMemo(() => groupBySeller(items), [items])
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const selectedItems = items.filter(i => selected.has(i.id))
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
          <EmptyCart />
          <SavedForLater
            products={savedProducts}
            onMoveToCart={handleMoveToCart}
            onRemove={wishlistRemove}
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
            {allSelected ? '✓ ' : ''}
            {t('cart.selectAll')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Items list */}
          <div className="lg:col-span-3 space-y-4">
            {Array.from(sellerGroups.entries()).map(([seller, sellerItems]) => {
              const allSellerSelected = sellerItems.every(i => selected.has(i.id))
              return (
                <div key={seller}>
                  {/* Seller header */}
                  <div className="flex items-center gap-2 py-2 px-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={allSellerSelected}
                      onClick={() => toggleSeller(sellerItems)}
                      className="min-touch flex items-center justify-center -m-3 shrink-0"
                      aria-label={t('cart.selectFromSeller', { seller })}
                    >
                      <span
                        className={`w-5 h-5 rounded border-medium flex items-center justify-center transition-colors ${
                          allSellerSelected
                            ? 'border-primary bg-primary'
                            : 'border-border bg-transparent'
                        }`}
                      >
                        {allSellerSelected && (
                          <span className="text-white text-xs font-bold">✓</span>
                        )}
                      </span>
                    </button>
                    <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{getInitials(seller)}</span>
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
                        type="button"
                        role="checkbox"
                        aria-checked={selected.has(item.id)}
                        onClick={() => toggleItem(item.id)}
                        className="min-touch flex items-center justify-center shrink-0 -ml-3"
                        aria-label={t('cart.selectItem', { name: item.name })}
                      >
                        <span
                          className={`w-5 h-5 rounded border-medium flex items-center justify-center transition-colors ${
                            selected.has(item.id)
                              ? 'border-primary bg-primary'
                              : 'border-border bg-transparent'
                          }`}
                        >
                          {selected.has(item.id) && (
                            <span className="text-white text-xs font-bold">✓</span>
                          )}
                        </span>
                      </button>

                      <div className="w-16 h-16 rounded-lg bg-border overflow-hidden shrink-0 flex items-center justify-center">
                        <SafeImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{item.name}</p>
                        <p className="text-base font-bold text-text tabular-nums mt-0.5">
                          {formatNPR(item.price)}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <QuantityStepper
                            value={item.quantity}
                            min={1}
                            max={item.maxQuantity}
                            onChange={qty => updateQuantity(item.id, qty)}
                          />
                          <button
                            onClick={() => handleSaveForLater(item)}
                            className="text-xs text-primary font-medium ml-auto hover:underline"
                          >
                            {t('cart.saveForLater')}
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-error font-medium hover:underline"
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
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24 space-y-4 p-4 border border-border rounded-xl bg-surface">
              <h2 className="text-base font-semibold text-text">{t('cart.summary')}</h2>

              <CartSummary
                items={selectedItems}
                sellerGroups={sellerGroups}
                promo={coupon}
                onPromoChange={setCoupon}
              />

              <motion.button
                onClick={() => {
                  setSelectedIds(selectedItems.map(i => i.id))
                  router.push('/checkout')
                }}
                disabled={selectedItems.length === 0}
                whileHover={reduced || selectedItems.length === 0 ? {} : { scale: 1.02 }}
                whileTap={reduced || selectedItems.length === 0 ? {} : { scale: 0.97 }}
                className="w-full bg-primary text-white h-12 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
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

        <SavedForLater
          products={savedProducts}
          onMoveToCart={handleMoveToCart}
          onRemove={wishlistRemove}
        />
      </Container>
    </Screen>
  )
}
