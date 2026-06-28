import React from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg'
import { Store } from 'lucide-react-native'
import { colors } from '@chinooz/theme'

const { width } = Dimensions.get('window')
const PANEL = Math.min(width * 0.82, 300)
const INNER = PANEL * 0.78

interface Props {
  alt?: string
}

export default function SellerIllustration({ alt }: Props) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel={alt}
    >
      <View style={styles.panel}>
        <View style={styles.storeRow}>
          <Store size={36} color={colors.primary} strokeWidth={2} />
        </View>
        <Svg width={INNER} height={INNER * 0.5} viewBox="0 0 120 60">
          <Line x1="8" y1="52" x2="112" y2="52" stroke={colors.border} strokeWidth="1.5" strokeLinecap="round" />
          <Line x1="8" y1="8" x2="8" y2="52" stroke={colors.border} strokeWidth="1.5" strokeLinecap="round" />
          <Path
            d="M12 46 L34 38 L56 30 L78 20 L104 10"
            fill="none"
            stroke={colors.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="104" cy="10" r="3.5" fill={colors.primary} />
          <Rect x="22" y="44" width="6" height="8" rx="2" fill={colors.primary50} />
          <Rect x="44" y="36" width="6" height="16" rx="2" fill={colors.primary50} />
          <Rect x="66" y="26" width="6" height="26" rx="2" fill={colors.primaryLight} />
          <Rect x="88" y="16" width="6" height="36" rx="2" fill={colors.primary} />
        </Svg>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: PANEL,
    height: PANEL,
    borderRadius: 24,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  storeRow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
})
