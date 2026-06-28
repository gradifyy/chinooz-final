'use client'

import React, { Suspense } from 'react'
import SellerOrders from '@/components/SellerOrders'

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <SellerOrders />
    </Suspense>
  )
}
