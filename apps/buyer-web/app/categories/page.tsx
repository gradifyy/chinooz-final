'use client'

import { Container, Screen } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'
import { CategorySkeleton } from '@/components/skeletons'

export default function CategoriesPage() {
  const { t } = useTranslation()

  return (
    <Screen>
      <Container className="py-6">
        <CategorySkeleton />
      </Container>
    </Screen>
  )
}
