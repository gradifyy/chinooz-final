'use client'

import { Container, Screen } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '@chinooz/state'
import { CartSkeleton } from '@/components/skeletons'

export default function CartPage() {
  const { t } = useTranslation()
  const items = useCartStore(s => s.items)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <Screen>
      <Container className="py-6">
        <CartSkeleton />
        <p className="text-xs text-text-muted text-center mt-6 pb-4">
          {t('cart.title')} — {count} {count === 1 ? t('cart.itemCount', { count }) : t('cart.itemCount_other', { count })}
        </p>
      </Container>
    </Screen>
  )
}
