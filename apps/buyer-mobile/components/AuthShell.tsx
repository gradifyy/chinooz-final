import React, { useMemo } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors as lightColors, spacing, fontSz, radii } from '@chinooz/theme'
import { useAppTheme } from './ThemeProvider'

const STEP_COUNT = 3
const HEADER_GRADIENT = [
  lightColors.primaryDark,
  lightColors.plumMid,
  'rgba(252,251,249,0)',
] as const

/**
 * Shared chrome for the phone -> OTP -> profile flow: a maroon gradient header
 * (fading into the cream body) with the Chinooz wordmark and a 3-step progress
 * bar. Mirrors the onboarding visual language so the whole entry flow feels like
 * one continuous experience.
 */
export function AuthShell({ step, children }: { step: number; children: React.ReactNode }) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const headerHeight = insets.top + 124

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={HEADER_GRADIENT}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.header, { height: headerHeight }]}
        pointerEvents="none"
      />

      <View style={[styles.brandRow, { top: insets.top + spacing[2] }]} pointerEvents="none">
        <Text style={styles.wordmark}>Chinooz</Text>
        <Text style={styles.stepLabel}>
          {t('auth.step', { current: step + 1, total: STEP_COUNT })}
        </Text>
      </View>

      <View style={[styles.progress, { top: insets.top + 56 }]} pointerEvents="none">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <View key={i} style={styles.segTrack}>
            <View style={[styles.segFill, { width: i <= step ? '100%' : '0%' }]} />
          </View>
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.content,
            { paddingTop: insets.top + 148, paddingBottom: insets.bottom + spacing[4] },
          ]}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.cream },
    flex: { flex: 1 },
    header: { position: 'absolute', top: 0, left: 0, right: 0 },
    brandRow: {
      position: 'absolute',
      left: spacing[6],
      right: spacing[6],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    wordmark: {
      fontFamily: 'SpaceGrotesk',
      fontSize: fontSz('xl')[0],
      color: c.creamInk,
      letterSpacing: -0.4,
    },
    stepLabel: {
      fontFamily: 'Inter',
      fontSize: fontSz('sm')[0],
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
    },
    progress: {
      position: 'absolute',
      left: spacing[6],
      right: spacing[6],
      flexDirection: 'row',
      gap: spacing[2],
    },
    segTrack: {
      flex: 1,
      height: 5,
      borderRadius: radii.full,
      backgroundColor: 'rgba(255,255,255,0.28)',
      overflow: 'hidden',
    },
    segFill: {
      height: '100%',
      borderRadius: radii.full,
      backgroundColor: c.gold,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing[6],
    },
  })
