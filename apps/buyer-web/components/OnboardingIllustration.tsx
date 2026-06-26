'use client'

interface Props {
  variant: 'shop' | 'delivery' | 'payment'
}

const imageMap: Record<string, string> = {
  shop: '/onboarding-shop.png',
  delivery: '/onboarding-delivery.png',
  payment: '/onboarding-payment.png',
}

export default function OnboardingIllustration({ variant }: Props) {
  return (
    <div className="w-[280px] h-[280px] max-w-[60vw] max-h-[60vw] flex items-center justify-center">
      <img
        src={imageMap[variant]}
        alt={`${variant} illustration`}
        className="w-full h-full object-contain rounded-3xl"
        loading="eager"
      />
    </div>
  )
}
