'use client'

import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { cartStore } from '@chinooz/state'
import { formatNPR } from '@chinooz/utils'
import { EmptyStateWeb } from '@chinooz/ui-web'

export default function CartPage() {
  const items = cartStore(s => s.items)
  const updateQuantity = cartStore(s => s.updateQuantity)
  const removeItem = cartStore(s => s.removeItem)
  const total = cartStore(s => s.total())

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <EmptyStateWeb
          icon="🛒"
          title="Your cart is empty"
          subtitle="Start shopping to add items"
        />
        <div className="text-center mt-4">
          <Link
            href="/"
            className="inline-block bg-[#8A1B57] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#6E1545] transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart ({items.length} items)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => (
            <div key={item.productId} className="bg-white rounded-xl p-4 border border-gray-100 flex gap-4">
              <Link href={`/product/${item.product.id}`}>
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              </Link>
              <div className="flex-1">
                <Link href={`/product/${item.product.id}`} className="font-semibold text-gray-900 hover:text-[#8A1B57]">
                  {item.product.name}
                </Link>
                <p className="text-sm font-bold text-[#8A1B57] mt-1">{formatNPR(item.product.price)}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-gray-200 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="px-3 py-1 text-gray-600 hover:text-gray-900"
                    >
                      −
                    </button>
                    <span className="px-3 py-1 text-sm font-semibold border-x border-gray-200">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="px-3 py-1 text-gray-600 hover:text-gray-900"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 h-fit">
          <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatNPR(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-[#8A1B57]">{formatNPR(total)}</span>
            </div>
          </div>
          <Link
            href="/checkout"
            className="block text-center bg-[#8A1B57] text-white font-semibold py-3 rounded-xl mt-6 hover:bg-[#6E1545] transition-colors"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}
