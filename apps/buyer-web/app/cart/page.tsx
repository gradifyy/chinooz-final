'use client'

import { Container, Screen } from '@chinooz/ui-web'
import { useCartStore } from '@chinooz/state'
import { CartSkeleton } from '@/components/skeletons'

export default function CartPage() {
  const items = useCartStore(s => s.items)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <Screen>
      <Container className="py-6">
        <CartSkeleton />
        <p className="text-xs text-text-muted text-center mt-6 pb-4">
          Cart has {count} item{count !== 1 ? 's' : ''} — badge is live across the app
        </p>
      </Container>
    </Screen>
  )
}
