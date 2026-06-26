import { Container, Screen } from '@chinooz/ui-web'
import { HomeSkeleton } from '@/components/skeletons'

export default function Home() {
  return (
    <Screen>
      <Container className="py-6">
        <HomeSkeleton />
      </Container>
    </Screen>
  )
}
