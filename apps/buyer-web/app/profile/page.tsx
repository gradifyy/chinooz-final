import { Container, Screen } from '@chinooz/ui-web'

export default function ProfilePage() {
  return (
    <Screen>
      <Container className="py-6">
        <h1 className="text-2xl font-bold text-text">Profile</h1>
        <p className="text-sm text-text-muted mt-2">Account, Orders &amp; Wishlist</p>
      </Container>
    </Screen>
  )
}
