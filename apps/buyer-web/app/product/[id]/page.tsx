'use client'

import { Container, Screen } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'
import { ProductDetailSkeleton } from '@/components/skeletons'

export default function ProductPage({ params }: { params: { id: string } }) {
  const { t } = useTranslation()

  return (
    <Screen>
      <Container className="py-6">
        <ProductDetailSkeleton />
      </Container>
    </Screen>
  )
}
