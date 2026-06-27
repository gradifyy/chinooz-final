import { Container, Screen } from '@chinooz/ui-web'
import { getProducts, getCategories } from '@chinooz/mock-data'
import CategoryListingClient from './CategoryListingClient'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const categories = await getCategories()
  const cat = categories.find(c => c.id === params.id)
  return {
    title: cat ? `${cat.name} — Chinooz` : 'Category — Chinooz',
    description: cat ? `Browse ${cat.name} products on Chinooz` : 'Browse products on Chinooz',
  }
}

export default async function CategoryPage({ params }: { params: { id: string } }) {
  const categories = await getCategories()
  const category = categories.find(c => c.id === params.id)
  const { items, total } = await getProducts({ categoryId: params.id, limit: 50 })

  return (
    <Screen>
      <Container className="py-6">
        <CategoryListingClient
          categoryId={params.id}
          categoryName={category?.name || ''}
          categories={categories}
          initialProducts={items}
          initialTotal={total}
        />
      </Container>
    </Screen>
  )
}
