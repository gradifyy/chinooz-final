import { Container, Screen } from '@chinooz/ui-web'
import { ProductDetailSkeleton } from '@/components/skeletons'
import ProductDetailClient from './ProductDetailClient'
import ProductNotFound from './ProductNotFound'
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
  let error = false
  try {
    product = await getProductById(params.id)
  } catch {
    error = true
  }

  return (
    <Screen>
      <Container className="py-6">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">😕</span>
            <h3 className="text-lg font-semibold text-text">Something went wrong</h3>
            <p className="text-sm text-text-muted">Failed to load this product.</p>
          </div>
        ) : product ? (
          <ProductDetailClient product={product} />
        ) : (
          <ProductNotFound />
        )}
      </Container>
    </Screen>
  )
}
