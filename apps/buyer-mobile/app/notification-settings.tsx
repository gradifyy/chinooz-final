import React, { useMemo, useEffect } from 'react'
import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { spacing, radii, fontSz, colors as lightColors } from '@chinooz/theme'
import { usePreferencesStore, useSessionStore } from '@chinooz/state'
import { useAppTheme } from '../components/ThemeProvider'
import Icon, { type IconName } from '../components/Icon'
import ScreenHeader from '../components/ScreenHeader'

type NotifKey = 'orders' | 'deals' | 'messages'

const ITEMS: { key: NotifKey; labelKey: string; descKey: string; icon: IconName; tint: 'info' | 'warning' | 'primary' }[] = [
  { key: 'orders', labelKey: 'settings.ordersNotif', descKey: 'settings.ordersNotifDesc', icon: 'cube-outline', tint: 'info' },
  { key: 'deals', labelKey: 'settings.dealsNotif', descKey: 'settings.dealsNotifDesc', icon: 'pricetag-outline', tint: 'warning' },
  { key: 'messages', labelKey: 'settings.messagesNotif', descKey: 'settings.messagesNotifDesc', icon: 'chatbubble-outline', tint: 'primary' },
]

export default function NotificationSettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors } = useAppTheme()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const notifications = usePreferencesStore(s => s.notifications)
  const setNotification = usePreferencesStore(s => s.setNotification)
  const s = useMemo(() => makeStyles(colors), [colors])

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn, router])

  const tintColor = (tint: 'info' | 'warning' | 'primary') =>
    tint === 'info' ? colors.info : tint === 'warning' ? colors.warning : colors.primary
  const tintBg = (tint: 'info' | 'warning' | 'primary') =>
    tint === 'info' ? colors.infoLight : tint === 'warning' ? colors.warningLight : colors.primary50

  if (!isLoggedIn) return null

  return (
    <View style={s.screen}>
      <ScreenHeader title={t('settings.notifications')} />

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + spacing[8] }]} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionHeader}>{t('settings.notificationsDesc')}</Text>

        <View style={s.card}>
          {ITEMS.map((item, i) => (
            <React.Fragment key={item.key}>
              {i > 0 && <View style={s.divider} />}
              <View style={s.row}>
                <View style={[s.iconWrap, { backgroundColor: tintBg(item.tint) }]}>
                  <Icon name={item.icon} size={19} color={tintColor(item.tint)} />
                </View>
                <View style={s.rowInfo}>
                  <Text style={s.rowLabel}>{t(item.labelKey)}</Text>
                  <Text style={s.rowDesc}>{t(item.descKey)}</Text>
                </View>
                <Switch
                  value={notifications[item.key]}
                  onValueChange={v => setNotification(item.key, v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.border}
                />
              </View>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing[4], gap: spacing[4] },
    sectionHeader: { fontSize: fontSz('sm')[0], fontWeight: '600', color: c.textMuted, paddingHorizontal: spacing[1] },
    card: {
      backgroundColor: c.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3.5] },
    iconWrap: { width: 38, height: 38, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
    rowInfo: { flex: 1, gap: 2, marginRight: spacing[2] },
    rowLabel: { fontSize: fontSz('md')[0], fontWeight: '600', color: c.text },
    rowDesc: { fontSize: fontSz('sm')[0], color: c.textMuted, lineHeight: 17 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: spacing[4] + 38 + spacing[3] },
  })
