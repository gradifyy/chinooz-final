'use client'

import { Container, Screen, Button } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useTranslation()

  return (
    <Screen>
      <Container className="py-20 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold text-text mb-2">
          {t('common.error')}
        </h1>
        <p className="text-sm text-text-muted mb-6 max-w-sm">
          {t('common.somethingWentWrong')}
        </p>
        <Button onPress={reset} variant="primary">
          {t('common.retry')}
        </Button>
      </Container>
    </Screen>
  )
}
