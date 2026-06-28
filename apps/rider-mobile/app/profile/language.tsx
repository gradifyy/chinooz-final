import React from 'react'
import { Globe } from 'lucide-react-native'
import { colors } from '@chinooz/theme'
import { useTranslation } from 'react-i18next'
import ComingSoonScreen from '../../components/ComingSoonScreen'

export default function LanguageScreen() {
  const { t } = useTranslation()
  return (
    <ComingSoonScreen
      title={t('rider.profile.rowLanguage')}
      icon={<Globe size={28} color={colors.textSecondary} />}
    />
  )
}
