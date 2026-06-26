import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors } from '@chinooz/theme'

interface Props {
  variant: 'shop' | 'delivery' | 'payment'
}

const ICONS: Record<string, string> = {
  shop: '🛍️',
  delivery: '🚚',
  payment: '🔒',
}

const BADGES: Record<string, string[]> = {
  shop: ['🏪', '👗', '📱', '🍵'],
  delivery: ['📦', '⚡', '📍', '✅'],
  payment: ['💳', '🛡️', '🤝', '✓'],
}

export default function OnboardingIllustration({ variant }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        <View style={styles.innerCircle}>
          <View style={styles.iconText}>
            <View style={styles.iconPlaceholder}>
              <View style={styles.iconDot} />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.badges}>
        {BADGES[variant].map((_, i) => (
          <View
            key={i}
            style={[
              styles.badge,
              {
                top: [20, 60, 10, 70][i],
                left: [10, 75, 80, 5][i],
                width: [36, 32, 28, 34][i],
                height: [36, 32, 28, 34][i],
                borderRadius: [18, 16, 14, 17][i],
                opacity: [0.9, 0.7, 0.8, 0.6][i],
              },
            ]}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  badges: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
})
