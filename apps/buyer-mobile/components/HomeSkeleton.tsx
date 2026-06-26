import React from 'react'
import { View, Dimensions } from 'react-native'
import { colors, spacing } from '@chinooz/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE_PADDING = 16
const CARD_GAP = 12
const COMPACT_WIDTH = 160

function ShimmerBar({ width, height, borderRadius = 6 }: { width: number | `${number}%`; height: number; borderRadius?: number }) {
  return <View style={{ width: width as any, height, borderRadius, backgroundColor: colors.border }} />
}

function HeroSection() {
  return <ShimmerBar width={SCREEN_WIDTH - EDGE_PADDING * 2} height={180} borderRadius={16} />
}

function DealsSection() {
  return (
    <View style={{ gap: spacing[3] }}>
      <ShimmerBar width={120} height={18} />
      <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={{ width: COMPACT_WIDTH, gap: 6 }}>
            <ShimmerBar width={COMPACT_WIDTH} height={140} borderRadius={12} />
            <ShimmerBar width="80%" height={12} />
            <ShimmerBar width="50%" height={14} />
          </View>
        ))}
      </View>
    </View>
  )
}

function RailSection() {
  return (
    <View style={{ gap: spacing[3] }}>
      <ShimmerBar width={140} height={18} />
      <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={{ width: COMPACT_WIDTH, gap: 6 }}>
            <ShimmerBar width={COMPACT_WIDTH} height={140} borderRadius={12} />
            <ShimmerBar width="80%" height={12} />
            <ShimmerBar width="50%" height={14} />
          </View>
        ))}
      </View>
    </View>
  )
}

function GridSection() {
  const cardWidth = (SCREEN_WIDTH - EDGE_PADDING * 2 - CARD_GAP) / 2
  return (
    <View style={{ gap: spacing[3] }}>
      <ShimmerBar width={160} height={22} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={{ width: cardWidth, gap: 6 }}>
            <ShimmerBar width={cardWidth} height={cardWidth * 1.25} borderRadius={12} />
            <ShimmerBar width="90%" height={14} />
            <ShimmerBar width="60%" height={12} />
            <ShimmerBar width="40%" height={16} />
          </View>
        ))}
      </View>
    </View>
  )
}

export default function HomeSkeleton() {
  return (
    <View style={{ gap: spacing[6], paddingHorizontal: EDGE_PADDING, paddingTop: spacing[4] }}>
      <HeroSection />
      <DealsSection />
      <RailSection />
      <RailSection />
      <View style={{ gap: spacing[3] }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <ShimmerBar width={64} height={64} borderRadius={32} />
              <ShimmerBar width={48} height={10} />
            </View>
          ))}
        </View>
      </View>
      <RailSection />
      <GridSection />
    </View>
  )
}
