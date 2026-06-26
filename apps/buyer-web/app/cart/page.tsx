'use client'

import { useCartStore } from '@chinooz/state'

export default function CartPage() {
  const count = useCartStore(s => s.count)
  const increment = useCartStore(s => s.increment)
  const decrement = useCartStore(s => s.decrement)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text">Your Cart</h1>
      <p className="text-sm text-text-muted mt-2">
        {count} item{count !== 1 ? 's' : ''} in cart
      </p>
      <div className="flex items-center gap-4 mt-6">
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
      <p className="text-xs text-text-muted mt-4">Use +/- to test the live badge count</p>
    </div>
  )
}
