'use client'

import { Container, Screen } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'

export default function InboxPage() {
  const { t } = useTranslation()

  return (
    <Screen>
      <Container className="py-6">
        <h1 className="text-2xl font-bold text-text">{t('inbox.title')}</h1>
        <p className="text-sm text-text-muted mt-2">{t('inbox.subtitle')}</p>
      </Container>
    </Screen>
  )
}
