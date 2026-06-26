'use client'

import { Container, Screen } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'
import { HomeSkeleton } from '@/components/skeletons'

export default function Home() {
  const { t } = useTranslation()

  return (
    <Screen>
      <Container className="py-6">
        <HomeSkeleton />
      </Container>
    </Screen>
  )
}
