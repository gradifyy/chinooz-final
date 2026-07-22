import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { spacing, radii, fontSz, colors as lightColors } from '@chinooz/theme'
import { useAppTheme } from './ThemeProvider'
import Icon, { type IconName } from './Icon'

interface ScreenHeaderProps {
  title: string
  /** Optional small caption shown beneath the title. */
  subtitle?: string
  /** Defaults to router.back(). */
  onBack?: () => void
  /** Optional right-side icon button. */
  rightIcon?: IconName
  onRightPress?: () => void
  rightAccessibilityLabel?: string
  /** Optional right-side text action (used when no rightIcon). */
  rightLabel?: string
  /** Hide the bottom hairline (e.g. when the screen supplies its own tabs below). */
  hideBorder?: boolean
}

/**
 * The single, consistent app-bar for every stack screen: a circular back button
 * (icon, not a bare "←"), a centered Fraunces title with an optional caption,
 * and an optional right action. Handles its own safe-area top inset, so screens
 * shouldn't add their own top padding. Theme-aware (light/dark).
 */
export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  rightAccessibilityLabel,
  rightLabel,
  hideBorder,
}: ScreenHeaderProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const handleBack = onBack ?? (() => router.back())

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + spacing[2] },
        hideBorder && styles.headerNoBorder,
      ]}
    >
      <TouchableOpacity
        onPress={handleBack}
        style={styles.btn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Icon name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.titleWrap} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      {rightIcon && onRightPress ? (
        <TouchableOpacity
          onPress={onRightPress}
          style={styles.btn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={rightAccessibilityLabel}
        >
          <Icon name={rightIcon} size={20} color={colors.text} />
        </TouchableOpacity>
      ) : rightLabel && onRightPress ? (
        <TouchableOpacity
          onPress={onRightPress}
          style={styles.rightLabelBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={rightAccessibilityLabel ?? rightLabel}
        >
          <Text style={styles.rightLabel}>{rightLabel}</Text>
        </TouchableOpacity>
      ) : (
        // Invisible spacer to keep the title centered — never a ghost box.
        <View style={styles.spacer} />
      )}
    </View>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[3],
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerNoBorder: {
      borderBottomWidth: 0,
    },
    btn: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    spacer: {
      width: 38,
      height: 38,
    },
    titleWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      textAlign: 'center',
      fontFamily: 'Fraunces',
      fontSize: fontSz('lg')[0],
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.3,
    },
    subtitle: {
      textAlign: 'center',
      fontSize: fontSz('xs')[0],
      fontWeight: '500',
      color: c.textMuted,
      marginTop: 1,
    },
    rightLabelBtn: {
      minWidth: 38,
      height: 38,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    rightLabel: {
      fontSize: fontSz('sm')[0],
      fontWeight: '700',
      color: c.primary,
    },
  })
