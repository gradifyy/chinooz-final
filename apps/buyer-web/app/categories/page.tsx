import { Container, Screen } from '@chinooz/ui-web'
import { CategorySkeleton } from '@/components/skeletons'

export default function CategoriesPage() {
  return (
    <Screen>
      <Container className="py-6">
        <CategorySkeleton />
      </Container>
    </Screen>
  )
}
