import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, radii, spacing } from '@chinooz/theme'
import { useSessionStore } from '@chinooz/state'
import { createProfileSchema } from '@chinooz/validation'
import { Avatar } from '@chinooz/ui'
import Snackbar from '../components/Snackbar'

export default function EditProfileScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const profile = useSessionStore(s => s.profile)
  const updateProfile = useSessionStore(s => s.updateProfile)

  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showSnackbar, setShowSnackbar] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn])

  const handleSave = useCallback(() => {
    const result = createProfileSchema.safeParse({ name, email, language: 'en' })
    if (!result.success) {
      const e: Record<string, string> = {}
      result.error.issues.forEach(i => {
        if (i.path[0] === 'name') e.name = t('editProfile.nameRequired')
        if (i.path[0] === 'email') e.email = t('editProfile.invalidEmail')
      })
      setErrors(e)
      return
    }
    setErrors({})
    setSaving(true)
    setTimeout(() => {
      updateProfile({ name: name.trim(), email: email.trim() })
      setSaving(false)
      setShowSnackbar(true)
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    }, 500)
  }, [name, email, updateProfile, t])

  const isValid = name.trim().length >= 2

  if (!isLoggedIn) return null

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('editProfile.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.avatarSection}>
          <Avatar source={profile.avatarUri} name={profile.name} size="xl" />
          <TouchableOpacity activeOpacity={0.7} style={s.changePhotoBtn} accessibilityRole="button" accessibilityLabel={t('editProfile.changePhoto')}>
            <Text style={s.changePhotoText}>{t('editProfile.changePhoto')}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.field}>
          <Text style={s.fieldLabel}>{t('editProfile.fullName')} *</Text>
          <TextInput
            style={[s.input, errors.name && s.inputError]}
            value={name}
            onChangeText={setName}
            placeholder={t('editProfile.fullNamePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('editProfile.fullName')}
          />
          {errors.name && <Text style={s.fieldError}>{errors.name}</Text>}
        </View>

        <View style={s.field}>
          <Text style={s.fieldLabel}>{t('editProfile.email')}</Text>
          <TextInput
            style={[s.input, errors.email && s.inputError]}
            value={email}
            onChangeText={setEmail}
            placeholder={t('editProfile.emailPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel={t('editProfile.email')}
          />
          {errors.email && <Text style={s.fieldError}>{errors.email}</Text>}
        </View>

        <View style={s.field}>
          <Text style={s.fieldLabel}>{t('editProfile.phone')}</Text>
          <View style={s.readOnlyRow}>
            <Text style={s.readOnlyText}>{profile.name ? '+977-9841234567' : '—'}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!isValid || saving}
          style={[s.saveBtn, (!isValid || saving) && s.saveBtnDisabled]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={saving ? t('editProfile.saving') : t('editProfile.save')}
        >
          <Text style={[s.saveBtnText, (!isValid || saving) && s.saveBtnTextDisabled]}>
            {saving ? t('editProfile.saving') : t('editProfile.save')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Snackbar
        visible={showSnackbar}
        message={t('editProfile.saved')}
        onDismiss={() => setShowSnackbar(false)}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: colors.text },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },

  avatarSection: { alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
  changePhotoBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  changePhotoText: { fontSize: 14, fontWeight: '600', color: colors.primary },

  field: { gap: spacing[1] },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  input: { height: 48, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing[3], fontSize: 16, color: colors.text },
  inputError: { borderColor: colors.error },
  fieldError: { fontSize: 12, color: colors.error },

  readOnlyRow: { height: 48, backgroundColor: colors.background, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing[3], justifyContent: 'center' },
  readOnlyText: { fontSize: 16, color: colors.textMuted },

  saveBtn: { marginTop: spacing[2], height: 48, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { backgroundColor: colors.border, opacity: 0.5 },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
  saveBtnTextDisabled: { color: colors.textMuted },
})
