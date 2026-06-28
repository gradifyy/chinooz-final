import React from 'react'
import { Bell } from 'lucide-react-native'
import { colors } from '@chinooz/theme'
import { useTranslation } from 'react-i18next'
import ComingSoonScreen from '../../components/ComingSoonScreen'

export default function NotificationsScreen() {
  const { t } = useTranslation()
  return (
    <ComingSoonScreen
      title={t('rider.profile.rowNotifications')}
      icon={<Bell size={28} color={colors.textSecondary} />}
    />
  )
}
