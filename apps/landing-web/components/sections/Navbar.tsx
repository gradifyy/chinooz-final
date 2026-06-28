'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { locale, toggleLocale } = useLocale()
  const t = landingContent[locale].nav

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const navLinks = [
    { label: t.links[0], id: 'how-it-works' },
    { label: t.links[1], id: 'ecosystem' },
    { label: t.links[2], id: 'ecosystem' },
    { label: t.links[3], id: 'ecosystem' },
  ]

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        className={cn(
          'fixed top-0 left-0 right-0 z-[30] transition-all duration-400',
          scrolled
            ? 'bg-white/80 backdrop-blur-md border-b border-border/50 shadow-sm'
            : 'bg-transparent'
        )}
        role="banner"
      >
        <nav
          className="container mx-auto px-4 md:px-6 max-w-[1280px] h-16 md:h-20 flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            aria-label="Chinooz — go to top"
          >
            <Image
              src="/chinooz-logo.png"
              alt="Chinooz"
              width={120}
              height={36}
              className="h-8 w-auto object-contain"
              priority
            />
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.id)}
                className={cn(
                  'text-sm font-medium transition-colors duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded',
                  scrolled ? 'text-text-muted hover:text-primary' : 'text-white/80 hover:text-white'
                )}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={toggleLocale}
              className={cn(
                'hidden md:flex text-xs font-semibold tracking-wide px-3 py-1.5 rounded-full border transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                scrolled
                  ? 'border-border text-text-muted hover:border-primary hover:text-primary'
                  : 'border-white/30 text-white/80 hover:border-white hover:text-white'
              )}
              aria-label={`Switch to ${locale === 'en' ? 'Nepali' : 'English'}`}
            >
              {t.langToggle}
            </button>

            <Button
              variant="primary"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => scrollTo('waitlist')}
            >
              {t.waitlist}
            </Button>

            {/* Mobile menu toggle */}
            <button
              className={cn(
                'md:hidden p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                scrolled ? 'text-text' : 'text-white'
              )}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[25] bg-white pt-20 px-6 flex flex-col gap-6 md:hidden"
          >
            {navLinks.map((link, i) => (
              <motion.button
                key={link.label}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => scrollTo(link.id)}
                className="text-left text-h3 font-semibold text-text border-b border-border pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                {link.label}
              </motion.button>
            ))}
            <div className="flex flex-col gap-3 mt-4">
              <Button variant="primary" size="lg" onClick={() => scrollTo('waitlist')}>
                {t.waitlist}
              </Button>
              <button
                onClick={toggleLocale}
                className="text-center text-sm font-semibold text-text-muted py-3 border border-border rounded-xl"
              >
                {t.langToggle}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
