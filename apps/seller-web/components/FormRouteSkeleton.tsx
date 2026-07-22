import { Container, Screen, Skeleton } from '@chinooz/ui-web'

/**
 * Lightweight, sized placeholder shown while a code-split form route
 * (`next/dynamic`) loads its client chunk. Mirrors the form's rough shape so
 * there's no layout shift when the real screen hydrates.
 */
export function FormRouteSkeleton() {
  return (
    <Screen>
      <Container className="py-6">
        <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
          <Skeleton width="45%" height={28} borderRadius={8} />
          <Skeleton width="100%" height={120} borderRadius={16} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={56} borderRadius={12} />
            ))}
          </div>
          <Skeleton width="100%" height={200} borderRadius={16} />
          <Skeleton width="30%" height={48} borderRadius={12} />
        </div>
      </Container>
    </Screen>
  )
}
