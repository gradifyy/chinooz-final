'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'
import type { ProductImage } from '@chinooz/types'

const SPRING = { type: 'spring' as const, damping: 20, stiffness: 300, mass: 0.8 }

interface ImageGalleryProps {
  images: ProductImage[]
  onIndexChange?: (index: number) => void
  productId?: string
}

export default function ImageGallery({ images, onIndexChange, productId }: ImageGalleryProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  const handleSelect = useCallback((idx: number) => {
    setActiveIndex(idx)
    onIndexChange?.(idx)
  }, [onIndexChange])

  const handlePrev = useCallback(() => {
    handleSelect(Math.max(0, activeIndex - 1))
  }, [activeIndex, handleSelect])

  const handleNext = useCallback(() => {
    handleSelect(Math.min(images.length - 1, activeIndex + 1))
  }, [activeIndex, images.length, handleSelect])

  const openLightbox = useCallback(() => {
    setLightboxOpen(true)
    setZoomed(false)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    setZoomed(false)
  }, [])

  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen, closeLightbox, handlePrev, handleNext])

  const sharedId = productId ? `product-image-${productId}` : undefined

  if (!images.length) {
    return (
      <div className="aspect-square bg-border rounded-2xl flex items-center justify-center">
        <span className="text-6xl">📦</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main gallery */}
      <div className="relative">
        <div className="aspect-square bg-border rounded-2xl overflow-hidden relative">
          <motion.div
            layoutId={sharedId}
            className="w-full h-full"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={reduced ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0, x: -20 }}
                transition={reduced ? { duration: 0 } : SPRING}
                className="absolute inset-0 flex items-center justify-center cursor-zoom-in"
                onClick={openLightbox}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">📦</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                disabled={activeIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center disabled:opacity-30 hover:bg-white transition-colors z-10"
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                onClick={handleNext}
                disabled={activeIndex === images.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center disabled:opacity-30 hover:bg-white transition-colors z-10"
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-medium px-3 py-1 rounded-full z-10">
              {t('product.imageCount', { current: activeIndex + 1, total: images.length })}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail strip — vertical on md+, horizontal on mobile */}
      {images.length > 1 && (
        <>
          {/* Mobile: horizontal */}
          <div className="flex md:hidden gap-2 overflow-x-auto scrollbar-none">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === activeIndex ? 'border-primary' : 'border-transparent hover:border-border'
                }`}
              >
                <div className="w-full h-full bg-border flex items-center justify-center">
                  <span className="text-base">📦</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop: vertical strip on left */}
          <div className="hidden md:flex flex-col gap-2 absolute left-0 top-0 -ml-[72px]">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === activeIndex ? 'border-primary' : 'border-transparent hover:border-border'
                }`}
              >
                <div className="w-full h-full bg-border flex items-center justify-center">
                  <span className="text-base">📦</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Lightbox overlay */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl hover:bg-white/30 transition-colors z-10"
              aria-label={t('product.closeGallery')}
            >
              ✕
            </button>

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrev() }}
                  disabled={activeIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl disabled:opacity-30 hover:bg-white/30 transition-colors z-10"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext() }}
                  disabled={activeIndex === images.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl disabled:opacity-30 hover:bg-white/30 transition-colors z-10"
                >
                  ›
                </button>
              </>
            )}

            <motion.div
              initial={reduced ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduced ? undefined : { scale: 0.9, opacity: 0 }}
              transition={reduced ? { duration: 0 } : SPRING}
              className="max-w-[80vw] max-h-[80vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ scale: zoomed ? 2 : 1 }}
                transition={SPRING}
                className="cursor-zoom-in"
                onClick={() => setZoomed(!zoomed)}
              >
                <div className="w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] bg-border rounded-2xl flex items-center justify-center">
                  <span className="text-8xl">📦</span>
                </div>
              </motion.div>
            </motion.div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full">
              {t('product.imageCount', { current: activeIndex + 1, total: images.length })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
