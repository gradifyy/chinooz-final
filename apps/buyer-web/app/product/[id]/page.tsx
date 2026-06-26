import { Container, Screen } from '@chinooz/ui-web'
import { ProductDetailSkeleton } from '@/components/skeletons'

export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <Screen>
      <Container className="py-6">
        <ProductDetailSkeleton />
      </Container>
    </Screen>
  )
}
