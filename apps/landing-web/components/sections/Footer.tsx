'use client'

import Image from 'next/image'
import { Twitter, Instagram, Facebook, Linkedin } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'
import { cn } from '@/lib/utils'

const socialIcons: Record<string, React.ElementType> = {
  Twitter,
  Instagram,
  Facebook,
  LinkedIn: Linkedin,
}

export function Footer() {
  const { locale } = useLocale()
  const t = landingContent[locale].footer

  return (
    <footer className="bg-text text-white" role="contentinfo">
      <div className="container mx-auto px-4 md:px-6 max-w-[1280px] py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/chinooz-logo.png"
              alt="Chinooz"
              width={120}
              height={36}
              className="h-8 w-auto object-contain brightness-0 invert mb-4"
            />
            <p
              className={cn(
                'text-white/50 text-sm leading-relaxed',
                locale === 'ne' && 'font-devanagari'
              )}
            >
              {t.tagline}
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3 mt-6">
              {t.social.map((name) => {
                const Icon = socialIcons[name]
                if (!Icon) return null
                return (
                  <a
                    key={name}
                    href="#"
                    className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-primary transition-colors duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={`Follow us on ${name}`}
                  >
                    <Icon size={16} aria-hidden="true" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Links */}
          {Object.entries(t.links).map(([key, section]) => (
            <div key={key}>
              <h3
                className={cn(
                  'font-semibold text-white text-sm mb-4',
                  locale === 'ne' && 'font-devanagari'
                )}
              >
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.items.map((item: string) => (
                  <li key={item}>
                    <a
                      href="#"
                      className={cn(
                        'text-white/50 text-sm hover:text-white transition-colors duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded',
                        locale === 'ne' && 'font-devanagari'
                      )}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p
            className={cn(
              'text-white/40 text-caption',
              locale === 'ne' && 'font-devanagari'
            )}
          >
            {t.copyright}
          </p>
          <p className="text-white/40 text-caption">{t.madeIn}</p>
        </div>
      </div>
    </footer>
  )
}
