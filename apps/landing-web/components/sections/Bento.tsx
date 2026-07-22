import { Zap, Wallet, Languages, BadgeCheck, MapPin, ShieldCheck } from 'lucide-react'
import { Section, SectionHeader } from '@/components/ui/Section'
import { Reveal } from '@/components/motion/Reveal'
import { landingContent } from '@/content/landing'
import type { Locale } from '@/content/landing'
import { cn } from '@/lib/utils'

export function Bento({ locale }: { locale: Locale }) {
  const t = landingContent[locale].bento

  const tiles: Array<{ key: string; icon: React.ElementType; span: string; accent?: boolean; dark?: boolean; title: string; desc: string }> = [
    { key: 'delivery', icon: Zap, ...t.delivery, span: 'md:col-span-2 md:row-span-2', accent: true },
    { key: 'payment', icon: Wallet, ...t.payment, span: 'md:col-span-1' },
    { key: 'bilingual', icon: Languages, ...t.bilingual, span: 'md:col-span-1' },
    { key: 'verified', icon: BadgeCheck, ...t.verified, span: 'md:col-span-1', dark: true },
    { key: 'tracking', icon: MapPin, ...t.tracking, span: 'md:col-span-1' },
    { key: 'secure', icon: ShieldCheck, ...t.secure, span: 'md:col-span-2' },
  ]

  return (
    <Section id="bento" className="canvas-cream relative overflow-hidden">
      <div className="absolute inset-0 mesh-cream pointer-events-none" aria-hidden="true" />

      <div className="relative z-10">
        <Reveal>
          <SectionHeader
            eyebrow={t.eyebrow}
            headline={t.headline}
            body={t.subtitle}
            centered
          />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mt-4 md:auto-rows-[200px]">
          {tiles.map((tile, i) => {
            const Icon = tile.icon
            return (
              <Reveal key={tile.key} delay={i * 0.08} className={tile.span}>
                <div
                  className={cn(
                    'group h-full rounded-3xl p-6 md:p-8 flex flex-col justify-between transition-all duration-400 cursor-default edge-light',
                    tile.accent
                      ? 'bg-primary text-white shadow-glow-plum hover:shadow-glow-plum'
                      : tile.dark
                      ? 'canvas-ink text-white shadow-ink hover:shadow-ink edge-light-dark'
                      : 'glass-card text-text'
                  )}
                >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-400 group-hover:scale-110',
                      tile.accent
                        ? 'bg-white/15'
                        : tile.dark
                        ? 'bg-primary/20'
                        : 'bg-primary/10'
                    )}
                  >
                    <Icon
                      size={20}
                      className={tile.accent || tile.dark ? 'text-white' : 'text-primary'}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div>
                  <h3
                    className={cn(
                      'font-bold mb-1.5',
                      tile.accent ? 'text-white text-h3' : tile.dark ? 'text-white text-lg' : 'text-text text-lg',
                      locale === 'ne' && 'font-devanagari'
                    )}
                  >
                    {tile.title}
                  </h3>
                  <p
                    className={cn(
                      'text-sm leading-relaxed',
                      tile.accent ? 'text-white/70' : tile.dark ? 'text-white/60' : 'text-text-muted',
                      locale === 'ne' && 'font-devanagari'
                    )}
                  >
                    {tile.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          )
        })}
        </div>
      </div>
    </Section>
  )
}
