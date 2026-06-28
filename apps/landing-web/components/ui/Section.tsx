import { cn } from '@/lib/utils'

interface SectionProps {
  children: React.ReactNode
  className?: string
  id?: string
  as?: 'section' | 'div' | 'article'
  contained?: boolean
  noPadding?: boolean
}

export function Section({
  children,
  className,
  id,
  as: Tag = 'section',
  contained = true,
  noPadding = false,
}: SectionProps) {
  return (
    <Tag
      id={id}
      className={cn(
        !noPadding && 'py-24 md:py-32 lg:py-40',
        className
      )}
    >
      {contained ? (
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-[1280px]">
          {children}
        </div>
      ) : (
        children
      )}
    </Tag>
  )
}

interface SectionHeaderProps {
  eyebrow?: string
  headline: string
  body?: string
  centered?: boolean
  light?: boolean
  className?: string
}

export function SectionHeader({
  eyebrow,
  headline,
  body,
  centered = false,
  light = false,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn(centered && 'text-center', 'mb-12 md:mb-16', className)}>
      {eyebrow && (
        <p
          className={cn(
            'text-caption font-semibold tracking-[0.12em] uppercase mb-3',
            light ? 'text-primary-50/70' : 'text-primary'
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          'text-h2 font-display font-bold whitespace-pre-line',
          light ? 'text-white' : 'text-text'
        )}
      >
        {headline}
      </h2>
      {body && (
        <p
          className={cn(
            'text-body-lg mt-4 max-w-2xl',
            centered && 'mx-auto',
            light ? 'text-white/70' : 'text-text-muted'
          )}
        >
          {body}
        </p>
      )}
    </div>
  )
}
