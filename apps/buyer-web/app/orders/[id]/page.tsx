import { Container, Screen } from '@chinooz/ui-web'
import { getOrderById } from '@chinooz/mock-data'
import OrderDetailClient from './OrderDetailClient'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const order = await getOrderById(params.id)
  if (!order) return { title: 'Order — Chinooz' }
  return {
    title: `Order ${order.id.toUpperCase()} — Chinooz`,
    description: `Order details for ${order.id}`,
  }
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  let order = null
  let error = false
  try {
    order = await getOrderById(params.id)
  } catch {
    error = true
  }

  return (
    <Screen>
      <Container className="py-6 max-w-[800px]">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">😕</span>
            <h3 className="text-lg font-semibold text-text">Something went wrong</h3>
            <p className="text-sm text-text-muted">Failed to load order details.</p>
          </div>
        ) : order ? (
          <OrderDetailClient order={order} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">😕</span>
            <h3 className="text-lg font-semibold text-text">Order not found</h3>
            <p className="text-sm text-text-muted">This order may have been removed or doesn't exist.</p>
          </div>
        )}
      </Container>
    </Screen>
  )
}
