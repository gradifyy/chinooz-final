import { Container, Screen, Skeleton } from '@chinooz/ui-web'

export default function Loading() {
  return (
    <Screen>
      <Container className="py-8">
        <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
          <Skeleton width="40%" height={28} borderRadius={8} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={96} borderRadius={16} />
            ))}
          </div>
          <Skeleton width="100%" height={320} borderRadius={16} />
        </div>
      </Container>
    </Screen>
  )
}
