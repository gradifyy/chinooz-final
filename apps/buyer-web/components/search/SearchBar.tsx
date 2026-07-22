'use client'

import { type KeyboardEvent, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Search, X } from 'lucide-react'
import type { SuggestionItem } from '@chinooz/hooks'
import { Container } from '@chinooz/ui-web'
import { duration } from '@chinooz/theme'

interface SearchBarProps {
  query: string
  onQueryChange: (value: string) => void
  onKeyDown: (e: KeyboardEvent) => void
  inputFocused: boolean
  onFocusChange: (focused: boolean) => void
  showSpinner: boolean
  onClear: () => void
  activeIndex: number
  isTyping: boolean
  suggestionItems: SuggestionItem[]
  t: ReturnType<typeof useTranslation>['t']
  router: ReturnType<typeof useRouter>
  reduced: boolean
  inputRef: RefObject<HTMLInputElement | null>
}

export function SearchBar({
  query,
  onQueryChange,
  onKeyDown,
  inputFocused,
  onFocusChange,
  showSpinner,
  onClear,
  activeIndex,
  isTyping,
  suggestionItems,
  t,
  router,
  reduced,
  inputRef,
}: SearchBarProps) {
  return (
    <div className="sticky top-16 z-sticky bg-surface border-b border-border">
      <Container className="py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label={t('common.back')}
          >
            <ChevronLeft size={20} className="text-text" aria-hidden="true" />
          </button>

          <div
            className={`flex-1 flex items-center bg-surface rounded-lg border h-12 px-3 transition-all duration-200 ${
              inputFocused
                ? 'border-primary border-2 shadow-sm'
                : 'border-border'
            }`}
          >
            <Search size={20} className="text-text-muted mr-2 shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => onFocusChange(true)}
              onBlur={() => onFocusChange(false)}
              placeholder={t('search.inputPlaceholder')}
              aria-label={t('common.search')}
              aria-activedescendant={
                activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
              }
              role="combobox"
              aria-expanded={isTyping && suggestionItems.length > 0}
              aria-controls="search-suggestions-list"
              className="flex-1 text-base font-normal text-text bg-transparent outline-none placeholder:text-text-muted h-full"
            />
            {showSpinner && (
              <svg
                className="animate-spin ml-2 shrink-0 text-primary"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="opacity-25"
                />
                <path
                  d="M14 8a6 6 001-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="opacity-75"
                />
              </svg>
            )}
            <AnimatePresence>
              {query.length > 0 && !showSpinner && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : duration.fast / 1000 }}
                  onClick={onClear}
                  className="shrink-0 p-1 ml-1 rounded-full hover:bg-background transition-colors"
                  aria-label={t('search.clearSearch')}
                  type="button"
                >
                  <X size={18} className="text-text-muted" aria-hidden="true" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={onClear}
            className="shrink-0 text-base font-semibold text-primary hover:text-primary-dark transition-colors hidden sm:block"
            aria-label={t('common.cancel')}
          >
            {t('common.cancel')}
          </button>
        </div>
      </Container>
    </div>
  )
}
