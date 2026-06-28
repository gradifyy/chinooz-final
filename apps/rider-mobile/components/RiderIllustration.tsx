import React from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import Svg, { Circle, Path, Rect, Line, G } from 'react-native-svg'
import { colors } from '@chinooz/theme'

const { width } = Dimensions.get('window')
const PANEL = Math.min(width * 0.78, 280)
const INNER = PANEL * 0.82

type Variant = 'hours' | 'payouts' | 'nearby'

interface Props {
  variant: Variant
  alt?: string
}

export default function RiderIllustration({ variant, alt }: Props) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel={alt}
    >
      <View style={styles.panel}>
        {variant === 'hours' && <HoursArt />}
        {variant === 'payouts' && <PayoutsArt />}
        {variant === 'nearby' && <NearbyArt />}
      </View>
    </View>
  )
}

function HoursArt() {
  const c = INNER / 2
  const r = INNER * 0.34
  return (
    <Svg width={INNER} height={INNER} viewBox={`0 0 ${INNER} ${INNER}`}>
      <G>
        <Circle cx={c} cy={c} r={r + 8} fill="none" stroke={colors.primary50} strokeWidth={2} />
        <Circle cx={c} cy={c} r={r} fill={colors.surface} stroke={colors.primary} strokeWidth={2.5} />
        <Circle cx={c} cy={c} r={3} fill={colors.primary} />
        <Line x1={c} y1={c} x2={c} y2={c - r + 10} stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={c} y1={c} x2={c + r - 14} y2={c} stroke={colors.gold} strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={c} cy={c - r + 4} r={4} fill={colors.gold} />
        <Circle cx={c + r - 4} cy={c} r={4} fill={colors.primaryLight} />
        <Circle cx={c} cy={c + r - 4} r={4} fill={colors.primary50} />
        <Circle cx={c - r + 4} cy={c} r={4} fill={colors.primary50} />
      </G>
    </Svg>
  )
}

function PayoutsArt() {
  const w = INNER
  const h = INNER * 0.7
  const walletW = w * 0.52
  const walletH = h * 0.46
  const wx = (w - walletW) / 2
  const wy = h * 0.4
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <G>
        <Path d={`M${w * 0.22} ${h * 0.12} L${w * 0.5} ${h * 0.22}`} stroke={colors.primary} strokeWidth={2.2} strokeLinecap="round" />
        <Circle cx={w * 0.5} cy={h * 0.22} r={3.2} fill={colors.gold} />
        <Rect x={wx} y={wy} width={walletW} height={walletH} rx={10} fill={colors.primary} />
        <Rect x={wx} y={wy} width={walletW} height={walletH * 0.4} rx={10} fill={colors.primaryDark} />
        <Circle cx={wx + walletW - 16} cy={wy + walletH * 0.5} r={9} fill={colors.gold} />
        <Circle cx={wx + walletW - 16} cy={wy + walletH * 0.5} r={3.5} fill={colors.primaryDark} />
        <Rect x={wx + 14} y={wy + walletH + 8} width={walletW - 28} height={6} rx={3} fill={colors.primary50} />
      </G>
    </Svg>
  )
}

function NearbyArt() {
  const w = INNER
  const h = INNER * 0.74
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <G>
        <Path
          d={`M${w * 0.14} ${h * 0.2} Q${w * 0.5} ${h * 0.02} ${w * 0.86} ${h * 0.2}`}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="6 6"
        />
        <Circle cx={w * 0.14} cy={h * 0.2} r={7} fill={colors.primary50} />
        <Circle cx={w * 0.14} cy={h * 0.2} r={3} fill={colors.primary} />
        <Circle cx={w * 0.86} cy={h * 0.2} r={7} fill={colors.gold} />
        <Circle cx={w * 0.86} cy={h * 0.2} r={3} fill={colors.primaryDark} />
        <Path
          d={`M${w * 0.5} ${h * 0.34} C${w * 0.46} ${h * 0.5} ${w * 0.4} ${h * 0.56} ${w * 0.5} ${h * 0.66} C${w * 0.6} ${h * 0.56} ${w * 0.54} ${h * 0.5} ${w * 0.5} ${h * 0.34} Z`}
          fill={colors.primary}
        />
        <Circle cx={w * 0.5} cy={h * 0.5} r={3} fill={colors.white} />
      </G>
    </Svg>
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
    borderRadius: 28,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
})
