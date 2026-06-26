'use client'

import { Container, Screen } from '@chinooz/ui-web'
import { useCartStore } from '@chinooz/state'
import { CartSkeleton } from '@/components/skeletons'

export default function CartPage() {
  const count = useCartStore(s => s.count)
  const increment = useCartStore(s => s.increment)
  const decrement = useCartStore(s => s.decrement)

  return (
    <Screen>
      <Container className="py-6">
        <CartSkeleton />
        <div className="flex items-center justify-center gap-4 mt-8 pb-4">
          <button
            onClick={decrement}
            className="bg-border rounded-xl w-12 h-12 flex items-center justify-center text-xl font-bold text-text hover:bg-border-light transition-colors"
          >
            −
          </button>
          <span className="text-2xl font-bold text-text">{count}</span>
          <button
            onClick={increment}
            className="bg-primary rounded-xl w-12 h-12 flex items-center justify-center text-xl font-bold text-white hover:bg-primary-dark transition-colors"
          >
            +
          </button>
        </div>
        <p className="text-xs text-text-muted text-center">Use +/- to test the live badge count</p>
      </Container>
    </Screen>
  )
}
