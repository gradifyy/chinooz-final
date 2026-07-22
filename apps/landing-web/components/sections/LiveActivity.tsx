'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Activity, ShoppingBag, Bike, Wallet, Store, Package } from 'lucide-react'
import { landingContent } from '@/content/landing'
import type { Locale } from '@/content/landing'
import { cn } from '@/lib/utils'

const typeIcon: Record<string, React.ElementType> = {
  order: ShoppingBag,
  delivery: Bike,
  payment: Wallet,
  seller: Store,
  package: Package,
}

function inferType(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('deliver') || lower.includes('picked') || lower.includes('rider')) return 'delivery'
  if (lower.includes('pay') || lower.includes('khalti') || lower.includes('esewa')) return 'payment'
  if (lower.includes('seller') || lower.includes('onboard') || lower.includes('listed') || lower.includes('product')) return 'seller'
  return 'order'
}

export function LiveActivity({ locale }: { locale: Locale }) {
  const t = landingContent[locale].liveMetrics
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduce) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % t.activity.length)
    }, 2800)
    return () => clearInterval(timer)
  }, [reduce, t.activity.length])

  const current = t.activity[index]
  const Icon = typeIcon[inferType(current)] ?? Activity

  return (
    <div
      className="relative canvas-ink grain border-y border-white/[0.06] py-4 overflow-hidden"
      aria-label="Live marketplace activity"
      role="complementary"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[300px] h-[80px] rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[250px] h-[60px] rounded-full bg-gold/8 blur-[90px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-[1280px] relative z-10">
        <div className="flex items-center justify-center gap-3 md:gap-5">
          {/* Live badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-dark shrink-0">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-liveGreen opacity-75 animate-ping motion-reduce:animate-none" aria-hidden="true" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-liveGreen" aria-hidden="true" />
            </span>
            <span className={cn('text-cream text-caption font-bold tracking-wide uppercase', locale === 'ne' && 'font-devanagari')}>
              Live
            </span>
          </div>

          {/* Activity ticker */}
          <div className="relative h-7 flex-1 max-w-md overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                className="absolute inset-0 flex items-center justify-center gap-2.5"
              >
                <Icon size={14} className="text-gold shrink-0" aria-hidden="true" />
                <span className={cn('text-cream/80 text-sm font-medium truncate', locale === 'ne' && 'font-devanagari')}>
                  {current}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot indicators */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            {t.activity.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1 rounded-full transition-all duration-400',
                  i === index ? 'w-6 bg-gold' : 'w-1 bg-white/20'
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
