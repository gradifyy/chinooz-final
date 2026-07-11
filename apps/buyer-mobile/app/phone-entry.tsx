/**
 * Auth step 0 — phone number entry (AuthShell + design-system Button / BottomSheet).
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { spacing, radii, fontSz, colors as lightColors } from '@chinooz/theme'
import { useSessionStore } from '@chinooz/state'
import { Button, BottomSheet, PressScale } from '@chinooz/ui'
import { AuthShell } from '../components/AuthShell'
import { OnboardingInput } from '../components/onboarding/OnboardingInput'
import { useAppTheme } from '../components/ThemeProvider'

const COUNTRY_CODES = [
  { code: '+977', countryKey: 'phoneEntry.countryNP', iso: 'NP' },
  { code: '+91', countryKey: 'phoneEntry.countryIN', iso: 'IN' },
  { code: '+1', countryKey: 'phoneEntry.countryUS', iso: 'US' },
  { code: '+44', countryKey: 'phoneEntry.countryGB', iso: 'GB' },
  { code: '+86', countryKey: 'phoneEntry.countryCN', iso: 'CN' },
] as const

export default function PhoneEntryScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const markOnboardingSeen = useSessionStore(s => s.markOnboardingSeen)

  const [selectedCountry, setSelectedCountry] = useState<(typeof COUNTRY_CODES)[number]>(
    COUNTRY_CODES[0],
  )
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  // Ensure storytelling is never re-shown after the user reaches auth.
  useEffect(() => {
    markOnboardingSeen()
  }, [markOnboardingSeen])

  const handleSendCode = useCallback(async () => {
    if (phoneNumber.length < 10) return
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 600))
      router.push({
        pathname: '/otp',
        params: { phone: phoneNumber },
      })
    } finally {
      setLoading(false)
    }
  }, [phoneNumber, router])

  const selectCountry = useCallback((country: (typeof COUNTRY_CODES)[number]) => {
    setSelectedCountry(country)
    setShowCountryPicker(false)
  }, [])

  const isValid = phoneNumber.length >= 10

  return (
    <AuthShell step={0}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="phone-portrait-outline" size={40} color={colors.primary} />
        </View>

        <Text style={styles.headline}>{t('phoneEntry.title')}</Text>
        <Text style={styles.subtext}>{t('phoneEntry.subtitle')}</Text>

        <View style={styles.form}>
          <View style={styles.phoneRow}>
            <PressScale
              style={styles.countryButton}
              onPress={() => setShowCountryPicker(true)}
              haptic="selection"
              accessibilityRole="button"
              accessibilityLabel={t('phoneEntry.selectCountry')}
            >
              <Text style={styles.countryIso}>{selectedCountry.iso}</Text>
              <Text style={styles.countryCode}>{selectedCountry.code}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </PressScale>

            <View style={styles.phoneInputContainer}>
              <OnboardingInput
                placeholder={t('phoneEntry.placeholder')}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={15}
                containerStyle={styles.phoneInput}
                accessibilityLabel={t('phoneEntry.inputLabel')}
              />
            </View>
          </View>

          <Button
            variant="primary"
            size="lg"
            shape="pill"
            fullWidth
            haptic="light"
            disabled={!isValid}
            loading={loading}
            onPress={handleSendCode}
            accessibilityLabel={t('phoneEntry.continue')}
          >
            {loading ? t('phoneEntry.sending') : t('phoneEntry.continue')}
          </Button>
        </View>
      </ScrollView>

      <BottomSheet
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        title={t('phoneEntry.selectCountry')}
      >
        <ScrollView style={styles.countryList}>
          {COUNTRY_CODES.map(country => {
            const selected = selectedCountry.code === country.code
            return (
              <PressScale
                key={country.code}
                style={[styles.countryItem, selected ? styles.countryItemSelected : null]}
                onPress={() => selectCountry(country)}
                haptic="selection"
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${t(country.countryKey)}, ${country.code}`}
              >
                <View style={styles.isoBadge}>
                  <Text style={styles.isoBadgeText}>{country.iso}</Text>
                </View>
                <Text style={styles.countryName}>{t(country.countryKey)}</Text>
                <Text style={styles.countryCodeInList}>{country.code}</Text>
                {selected ? (
                  <Ionicons name="checkmark" size={22} color={colors.primary} />
                ) : (
                  <View style={styles.checkPlaceholder} />
                )}
              </PressScale>
            )
          })}
        </ScrollView>
      </BottomSheet>
    </AuthShell>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    content: {
      alignItems: 'center',
      paddingBottom: spacing[8],
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: radii.xl,
      backgroundColor: c.primary50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing[6],
    },
    headline: {
      fontFamily: 'Fraunces-SemiBold',
      fontSize: fontSz('2xl')[0],
      fontWeight: '600',
      color: c.text,
      textAlign: 'center',
      marginBottom: spacing[2],
    },
    subtext: {
      fontFamily: 'Inter',
      fontSize: 15,
      lineHeight: 22,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: spacing[8],
      maxWidth: 300,
    },
    form: {
      width: '100%',
      gap: spacing[5],
    },
    phoneRow: {
      flexDirection: 'row',
      gap: spacing[3],
      alignItems: 'flex-start',
    },
    countryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      height: 52,
      minWidth: 108,
      paddingHorizontal: spacing[3],
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    countryIso: {
      fontFamily: 'Inter-SemiBold',
      fontSize: fontSz('sm')[0],
      fontWeight: '700',
      color: c.primary,
    },
    countryCode: {
      fontFamily: 'Inter',
      fontSize: fontSz('md')[0],
      fontWeight: '600',
      color: c.text,
    },
    phoneInputContainer: {
      flex: 1,
    },
    phoneInput: {
      marginBottom: 0,
    },
    countryList: {
      maxHeight: 360,
      paddingHorizontal: spacing[4],
    },
    countryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      minHeight: 52,
      paddingVertical: spacing[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    countryItemSelected: {
      backgroundColor: c.primary50,
      marginHorizontal: -spacing[2],
      paddingHorizontal: spacing[2],
      borderRadius: radii.md,
    },
    isoBadge: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    isoBadgeText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: fontSz('xs')[0],
      fontWeight: '700',
      color: c.primary,
    },
    countryName: {
      fontFamily: 'Inter',
      fontSize: fontSz('md')[0],
      color: c.text,
      flex: 1,
    },
    countryCodeInList: {
      fontFamily: 'Inter',
      fontSize: fontSz('base')[0],
      color: c.textSecondary,
      marginRight: spacing[2],
    },
    checkPlaceholder: {
      width: 22,
    },
  })
