'use client'

import { Container, Screen } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'
import { HomeSkeleton } from '@/components/skeletons'

export default function SearchPage() {
  const { t } = useTranslation()

  return (
    <Screen>
      <Container className="py-6">
        <h1 className="text-2xl font-bold text-text mb-4">{t('search.title')}</h1>
        <HomeSkeleton />
      </Container>
    </Screen>
  )
}
