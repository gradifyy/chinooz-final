'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cartStore } from '@chinooz/state'
import { formatNPR } from '@chinooz/utils'

const paymentMethods = [
  { id: 'cod', name: 'Cash on Delivery', icon: '💵' },
  { id: 'khalti', name: 'Khalti', icon: '🔵' },
  { id: 'esewa', name: 'eSewa', icon: '🟢' },
  { id: 'connectIPS', name: 'Connect IPS', icon: '🏦' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const items = cartStore(s => s.items)
  const total = cartStore(s => s.total())
  const clearCart = cartStore(s => s.clearCart)
  const [selectedPayment, setSelectedPayment] = useState('cod')
  const [placed, setPlaced] = useState(false)

  const handlePlaceOrder = () => {
    setPlaced(true)
    clearCart()
  }

  if (placed) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <span className="text-6xl mb-4 inline-block">✅</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
        <p className="text-gray-500 mb-6">You'll receive a confirmation shortly.</p>
        <button
          onClick={() => router.push('/')}
          className="bg-[#8A1B57] text-white font-semibold px-8 py-3 rounded-xl hover:bg-[#6E1545] transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      <div className="space-y-4">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Delivery Address</h2>
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">Ayush Chaudhary</p>
            <p>9841234567</p>
            <p>Baneshwor Height, Kathmandu, Bagmati</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Payment Method</h2>
          <div className="space-y-2">
            {paymentMethods.map(pm => (
              <label
                key={pm.id}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPayment === pm.id ? 'border-[#8A1B57] bg-[#F8EAF1]' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={pm.id}
                  checked={selectedPayment === pm.id}
                  onChange={() => setSelectedPayment(pm.id)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                  selectedPayment === pm.id ? 'border-[#8A1B57]' : 'border-gray-300'
                }`}>
                  {selectedPayment === pm.id && <div className="w-3 h-3 rounded-full bg-[#8A1B57]" />}
                </div>
                <span className="text-xl mr-2">{pm.icon}</span>
                <span className="text-sm text-gray-900">{pm.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            {items.map(item => (
              <div key={item.productId} className="flex justify-between">
                <span className="text-gray-600">{item.product.name} x{item.quantity}</span>
                <span className="text-gray-900">{formatNPR(item.product.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatNPR(total)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          className="w-full bg-[#8A1B57] text-white font-semibold py-3.5 rounded-xl hover:bg-[#6E1545] transition-colors text-base"
        >
          Place Order • {formatNPR(total)}
        </button>
      </div>
    </div>
  )
}
