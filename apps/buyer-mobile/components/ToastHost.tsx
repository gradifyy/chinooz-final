import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUIStore } from '@chinooz/state'
import { colors as lightColors, spacing, fontSz, radii } from '@chinooz/theme'
import Icon, { type IconName } from './Icon'

const VARIANTS: Record<string, { icon: IconName; tint: string }> = {
  success: { icon: 'checkmark-circle', tint: lightColors.success },
  error: { icon: 'alert-circle', tint: lightColors.error },
  warning: { icon: 'warning', tint: lightColors.warning },
  info: { icon: 'information-circle', tint: lightColors.info },
}

/**
 * App-wide toast overlay. The UI store collects `toasts` but nothing rendered
 * them before — this host displays the most recent few near the bottom, above
 * the tab bar / sticky bars. Mounted once at the root so it works everywhere.
 */
export default function ToastHost() {
  const insets = useSafeAreaInsets()
  const toasts = useUIStore(s => s.toasts)

  return (
    <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + 86 }]}>
      {toasts.slice(-3).map(toast => {
        const v = VARIANTS[toast.variant] ?? VARIANTS.info
        return (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.springify().damping(18).mass(0.8)}
            exiting={FadeOutDown.duration(200)}
            style={styles.toast}
          >
            <Icon name={v.icon} size={18} color={v.tint} />
            <Text style={styles.msg} numberOfLines={2}>{toast.message}</Text>
          </Animated.View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: lightColors.toastSurface,
    maxWidth: '100%',
    shadowColor: lightColors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  msg: {
    flex: 1,
    color: lightColors.white,
    fontFamily: 'Inter-SemiBold',
    fontSize: fontSz('sm')[0],
    fontWeight: '600',
  },
})
