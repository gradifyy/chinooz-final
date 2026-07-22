'use client'

import { useState, useEffect, useRef } from 'react'
import { type Easing } from 'framer-motion'
import { duration, easing } from '@chinooz/theme'

export const RECENT_SEARCHES_KEY = 'chinooz_recent_searches'
export const MAX_RECENT = 10
export const DEBOUNCE_MS = 250
export const STAGGER_CAP = 10
export const STAGGER_MS = 0.05

export const SPRING = { type: 'spring' as const, damping: 18, stiffness: 300 }

export function webMotion(reduced: boolean) {
  const D = (ms: number) => reduced ? 0 : ms / 1000
  return {
    fadeIn: (ms = duration.normal) => ({
      duration: D(ms),
      ease: easing.easeOut as Easing,
    }),
    fadeInUp: (ms = duration.normal) => ({
      duration: D(ms),
      ease: reduced ? undefined : (easing.spring as Easing),
    }),
    fadeOut: (ms = duration.fast) => ({
      duration: D(ms),
    }),
    staggerItem: (index: number) => ({
      duration: D(duration.normal),
      delay: reduced ? 0 : Math.min(index, STAGGER_CAP) * STAGGER_MS,
      ease: reduced ? undefined : (easing.spring as Easing),
    }),
    spring: (delay = 0) =>
      reduced
        ? { duration: 0 }
        : { ...SPRING, delay },
  }
}

export const SORT_OPTIONS = [
  { key: 'relevance', labelKey: 'categories.relevance' },
  { key: 'priceLow', labelKey: 'categories.priceLowHigh' },
  { key: 'priceHigh', labelKey: 'categories.priceHighLow' },
  { key: 'rating', labelKey: 'categories.rating' },
  { key: 'newest', labelKey: 'categories.newest' },
  { key: 'popular', labelKey: 'categories.mostPopular' },
]

export const QUICK_FILTERS = [
  { key: 'onSale', labelKey: 'categories.onSale' },
  { key: 'topRated', labelKey: 'categories.topRated' },
  { key: 'inStock', labelKey: 'categories.inStock' },
]

export interface FilterState {
  priceMin: number
  priceMax: number
  minRating: number
  brands: Set<string>
  inStock: boolean
  onSale: boolean
}

export const DEFAULT_FILTERS: FilterState = {
  priceMin: 0,
  priceMax: 999999,
  minRating: 0,
  brands: new Set(),
  inStock: false,
  onSale: false,
}

export function useCountUp(target: number, duration = 200): number {
  const [display, setDisplay] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (target === 0) { setDisplay(0); return }
    const start = display
    const diff = target - start
    if (diff === 0) return
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setDisplay(Math.round(start + diff * progress))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])
  return display
}

export const POPULAR_TERMS = ['Headphones', 'Shoes', 'T-shirt', 'Backpack', 'Watch', 'Sunglasses']

export function getDidYouMean(query: string): string | null {
  if (!query || query.length < 2) return null
  const q = query.normalize('NFC').toLowerCase()
  for (const term of POPULAR_TERMS) {
    const t = term.normalize('NFC').toLowerCase()
    if (t.includes(q) || q.includes(t)) continue
    let diff = 0
    const len = Math.min(q.length, t.length)
    for (let i = 0; i < len; i++) {
      if (q[i] !== t[i]) diff++
    }
    if (diff <= 2 && Math.abs(q.length - t.length) <= 2) return term
  }
  return null
}

export const POPULAR_CATEGORIES = [
  { id: 'cat-electronics', name: 'Electronics', icon: '📱' },
  { id: 'cat-fashion', name: 'Fashion', icon: '👗' },
  { id: 'cat-home', name: 'Home', icon: '🏠' },
  { id: 'cat-beauty', name: 'Beauty', icon: '💄' },
  { id: 'cat-grocery', name: 'Grocery', icon: '🛒' },
  { id: 'cat-sports', name: 'Sports', icon: '⚽' },
]

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter(s => s !== query)
    recent.unshift(query)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch (err) { console.error('Failed to save recent searches', err) }
}

export function removeRecentSearch(term: string) {
  try {
    const recent = getRecentSearches().filter(s => s !== term)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent))
  } catch (err) { console.error('Failed to remove recent search', err) }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch (err) { console.error('Failed to clear recent searches', err) }
}

export function staggerDelay(index: number): number {
  return index < STAGGER_CAP ? index * STAGGER_MS : 0
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const idx = text.normalize('NFC').toLowerCase().indexOf(query.normalize('NFC').toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}
