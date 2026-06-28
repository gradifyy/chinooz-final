'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, CheckCircle, AlertCircle, Users } from 'lucide-react'
import { Section, SectionHeader } from '@/components/ui/Section'
import { FadeUp } from '@/components/motion/FadeUp'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'
import { submitWaitlist } from '@/lib/waitlist/submit'
import { trackWaitlistSignup } from '@/lib/analytics'
import { cn } from '@/lib/utils'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function Waitlist() {
  const { locale } = useLocale()
  const t = landingContent[locale].waitlist
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setState('loading')
    setErrorMsg('')

    const result = await submitWaitlist({ email: email.trim(), name: name.trim() || undefined, locale })

    if (result.success) {
      setState('success')
      trackWaitlistSignup(email)
    } else {
      setState('error')
      setErrorMsg(result.message ?? t.error)
    }
  }

  return (
    <Section
      id="waitlist"
      className="bg-plum-gradient relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-gold/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <FadeUp>
          <SectionHeader
            eyebrow={t.eyebrow}
            headline={t.headline}
            body={t.body}
            centered
            light
          />
        </FadeUp>

        {/* Count badge */}
        <FadeUp delay={0.1}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8">
            <Users size={14} aria-hidden="true" />
            <span className={locale === 'ne' ? 'font-devanagari' : ''}>{t.count}</span>
          </div>
        </FadeUp>

        <FadeUp delay={0.2}>
          <AnimatePresence mode="wait">
            {state === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-8"
                role="status"
                aria-live="polite"
              >
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle size={32} className="text-white" aria-hidden="true" />
                </div>
                <p
                  className={cn(
                    'text-h3 font-bold text-white',
                    locale === 'ne' && 'font-devanagari'
                  )}
                >
                  {t.success}
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="flex flex-col gap-3"
                aria-label="Waitlist signup form"
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <label htmlFor="waitlist-name" className="sr-only">
                      {t.namePlaceholder}
                    </label>
                    <input
                      id="waitlist-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      className={cn(
                        'w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all',
                        locale === 'ne' && 'font-devanagari'
                      )}
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <label htmlFor="waitlist-email" className="sr-only">
                      {t.placeholder}
                    </label>
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="waitlist-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.placeholder}
                      className={cn(
                        'w-full pl-11 pr-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all',
                        locale === 'ne' && 'font-devanagari'
                      )}
                      autoComplete="email"
                      aria-describedby={state === 'error' ? 'waitlist-error' : undefined}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={state === 'loading'}
                    className="bg-white text-primary hover:bg-white/90 shrink-0 min-w-[160px]"
                  >
                    <span className={locale === 'ne' ? 'font-devanagari' : ''}>{t.cta}</span>
                  </Button>
                </div>

                {state === 'error' && (
                  <motion.p
                    id="waitlist-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm text-red-300"
                    role="alert"
                    aria-live="assertive"
                  >
                    <AlertCircle size={14} aria-hidden="true" />
                    <span className={locale === 'ne' ? 'font-devanagari' : ''}>{errorMsg || t.error}</span>
                  </motion.p>
                )}

                <p className="text-white/40 text-caption mt-1">
                  <span className={locale === 'ne' ? 'font-devanagari' : ''}>{t.privacy}</span>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </FadeUp>
      </div>
    </Section>
  )
}
