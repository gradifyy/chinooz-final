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
        <OrderDetailClient order={order} isError={error} />
      </Container>
    </Screen>
  )
}
