import { Container, Screen } from '@chinooz/ui-web'

export default function DealsPage() {
  return (
    <Screen>
      <Container className="py-6">
        <h1 className="text-2xl font-bold text-primary">🔥 Deals</h1>
        <p className="text-sm text-text-muted mt-2">Today&apos;s best deals</p>
      </Container>
    </Screen>
  )
}
