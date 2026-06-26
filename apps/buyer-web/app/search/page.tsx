import { Container, Screen } from '@chinooz/ui-web'
import { HomeSkeleton } from '@/components/skeletons'

export default function SearchPage() {
  return (
    <Screen>
      <Container className="py-6">
        <h1 className="text-2xl font-bold text-text mb-4">Search</h1>
        <HomeSkeleton />
      </Container>
    </Screen>
  )
}
