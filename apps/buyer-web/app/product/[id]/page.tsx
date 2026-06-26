import { Container, Screen } from '@chinooz/ui-web'
import { ProductDetailSkeleton } from '@/components/skeletons'
import ProductDetailClient from './ProductDetailClient'
import ProductNotFound from './ProductNotFound'
import { getProductById, getReviews } from '@chinooz/mock-data'
import { formatNPR } from '@chinooz/utils'

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
      type: 'website',
    },
  }
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  let product = null
  let reviews: any[] = []
  let error = false
  try {
    product = await getProductById(params.id)
    if (product) {
      reviews = await getReviews(params.id)
    }
  } catch {
    error = true
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    : 0

  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images?.map((img: any) => img.uri) || [],
        sku: product.variants?.[0]?.sku || product.id,
        brand: {
          '@type': 'Brand',
          name: product.sellerName,
        },
        offers: {
          '@type': 'Offer',
          url: `https://chinooz.com/product/${product.id}`,
          priceCurrency: 'NPR',
          price: product.price,
          availability: product.stock === 'in_stock'
            ? 'https://schema.org/InStock'
            : product.stock === 'low_stock'
              ? 'https://schema.org/LimitedAvailability'
              : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: product.sellerName,
          },
        },
        ...(reviews.length > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: avgRating.toFixed(1),
                reviewCount: reviews.length,
              },
            }
          : {}),
      }
    : null

  return (
    <Screen>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
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
