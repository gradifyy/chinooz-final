'use client'

interface Props {
  variant: 'shop' | 'delivery' | 'payment'
}

const BADGES: Record<string, { emoji: string; top: string; left: string; size: string; opacity: number }[]> = {
  shop: [
    { emoji: '🏪', top: '12%', left: '8%', size: '2.5rem', opacity: 0.9 },
    { emoji: '👗', top: '35%', left: '78%', size: '2rem', opacity: 0.7 },
    { emoji: '📱', top: '65%', left: '72%', size: '1.8rem', opacity: 0.8 },
    { emoji: '🍵', top: '72%', left: '5%', size: '2.2rem', opacity: 0.6 },
  ],
  delivery: [
    { emoji: '📦', top: '15%', left: '10%', size: '2.2rem', opacity: 0.9 },
    { emoji: '⚡', top: '40%', left: '80%', size: '1.8rem', opacity: 0.7 },
    { emoji: '📍', top: '68%', left: '75%', size: '2rem', opacity: 0.8 },
    { emoji: '✅', top: '70%', left: '8%', size: '2rem', opacity: 0.6 },
  ],
  payment: [
    { emoji: '💳', top: '10%', left: '12%', size: '2.2rem', opacity: 0.9 },
    { emoji: '🛡️', top: '38%', left: '78%', size: '2rem', opacity: 0.7 },
    { emoji: '🤝', top: '66%', left: '70%', size: '1.8rem', opacity: 0.8 },
    { emoji: '✓', top: '74%', left: '6%', size: '2rem', opacity: 0.6 },
  ],
}

export default function OnboardingIllustration({ variant }: Props) {
  return (
    <div className="relative w-[240px] h-[240px] flex items-center justify-center">
      <div className="w-40 h-40 rounded-full bg-white/15 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full bg-white/12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
      {BADGES[variant].map((badge, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/15 flex items-center justify-center"
          style={{
            top: badge.top,
            left: badge.left,
            width: badge.size,
            height: badge.size,
            opacity: badge.opacity,
          }}
        />
      ))}
    </div>
  )
}
