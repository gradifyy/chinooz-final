import React from 'react'
import { LifeBuoy } from 'lucide-react-native'
import { colors } from '@chinooz/theme'
import { useTranslation } from 'react-i18next'
import ComingSoonScreen from '../../components/ComingSoonScreen'

export default function SupportScreen() {
  const { t } = useTranslation()
  return (
    <ComingSoonScreen
      title={t('rider.profile.linkSupport')}
      icon={<LifeBuoy size={28} color={colors.error} />}
    />
  )
}
