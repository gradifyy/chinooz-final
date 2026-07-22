import React, { useMemo, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { spacing, radii, fontSz, duration, colors as lightColors } from '@chinooz/theme'
import { useUIStore, useSessionStore } from '@chinooz/state'
import type { ThemeMode } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { useAppTheme } from '../components/ThemeProvider'
import Icon, { type IconName } from '../components/Icon'
import ScreenHeader from '../components/ScreenHeader'

const OPTIONS: { key: ThemeMode; labelKey: string; descKey: string; icon: IconName }[] = [
  { key: 'light', labelKey: 'settings.themeLight', descKey: 'settings.themeLightDesc', icon: 'sunny-outline' },
  { key: 'dark', labelKey: 'settings.themeDark', descKey: 'settings.themeDarkDesc', icon: 'moon-outline' },
  { key: 'system', labelKey: 'settings.themeSystem', descKey: 'settings.themeSystemDesc', icon: 'phone-portrait-outline' },
]

export default function AppearanceScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const { colors, isDark } = useAppTheme()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const theme = useUIStore(s => s.theme)
  const setTheme = useUIStore(s => s.setTheme)
  const s = useMemo(() => makeStyles(colors), [colors])

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn, router])

  const handleSelect = useCallback((mode: ThemeMode) => {
    setTheme(mode)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }, [setTheme])

  if (!isLoggedIn) return null

  return (
    <View style={s.screen}>
      <ScreenHeader title={t('settings.appearance')} />

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + spacing[8] }]} showsVerticalScrollIndicator={false}>
        {/* Live preview */}
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(duration.normal)} style={s.preview}>
          <View style={s.previewBar}>
            <View style={s.previewDot} />
            <View style={[s.previewLine, { width: 90 }]} />
          </View>
          <View style={s.previewCard}>
            <View style={s.previewAvatar} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[s.previewLine, { width: '70%' }]} />
              <View style={[s.previewLine, { width: '45%', opacity: 0.6 }]} />
            </View>
            <View style={s.previewChip} />
          </View>
          <Text style={s.previewLabel}>{isDark ? t('settings.themeDark') : t('settings.themeLight')}</Text>
        </Animated.View>

        <Text style={s.sectionHeader}>{t('settings.appearanceDesc')}</Text>

        <View style={s.card}>
          {OPTIONS.map((opt, i) => {
            const active = theme === opt.key
            return (
              <React.Fragment key={opt.key}>
                {i > 0 && <View style={s.divider} />}
                <TouchableOpacity
                  onPress={() => handleSelect(opt.key)}
                  style={s.row}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(opt.labelKey)}
                >
                  <View style={[s.iconWrap, active && s.iconWrapActive]}>
                    <Icon name={opt.icon} size={19} color={active ? colors.primary : colors.textMuted} />
                  </View>
                  <View style={s.rowInfo}>
                    <Text style={s.rowLabel}>{t(opt.labelKey)}</Text>
                    <Text style={s.rowDesc}>{t(opt.descKey)}</Text>
                  </View>
                  <View style={[s.radio, active && s.radioActive]}>
                    {active && <Icon name="checkmark" size={14} color={colors.white} />}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing[4], gap: spacing[4] },

    preview: {
      backgroundColor: c.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      gap: spacing[3],
    },
    previewBar: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    previewDot: { width: 22, height: 22, borderRadius: 8, backgroundColor: c.primary },
    previewLine: { height: 10, borderRadius: 5, backgroundColor: c.border },
    previewCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      backgroundColor: c.background,
      borderRadius: radii.lg,
      padding: spacing[3],
    },
    previewAvatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: c.primary50 },
    previewChip: { width: 54, height: 24, borderRadius: radii.full, backgroundColor: c.primary },
    previewLabel: { fontSize: fontSz('xs')[0], fontWeight: '700', color: c.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' },

    sectionHeader: { fontSize: fontSz('sm')[0], fontWeight: '600', color: c.textMuted, paddingHorizontal: spacing[1] },
    card: {
      backgroundColor: c.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3.5] },
    iconWrap: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
    iconWrapActive: { backgroundColor: c.primary50 },
    rowInfo: { flex: 1, gap: 2 },
    rowLabel: { fontSize: fontSz('md')[0], fontWeight: '600', color: c.text },
    rowDesc: { fontSize: fontSz('sm')[0], color: c.textMuted },
    radio: {
      width: 24,
      height: 24,
      borderRadius: radii.full,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: c.primary, backgroundColor: c.primary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: spacing[4] + 38 + spacing[3] },
  })
