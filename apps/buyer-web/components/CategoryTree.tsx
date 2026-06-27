'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'
import { useCategories } from '@chinooz/hooks'
import type { Category } from '@chinooz/types'

function TreeNode({
  cat,
  depth,
  activeId,
  expanded,
  onToggle,
  onSelect,
  reduced,
}: {
  cat: Category
  depth: number
  activeId: string | null
  expanded: Set<string>
  onToggle: (id: string) => void
  onSelect: (cat: Category) => void
  reduced: boolean
}) {
  const hasChildren = cat.children && cat.children.length > 0
  const isOpen = expanded.has(cat.id)
  const isActive = activeId === cat.id

  return (
    <div>
      <button
        onClick={() => {
          onSelect(cat)
          if (hasChildren) onToggle(cat.id)
        }}
        className={`w-full flex items-center gap-2 h-10 text-sm transition-colors ${
          isActive
            ? 'bg-primary text-white font-semibold rounded-lg'
            : 'text-text hover:bg-background'
        }`}
        style={{ paddingLeft: 16 + depth * 16 }}
        aria-expanded={hasChildren ? isOpen : undefined}
      >
        {hasChildren && (
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            className="text-xs text-text-muted mr-1"
          >
            ›
          </motion.span>
        )}
        <span className="mr-2">{cat.icon}</span>
        <span className="flex-1 truncate">{cat.name}</span>
        <span className={`text-xs ${isActive ? 'text-white/70' : 'text-text-muted'}`}>
          {cat.productCount}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            className="overflow-hidden"
          >
            {cat.children!.map(child => (
              <TreeNode
                key={child.id}
                cat={child}
                depth={depth + 1}
                activeId={activeId}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
                reduced={reduced}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CategoryTree() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const { data: categories, isLoading } = useCategories()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const activeCategory = useMemo(() => {
    if (!categories || !activeId) return null
    return categories.find(c => c.id === activeId)
  }, [categories, activeId])

  const activeChildren = useMemo(() => {
    if (!categories) return []
    if (!activeId) return categories.filter(c => c.parentId === null)
    const cat = categories.find(c => c.id === activeId)
    return cat?.children || []
  }, [categories, activeId])

  const handleToggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelect = useCallback((cat: Category) => {
    setActiveId(cat.id)
  }, [])

  const handleViewAll = useCallback(() => {
    if (activeId) {
      router.push(`/search?category=${activeId}`)
    }
  }, [activeId, router])

  if (isLoading) {
    return (
      <div className="flex gap-4">
        <div className="w-[280px] space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-border rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border-light">
              <div className="w-12 h-12 rounded-full bg-border animate-pulse" />
              <div className="w-20 h-3 bg-border rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-0 min-h-[60vh]">
      {/* Sidebar */}
      <motion.div
        animate={{ width: sidebarOpen ? 280 : 64 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-surface border-r border-border overflow-hidden shrink-0"
      >
        <div className="p-3">
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className="w-full flex items-center justify-between h-10 px-2 rounded-lg hover:bg-background transition-colors mb-2"
            aria-label={t('categories.toggleSidebar')}
          >
            {sidebarOpen && (
              <span className="text-sm font-semibold text-text">{t('categories.allCategories')}</span>
            )}
            <motion.span
              animate={{ rotate: sidebarOpen ? 0 : 180 }}
              transition={reduced ? { duration: 0 } : { duration: 0.2 }}
              className="text-text-muted"
            >
              ‹
            </motion.span>
          </button>

          {categories?.map(cat => (
            <TreeNode
              key={cat.id}
              cat={cat}
              depth={0}
              activeId={activeId}
              expanded={expanded}
              onToggle={handleToggle}
              onSelect={handleSelect}
              reduced={reduced}
            />
          ))}
        </div>
      </motion.div>

      {/* Content area */}
      <div className="flex-1 p-4">
        {/* Breadcrumb */}
        {activeId && (
          <div className="flex items-center gap-1 mb-4 text-sm" aria-label={t('categories.breadcrumbPath')}>
            <button
              onClick={() => setActiveId(null)}
              className="text-text-muted hover:text-primary transition-colors"
            >
              {t('categories.allCategories')}
            </button>
            <span className="text-text-muted">›</span>
            <span className="text-primary font-medium">{activeCategory?.name}</span>
          </div>
        )}

        {/* Subcategory grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeChildren.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.25,
                delay: reduced ? 0 : Math.min(i, 9) * 0.05,
              }}
              whileHover={reduced ? {} : { scale: 1.02 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              onClick={() => handleSelect(cat)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border-light shadow-sm hover:shadow-md transition-shadow"
              aria-label={cat.name}
            >
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                <span className="text-2xl">{cat.icon}</span>
              </div>
              <span className="text-sm font-semibold text-text text-center">{cat.name}</span>
              <span className="text-xs text-text-muted">{cat.productCount} items</span>
              {cat.children && cat.children.length > 0 && (
                <span className="text-xs text-primary font-medium">{cat.children.length} subcategories ›</span>
              )}
            </motion.button>
          ))}
        </div>

        {/* View all button */}
        {activeId && (
          <motion.button
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, delay: reduced ? 0 : 0.1 }}
            onClick={handleViewAll}
            className="mt-4 px-4 py-2.5 rounded-md border-[1.5px] border-primary text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            {t('categories.viewAll', { category: activeCategory?.name || t('categories.allCategories') })}
          </motion.button>
        )}
      </div>
    </div>
  )
}
