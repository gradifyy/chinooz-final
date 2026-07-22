'use client'

import { type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { SuggestionItem } from '@chinooz/hooks'
import SafeImage from '@chinooz/ui-web/SafeImage'
import { formatNPR } from '@chinooz/utils'
import {
  webMotion,
  HighlightText,
} from '@/components/search/SearchHelpers'

interface SearchSuggestionsProps {
  suggestionItems: SuggestionItem[]
  suggestionsFetching: boolean
  actionableItems: SuggestionItem[]
  onSuggestionPress: (item: SuggestionItem) => void
  hoveredRow: string | null
  setHoveredRow: (row: string | null) => void
  activeIndex: number
  setActiveIndex: (index: number) => void
  debouncedQuery: string
  t: ReturnType<typeof useTranslation>['t']
  m: ReturnType<typeof webMotion>
  reduced: boolean
  HighlightText: typeof HighlightText
  listRef: RefObject<HTMLDivElement | null>
}

export function SearchSuggestions({
  suggestionItems,
  suggestionsFetching,
  actionableItems,
  onSuggestionPress,
  setHoveredRow,
  activeIndex,
  setActiveIndex,
  debouncedQuery,
  t,
  m,
  reduced,
  HighlightText,
  listRef,
}: SearchSuggestionsProps) {
  const renderSuggestionRow = (item: SuggestionItem, index: number, actionIndex: number) => {
    if (item.type === 'label') {
      return (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={m.staggerItem(index)}
          className="px-4 pt-4 pb-2"
        >
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
            {t(`search.suggestionLabel_${item.label}`, { defaultValue: item.label.toUpperCase() })}
          </span>
        </motion.div>
      )
    }

    const isActive = actionIndex === activeIndex
    const rowId = `suggestion-${actionIndex}`

    if (item.type === 'product') {
      const p = item.product
      return (
        <motion.div
          key={item.key}
          data-suggestion-index={actionIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={m.staggerItem(index)}
        >
          <button
            id={rowId}
            onClick={() => onSuggestionPress(item)}
            onMouseEnter={() => {
              setHoveredRow(item.key)
              setActiveIndex(actionIndex)
            }}
            onMouseLeave={() => setHoveredRow(null)}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
              isActive ? 'bg-primary-50' : 'hover:bg-background'
            }`}
            aria-label={`${p.name}, ${formatNPR(p.price)}`}
          >
            <SafeImage
              src={p.images?.[0]?.uri}
              alt={p.name}
              className="w-10 h-10 rounded-lg object-cover bg-shimmer shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-base font-normal text-text truncate">
                <HighlightText text={p.name} query={debouncedQuery} />
              </p>
              <p className="text-sm font-semibold text-muted tabular-nums">
                {formatNPR(p.price)}
              </p>
            </div>
          </button>
        </motion.div>
      )
    }

    if (item.type === 'category') {
      const c = item.category
      return (
        <motion.div
          key={item.key}
          data-suggestion-index={actionIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={m.staggerItem(index)}
        >
          <button
            id={rowId}
            onClick={() => onSuggestionPress(item)}
            onMouseEnter={() => {
              setHoveredRow(item.key)
              setActiveIndex(actionIndex)
            }}
            onMouseLeave={() => setHoveredRow(null)}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
              isActive ? 'bg-primary-50' : 'hover:bg-background'
            }`}
            aria-label={c.name}
          >
            <span className="text-base text-text-muted w-10 text-center shrink-0">{c.icon}</span>
            <p className="text-base font-normal text-text truncate">
              <HighlightText text={c.name} query={debouncedQuery} />
            </p>
          </button>
        </motion.div>
      )
    }

    if (item.type === 'brand') {
      const b = item.brand
      return (
        <motion.div
          key={item.key}
          data-suggestion-index={actionIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={m.staggerItem(index)}
        >
          <button
            id={rowId}
            onClick={() => onSuggestionPress(item)}
            onMouseEnter={() => {
              setHoveredRow(item.key)
              setActiveIndex(actionIndex)
            }}
            onMouseLeave={() => setHoveredRow(null)}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
              isActive ? 'bg-primary-50' : 'hover:bg-background'
            }`}
            aria-label={b.name}
          >
            <span className="text-base w-10 text-center shrink-0">{'\u{1F3EA}'}</span>
            <p className="text-base font-normal text-text truncate">
              <HighlightText text={b.name} query={debouncedQuery} />
            </p>
          </button>
        </motion.div>
      )
    }

    return null
  }

  return (
    <motion.div
      key="typeahead"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={m.fadeIn()}
    >
      {suggestionsFetching && suggestionItems.length === 0 ? (
        <div className="space-y-0" aria-busy="true" aria-label={t('search.loadingSuggestions')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={m.staggerItem(i)}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="w-10 h-10 rounded-lg bg-border animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-border rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-border rounded w-2/5 animate-pulse" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : suggestionItems.length > 0 ? (
        <div
          ref={listRef}
          id="search-suggestions-list"
          role="listbox"
          aria-label={t('search.suggestionsFor', { query: debouncedQuery })}
        >
          {suggestionItems.map((item, index) => {
            const actionIndex =
              item.type !== 'label'
                ? actionableItems.indexOf(item)
                : -1
            return renderSuggestionRow(item, index, actionIndex)
          })}
        </div>
      ) : !suggestionsFetching ? (
        <p className="text-sm text-text-muted py-6">{t('search.noResults')}</p>
      ) : null}
    </motion.div>
  )
}
