import { Container, Screen } from '@chinooz/ui-web'
import { ProductDetailSkeleton } from '@/components/skeletons'
import ProductDetailClient from './ProductDetailClient'
import { getProductById } from '@chinooz/mock-data'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id)
  if (!product) return { title: 'Product — Chinooz' }
  return {
    title: `${product.name} — Chinooz`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: product.images?.[0]?.uri ? [product.images[0].uri] : [],
    },
  }
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  let product = null
  try {
    product = await getProductById(params.id)
  } catch {}

  return (
    <Screen>
      <Container className="py-6">
        {product ? (
          <ProductDetailClient product={product} />
        ) : (
          <ProductDetailSkeleton />
        )}
      </Container>
    </Screen>
  )
}
