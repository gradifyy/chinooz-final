'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'
import { formatNPR } from '@chinooz/utils'
import { getProducts } from '@chinooz/mock-data'
import { useWishlistStore, useCartStore, useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { duration } from '@chinooz/theme'
import SafeImage from '@chinooz/ui-web/SafeImage'
import { WishlistGridSkeleton } from '../../components/skeletons/ProfileSkeletons'
import type { Product } from '@chinooz/types'

type SortKey = 'recent' | 'price_asc' | 'price_desc'

const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: 'recent', labelKey: 'wishlist.recentlyAdded' },
  { key: 'price_asc', labelKey: 'wishlist.priceLowHigh' },
  { key: 'price_desc', labelKey: 'wishlist.priceHighLow' },
]

function WishlistCard({
  product,
  onRemove,
  onAddToCart,
  onPress,
  index,
  reduced,
}: {
  product: Product
  onRemove: () => void
  onAddToCart: () => void
  onPress: () => void
  index: number
  reduced: boolean
}) {
  const { t } = useTranslation()
  const isOOS = product.stock === 'out_of_stock'
  const hasDiscount = product.compareAtPrice != null && product.compareAtPrice > product.price
  const imageUri = product.images?.[0]?.uri

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, overflow: 'hidden' }}
      transition={reduced ? { duration: 0 } : {
        duration: duration.normal / 1000,
        delay: Math.min(index, 10) * 0.05,
      }}
      className="relative"
    >
      <div
        className={`bg-surface rounded-xl overflow-hidden shadow-sm ${isOOS ? 'opacity-60' : ''}`}
      >
        <button
          onClick={onPress}
          className="w-full text-left"
          aria-label={`${product.name}, ${formatNPR(product.price)}`}
        >
          <div className="relative w-full aspect-square">
            <SafeImage
              src={imageUri}
              alt={product.name}
              className={`w-full h-full object-cover ${isOOS ? 'opacity-50' : ''}`}
            />
            {hasDiscount && (
              <span className="absolute top-2 left-2 bg-gold text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                -{Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)}%
              </span>
            )}
            {isOOS && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-text-muted text-white text-xs font-semibold px-3 py-1 rounded-full">
                {t('wishlist.outOfStock')}
              </div>
            )}
            <motion.button
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              whileTap={reduced ? {} : { scale: 1.3 }}
              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center"
              aria-label={t('wishlist.removeFromWishlist')}
            >
              <span className="text-lg text-error">♥</span>
            </motion.button>
          </div>

          <div className="p-3 space-y-1">
            <p className="text-[13px] font-medium text-text leading-[18px] line-clamp-2 min-h-[36px]">
              {product.name}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold text-text tabular-nums">
                {formatNPR(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-text-muted line-through">
                  {formatNPR(product.compareAtPrice!)}
                </span>
              )}
            </div>
          </div>
        </button>

        {!isOOS && (
          <div className="px-3 pb-3">
            <motion.button
              onClick={(e) => { e.stopPropagation(); onAddToCart() }}
              whileHover={reduced ? {} : { scale: 1.02 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              className="w-full h-9 rounded-lg border-[1.5px] border-primary text-primary text-[13px] font-semibold hover:bg-primary-50 transition-colors"
              aria-label={`${t('wishlist.addToCart')} ${product.name}`}
            >
              {t('wishlist.addToCart')}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function WishlistPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)

  const entries = useWishlistStore(s => s.entries)
  const removeEntry = useWishlistStore(s => s.remove)
  const addToCart = useCartStore(s => s.addItem)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [showSort, setShowSort] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/phone-entry')
    }
  }, [isLoggedIn])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const { items } = await getProducts()
        if (!cancelled) {
          const ids = new Set(entries.map(e => e.productId))
          setProducts(items.filter(p => ids.has(p.id)))
        }
      } catch {
        if (!cancelled) { setProducts([]); setError(true) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [entries])

  const sorted = useMemo(() => {
    const list = [...products]
    if (sortKey === 'price_asc') list.sort((a, b) => a.price - b.price)
    else if (sortKey === 'price_desc') list.sort((a, b) => b.price - a.price)
    else {
      const orderMap = new Map(entries.map((e, i) => [e.productId, i]))
      list.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
    }
    return list
  }, [products, sortKey, entries])

  const handleRemove = useCallback((productId: string) => {
    removeEntry(productId)
  }, [removeEntry])

  const handleAddToCart = useCallback((product: Product) => {
    addToCart({
      id: `ci-${product.id}`,
      productId: product.id,
      variantId: product.variants?.[0]?.id,
      name: product.name,
      image: product.images?.[0]?.uri ?? '',
      price: product.price,
      quantity: 1,
      maxQuantity: 10,
    })
  }, [addToCart])

  if (!isLoggedIn) return null

  return (
    <Screen>
      <Container className="py-6 max-w-[1200px]">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label={t('common.back')}
          >
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('wishlist.title')}</h1>
        </div>

        {loading ? (
          <div aria-busy="true" aria-label={t('common.loadingWishlist')}>
            <WishlistGridSkeleton />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-5xl mb-2">😕</span>
            <p className="text-lg font-semibold text-text">{t('common.error')}</p>
            <button onClick={() => window.location.reload()} className="mt-2 h-11 px-5 rounded-lg border-[1.5px] border-primary text-primary font-semibold text-sm hover:bg-primary-50 transition-colors" aria-label={t('common.retry')}>
              {t('common.retry')}
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-8"
          >
            <span className="text-5xl mb-4 text-text-tertiary">♡</span>
            <h3 className="text-lg font-semibold text-text text-center">{t('wishlist.emptyTitle')}</h3>
            <p className="text-sm text-text-muted text-center mt-2 max-w-xs">{t('wishlist.emptySubtitle')}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              {t('wishlist.browseProducts')}
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-text-muted font-medium">
                {t('wishlist.itemsCount', { count: sorted.length })}
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowSort(!showSort)}
                  className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
                  aria-label={t('wishlist.sortBy')}
                >
                  {t('wishlist.sortBy')}
                  <span className="text-xs">{showSort ? '▴' : '▾'}</span>
                </button>
                {showSort && (
                  <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl border border-border-light shadow-lg overflow-hidden z-10 min-w-[160px]">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortKey(opt.key); setShowSort(false) }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-background transition-colors ${
                          sortKey === opt.key ? 'text-primary font-semibold bg-primary-50' : 'text-text'
                        }`}
                      >
                        {t(opt.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {sorted.map((product, index) => (
                  <WishlistCard
                    key={product.id}
                    product={product}
                    index={index}
                    reduced={reduced}
                    onPress={() => router.push(`/product/${product.id}`)}
                    onRemove={() => handleRemove(product.id)}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </Container>
    </Screen>
  )
}
