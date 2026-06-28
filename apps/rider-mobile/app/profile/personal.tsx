import React from 'react'
import { User } from 'lucide-react-native'
import { colors } from '@chinooz/theme'
import { useTranslation } from 'react-i18next'
import ComingSoonScreen from '../../components/ComingSoonScreen'

export default function PersonalScreen() {
  const { t } = useTranslation()
  return (
    <ComingSoonScreen
      title={t('rider.profile.rowPersonalProfile')}
      icon={<User size={28} color={colors.textSecondary} />}
    />
  )
}
