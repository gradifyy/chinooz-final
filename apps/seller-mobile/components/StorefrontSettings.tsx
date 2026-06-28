import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Image as RNImage,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  Star,
  Image as ImageIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useSellerSessionStore } from '@chinooz/state'
import { storefrontSchema } from '@chinooz/validation'
import { analytics } from '@chinooz/analytics'
import { SELLER_STORE_RATING, SELLER_STORE_REVIEW_COUNT } from '@chinooz/mock-data'

interface FormState {
  name: string
  tagline: string
  description: string
  category: string
  pickupAddress: string
  returnAddress: string
  contactPhone: string
  contactEmail: string
  logoUrl: string
  bannerUrl: string
}

type Errors = Partial<Record<keyof FormState, string>>

const MOCK_LOGO = 'https://images.unsplash.com/photo-1556155092-490a1ba16284?w=200&h=200&fit=crop'
const MOCK_BANNER = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=300&fit=crop'

function toForm(store: ReturnType<typeof useSellerSessionStore.getState>['store']): FormState {
  return {
    name: store?.name ?? '',
    tagline: store?.tagline ?? '',
    description: store?.description ?? '',
    category: store?.category ?? '',
    pickupAddress: store?.pickupAddress ?? '',
    returnAddress: store?.returnAddress ?? '',
    contactPhone: store?.contactPhone ?? '',
    contactEmail: store?.contactEmail ?? '',
    logoUrl: store?.logoUrl ?? '',
    bannerUrl: store?.bannerUrl ?? '',
  }
}

export default function StorefrontSettings() {
  const { t } = useTranslation()
  const router = useRouter()
  const store = useSellerSessionStore(s => s.store)
  const updateStore = useSellerSessionStore(s => s.updateStore)

  const [form, setForm] = useState<FormState>(() => toForm(store))
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirtyDialog, setDirtyDialog] = useState(false)
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null)
  const [cropTarget, setCropTarget] = useState<null | { kind: 'logo' | 'banner'; src: string }>(null)
  const [uploadProgress, setUploadProgress] = useState<{ kind: 'logo' | 'banner'; pct: number } | null>(null)

  const initialRef = useRef<FormState>(form)

  useEffect(() => {
    analytics.screen({ name: 'seller-settings-storefront' })
  }, [])

  const dirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialRef.current)
  }, [form])

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const validate = useCallback((): Errors => {
    const result = storefrontSchema.safeParse(form)
    if (result.success) return {}
    const errs: Errors = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FormState
      if (!errs[key]) errs[key] = issue.message
    }
    return errs
  }, [form])

  const handleSave = useCallback(() => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    setTimeout(() => {
      updateStore({
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        category: form.category,
        pickupAddress: form.pickupAddress,
        returnAddress: form.returnAddress,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        logoUrl: form.logoUrl,
        bannerUrl: form.bannerUrl,
      })
      initialRef.current = form
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 600)
  }, [form, validate, updateStore])

  const guardedNav = useCallback(
    (fn: () => void) => {
      if (dirty) {
        setPendingNav(() => fn)
        setDirtyDialog(true)
      } else {
        fn()
      }
    },
    [dirty],
  )

  const simulateUpload = (kind: 'logo' | 'banner') => {
    setUploadProgress({ kind, pct: 0 })
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (!prev || prev.kind !== kind) return prev
        const next = prev.pct + 15
        if (next >= 100) {
          clearInterval(interval)
          const src = kind === 'logo' ? MOCK_LOGO : MOCK_BANNER
          setTimeout(() => {
            setUploadProgress(null)
            setCropTarget({ kind, src })
          }, 200)
          return { kind, pct: 100 }
        }
        return { kind, pct: next }
      })
    }, 120)
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => guardedNav(() => router.back())}
          accessibilityRole="button"
          accessibilityLabel={t('seller.settings.storefront.backToSettings')}
          hitSlop={8}
          style={styles.topBarBtn}
        >
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {t('seller.settings.storefront.editTitle')}
        </Text>
        <View style={styles.topBarDirty}>
          {dirty ? (
            <View style={styles.dirtyDotRow}>
              <View style={styles.dirtyDot} />
              <Text style={styles.dirtyText}>{t('seller.settings.storefront.dirtyIndicator')}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Live preview */}
        <Text accessibilityRole="header" style={styles.previewSectionHeader}>
          {t('seller.settings.storefront.sectionPreview')}
        </Text>
        <StorePreview
          name={form.name || t('seller.settings.storefront.previewNoLogo')}
          tagline={form.tagline}
          logoUrl={form.logoUrl}
          bannerUrl={form.bannerUrl}
          rating={SELLER_STORE_RATING}
          reviewCount={SELLER_STORE_REVIEW_COUNT}
          t={t}
        />
        <Text style={styles.previewHint}>{t('seller.settings.storefront.previewLabel')}</Text>

        {/* Identity */}
        <FormSection title={t('seller.settings.storefront.sectionIdentity')}>
          <Field
            label={t('seller.settings.storefront.fieldName')}
            hint={t('seller.settings.storefront.fieldNameHint')}
            error={errors.name ? t('seller.settings.storefront.fieldNameError') : undefined}
          >
            <TextInput
              value={form.name}
              onChangeText={(v) => set('name', v)}
              accessibilityLabel={t('seller.settings.storefront.fieldName')}
              style={[styles.input, errors.name && styles.inputError]}
              placeholder=""
            />
          </Field>

          <Field
            label={t('seller.settings.storefront.fieldTagline')}
            hint={t('seller.settings.storefront.fieldTaglineHint')}
            error={errors.tagline ? t('seller.settings.storefront.fieldTaglineError') : undefined}
          >
            <TextInput
              value={form.tagline}
              onChangeText={(v) => set('tagline', v)}
              maxLength={140}
              accessibilityLabel={t('seller.settings.storefront.fieldTagline')}
              style={[styles.input, errors.tagline && styles.inputError]}
              placeholder=""
            />
          </Field>

          <Field
            label={t('seller.settings.storefront.fieldDescription')}
            hint={t('seller.settings.storefront.fieldDescriptionHint')}
            error={errors.description ? t('seller.settings.storefront.fieldDescriptionError') : undefined}
          >
            <TextInput
              value={form.description}
              onChangeText={(v) => set('description', v)}
              maxLength={2000}
              multiline
              accessibilityLabel={t('seller.settings.storefront.fieldDescription')}
              style={[styles.textarea, errors.description && styles.inputError]}
              placeholder=""
            />
          </Field>
        </FormSection>

        {/* Media */}
        <FormSection title={t('seller.settings.storefront.sectionMedia')}>
          <ImageUploadMobile
            kind="logo"
            label={t('seller.settings.storefront.logoLabel')}
            hint={t('seller.settings.storefront.logoHint')}
            uploadLabel={t('seller.settings.storefront.logoUpload')}
            changeLabel={t('seller.settings.storefront.logoChange')}
            removeLabel={t('seller.settings.storefront.logoRemove')}
            ariaLabel={t('seller.settings.storefront.logoAria')}
            value={form.logoUrl}
            progress={uploadProgress?.kind === 'logo' ? uploadProgress.pct : null}
            onUpload={() => simulateUpload('logo')}
            onRemove={() => set('logoUrl', '')}
            t={t}
          />
          <ImageUploadMobile
            kind="banner"
            label={t('seller.settings.storefront.bannerLabel')}
            hint={t('seller.settings.storefront.bannerHint')}
            uploadLabel={t('seller.settings.storefront.bannerUpload')}
            changeLabel={t('seller.settings.storefront.bannerChange')}
            removeLabel={t('seller.settings.storefront.bannerRemove')}
            ariaLabel={t('seller.settings.storefront.bannerAria')}
            value={form.bannerUrl}
            progress={uploadProgress?.kind === 'banner' ? uploadProgress.pct : null}
            onUpload={() => simulateUpload('banner')}
            onRemove={() => set('bannerUrl', '')}
            t={t}
          />
        </FormSection>

        {/* Location */}
        <FormSection title={t('seller.settings.storefront.sectionLocation')}>
          <Field
            label={t('seller.settings.storefront.fieldCategory')}
            hint={t('seller.settings.storefront.fieldCategoryHint')}
          >
            <TextInput
              value={form.category}
              onChangeText={(v) => set('category', v)}
              accessibilityLabel={t('seller.settings.storefront.fieldCategory')}
              style={styles.input}
              placeholder={t('seller.settings.storefront.fieldCategoryPlaceholder')}
            />
          </Field>
          <Field
            label={t('seller.settings.storefront.fieldPickup')}
            hint={t('seller.settings.storefront.fieldPickupHint')}
          >
            <TextInput
              value={form.pickupAddress}
              onChangeText={(v) => set('pickupAddress', v)}
              accessibilityLabel={t('seller.settings.storefront.fieldPickup')}
              style={styles.input}
              placeholder={t('seller.settings.storefront.fieldPickupPlaceholder')}
            />
          </Field>
          <Field
            label={t('seller.settings.storefront.fieldReturn')}
            hint={t('seller.settings.storefront.fieldReturnHint')}
          >
            <TextInput
              value={form.returnAddress}
              onChangeText={(v) => set('returnAddress', v)}
              accessibilityLabel={t('seller.settings.storefront.fieldReturn')}
              style={styles.input}
              placeholder={t('seller.settings.storefront.fieldReturnPlaceholder')}
            />
          </Field>
        </FormSection>

        {/* Contact */}
        <FormSection title={t('seller.settings.storefront.sectionContact')}>
          <Field
            label={t('seller.settings.storefront.fieldContactPhone')}
            hint={t('seller.settings.storefront.fieldContactPhoneHint')}
            error={errors.contactPhone ? t('seller.settings.storefront.fieldContactPhoneError') : undefined}
          >
            <TextInput
              value={form.contactPhone}
              onChangeText={(v) => set('contactPhone', v)}
              keyboardType="phone-pad"
              accessibilityLabel={t('seller.settings.storefront.fieldContactPhone')}
              style={[styles.input, errors.contactPhone && styles.inputError]}
              placeholder="9801234567"
            />
          </Field>
          <Field
            label={t('seller.settings.storefront.fieldContactEmail')}
            hint={t('seller.settings.storefront.fieldContactEmailHint')}
            error={errors.contactEmail ? t('seller.settings.storefront.fieldContactEmailError') : undefined}
          >
            <TextInput
              value={form.contactEmail}
              onChangeText={(v) => set('contactEmail', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel={t('seller.settings.storefront.fieldContactEmail')}
              style={[styles.input, errors.contactEmail && styles.inputError]}
              placeholder="hello@store.com"
            />
          </Field>
        </FormSection>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sticky save bar */}
      <View style={styles.saveBar}>
        <View style={styles.saveBarLeft}>
          {saved ? (
            <View style={styles.savedRow}>
              <View style={styles.savedDot} />
              <Text style={styles.savedText}>{t('seller.settings.storefront.saved')}</Text>
            </View>
          ) : dirty ? (
            <View style={styles.savedRow}>
              <View style={styles.dirtyDot} />
              <Text style={styles.dirtyText}>{t('seller.settings.storefront.dirtyIndicator')}</Text>
            </View>
          ) : (
            <Text style={styles.saveBarIdle}>{t('seller.settings.storefront.editSubtitle')}</Text>
          )}
        </View>
        <View style={styles.saveBarRight}>
          <TouchableOpacity
            onPress={() => {
              setForm(initialRef.current)
              setErrors({})
              setSaved(false)
            }}
            disabled={!dirty || saving}
            accessibilityRole="button"
            accessibilityLabel={t('seller.settings.storefront.discard')}
            style={[styles.discardBtn, (!dirty || saving) && styles.btnDisabled]}
          >
            <Text style={styles.discardText}>{t('seller.settings.storefront.discard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!dirty || saving}
            accessibilityRole="button"
            accessibilityLabel={t('seller.settings.storefront.save')}
            style={[styles.saveBtn, (!dirty || saving) && styles.btnDisabled]}
          >
            <Text style={styles.saveBtnText}>
              {saving ? t('seller.settings.storefront.saving') : t('seller.settings.storefront.save')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dirty dialog */}
      <Modal visible={dirtyDialog} transparent animationType="fade" onRequestClose={() => setDirtyDialog(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDirtyDialog(false)} />
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{t('seller.settings.storefront.dirtyDialogTitle')}</Text>
          <Text style={styles.dialogBody}>{t('seller.settings.storefront.dirtyDialogBody')}</Text>
          <TouchableOpacity
            onPress={() => {
              setDirtyDialog(false)
              handleSave()
              pendingNav?.()
              setPendingNav(null)
            }}
            accessibilityRole="button"
            style={styles.dialogSaveBtn}
          >
            <Text style={styles.dialogSaveText}>{t('seller.settings.storefront.dirtyDialogSave')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setDirtyDialog(false)
              pendingNav?.()
              setPendingNav(null)
            }}
            accessibilityRole="button"
            style={styles.dialogDiscardBtn}
          >
            <Text style={styles.dialogDiscardText}>{t('seller.settings.storefront.dirtyDialogDiscard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setDirtyDialog(false)
              setPendingNav(null)
            }}
            accessibilityRole="button"
            style={styles.dialogStayBtn}
          >
            <Text style={styles.dialogStayText}>{t('seller.settings.storefront.dirtyDialogStay')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Crop dialog */}
      <CropDialogMobile
        target={cropTarget}
        title={t('seller.settings.storefront.cropTitle')}
        zoomLabel={t('seller.settings.storefront.cropZoom')}
        saveLabel={t('seller.settings.storefront.cropSave')}
        cancelLabel={t('seller.settings.storefront.cropCancel')}
        ariaLabel={t('seller.settings.storefront.cropAria')}
        onApply={(url) => {
          if (cropTarget) {
            if (cropTarget.kind === 'logo') set('logoUrl', url)
            else set('bannerUrl', url)
          }
          setCropTarget(null)
        }}
        onCancel={() => setCropTarget(null)}
      />
    </View>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? (
        <Text style={styles.fieldError} accessibilityRole="alert">{error}</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  )
}

function ImageUploadMobile({
  kind,
  label,
  hint,
  uploadLabel,
  changeLabel,
  removeLabel,
  ariaLabel,
  value,
  progress,
  onUpload,
  onRemove,
  t,
}: {
  kind: 'logo' | 'banner'
  label: string
  hint: string
  uploadLabel: string
  changeLabel: string
  removeLabel: string
  ariaLabel: string
  value: string
  progress: number | null
  onUpload: () => void
  onRemove: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const isLogo = kind === 'logo'
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.uploadRow}>
        <View style={[styles.uploadPreview, isLogo ? styles.logoPreview : styles.bannerPreview]}>
          {value ? (
            <RNImage source={{ uri: value }} style={styles.uploadImg} resizeMode="cover" />
          ) : (
            <ImageIcon size={20} color={colors.textTertiary} />
          )}
          {progress !== null && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          )}
        </View>
        <View style={styles.uploadControls}>
          <TouchableOpacity
            onPress={onUpload}
            accessibilityRole="button"
            accessibilityLabel={ariaLabel}
            style={styles.uploadBtn}
          >
            <Text style={styles.uploadBtnText}>{value ? changeLabel : uploadLabel}</Text>
          </TouchableOpacity>
          {value ? (
            <TouchableOpacity
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel={removeLabel}
              style={styles.removeBtn}
            >
              <Text style={styles.removeBtnText}>{removeLabel}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.fieldHint}>
            {progress !== null ? t('seller.settings.storefront.uploadProgress', { pct: progress }) : hint}
          </Text>
        </View>
      </View>
    </View>
  )
}

function StorePreview({
  name,
  tagline,
  logoUrl,
  bannerUrl,
  rating,
  reviewCount,
  t,
}: {
  name: string
  tagline: string
  logoUrl: string
  bannerUrl: string
  rating: number
  reviewCount: number
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <View style={styles.previewCard} accessibilityLabel={t('seller.settings.storefront.previewAria')}>
      <View style={styles.previewBanner}>
        {bannerUrl ? (
          <RNImage source={{ uri: bannerUrl }} style={styles.previewBannerImg} resizeMode="cover" />
        ) : (
          <Text style={styles.previewPlaceholder}>{t('seller.settings.storefront.previewNoBanner')}</Text>
        )}
      </View>
      <View style={styles.previewBody}>
        <View style={styles.previewLogoRow}>
          <View style={styles.previewLogo}>
            {logoUrl ? (
              <RNImage source={{ uri: logoUrl }} style={styles.previewLogoImg} resizeMode="cover" />
            ) : (
              <Text style={styles.previewLogoText}>{t('seller.settings.storefront.previewNoLogo')}</Text>
            )}
          </View>
          <View style={styles.previewNameCol}>
            <Text style={styles.previewName} numberOfLines={1}>{name}</Text>
            {tagline ? <Text style={styles.previewTagline} numberOfLines={1}>{tagline}</Text> : null}
          </View>
        </View>
        <View style={styles.previewRatingRow}>
          <Star size={14} color={colors.gold} fill={colors.gold} />
          <Text style={styles.previewRatingValue}>{rating.toFixed(1)}</Text>
          <Text style={styles.previewRatingCount}>
            {t('seller.settings.storefront.ratingReviews', { count: reviewCount })}
          </Text>
        </View>
      </View>
    </View>
  )
}

function CropDialogMobile({
  target,
  title,
  zoomLabel,
  saveLabel,
  cancelLabel,
  ariaLabel,
  onApply,
  onCancel,
}: {
  target: { kind: 'logo' | 'banner'; src: string } | null
  title: string
  zoomLabel: string
  saveLabel: string
  cancelLabel: string
  ariaLabel: string
  onApply: (url: string) => void
  onCancel: () => void
}) {
  const [zoom, setZoom] = useState(1)
  useEffect(() => { setZoom(1) }, [target])
  if (!target) return null
  const isLogo = target.kind === 'logo'
  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel} />
      <View style={styles.dialogCard} accessibilityLabel={ariaLabel}>
        <Text style={styles.dialogTitle}>{title}</Text>
        <View style={[styles.cropPreview, isLogo ? styles.cropPreviewLogo : styles.cropPreviewBanner]}>
          <RNImage
            source={{ uri: target.src }}
            style={[styles.cropImg, { transform: [{ scale: zoom }] }]}
            resizeMode="cover"
          />
        </View>
        <View style={styles.cropControl}>
          <Text style={styles.cropZoomLabel}>{zoomLabel}</Text>
          <View style={styles.cropSliderRow}>
            <Text style={styles.cropSliderMin}>1×</Text>
            <Pressable
              style={styles.cropSliderTrack}
              accessibilityRole="adjustable"
              accessibilityLabel={zoomLabel}
              accessibilityValue={{ min: 1, max: 3, now: zoom, text: `${zoom.toFixed(1)}×` }}
              onPress={(e) => {
                const trackWidth = 200
                const x = e.nativeEvent.locationX
                const pct = Math.max(0, Math.min(1, x / trackWidth))
                setZoom(1 + pct * 2)
              }}
            >
              <View style={[styles.cropSliderFill, { width: `${((zoom - 1) / 2) * 100}%` }]} />
              <View style={[styles.cropSliderThumb, { left: `${((zoom - 1) / 2) * 100}%` }]} />
            </Pressable>
            <Text style={styles.cropSliderMax}>3×</Text>
          </View>
        </View>
        <View style={styles.cropBtnRow}>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button" style={styles.cropCancelBtn}>
            <Text style={styles.cropCancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onApply(target.src)} accessibilityRole="button" style={styles.cropSaveBtn}>
            <Text style={styles.cropSaveText}>{saveLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  topBarDirty: { width: 100, alignItems: 'flex-end' },
  dirtyDotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  dirtyDot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: colors.warning },
  dirtyText: { fontSize: 10, fontWeight: '600', color: colors.warning },
  scroll: { padding: spacing[4], gap: spacing[3] },
  previewSectionHeader: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  previewCard: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  previewBanner: { height: 100, width: '100%', backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  previewBannerImg: { height: '100%', width: '100%' },
  previewPlaceholder: { fontSize: 12, color: colors.textTertiary },
  previewBody: { padding: spacing[3] },
  previewLogoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[3], marginTop: -32 },
  previewLogo: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewLogoImg: { width: '100%', height: '100%' },
  previewLogoText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  previewNameCol: { flex: 1, paddingBottom: spacing[1] },
  previewName: { fontSize: 18, fontWeight: '600', color: colors.text },
  previewTagline: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  previewRatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[2] },
  previewRatingValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  previewRatingCount: { fontSize: 12, color: colors.textMuted },
  previewHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing[1] },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing[3] },
  sectionBody: { gap: spacing[4] },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing[1] },
  fieldHint: { fontSize: 12, fontWeight: '400', color: colors.textMuted, marginTop: spacing[1] },
  fieldError: { fontSize: 12, fontWeight: '400', color: colors.error, marginTop: spacing[1] },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: 14,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  textarea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: 14,
    color: colors.text,
    minHeight: 88,
  },
  uploadRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  uploadPreview: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoPreview: { width: 64, height: 64 },
  bannerPreview: { width: 96, height: 56 },
  uploadImg: { width: '100%', height: '100%' },
  progressTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: colors.borderLight },
  progressFill: { height: 3, backgroundColor: colors.primary },
  uploadControls: { flex: 1, gap: spacing[1.5] },
  uploadBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    alignSelf: 'flex-start',
  },
  uploadBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  removeBtn: { paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  removeBtnText: { fontSize: 13, fontWeight: '600', color: colors.error },
  saveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  saveBarLeft: { flex: 1 },
  saveBarIdle: { fontSize: 12, color: colors.textTertiary },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  savedDot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: colors.success },
  savedText: { fontSize: 12, fontWeight: '600', color: colors.success },
  saveBarRight: { flexDirection: 'row', gap: spacing[2] },
  discardBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  discardText: { fontSize: 13, fontWeight: '600', color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  btnDisabled: { opacity: 0.4 },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: colors.overlay },
  dialogCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing[5],
    gap: spacing[3],
  },
  dialogTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  dialogBody: { fontSize: 14, color: colors.textSecondary },
  dialogSaveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  dialogSaveText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  dialogDiscardBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  dialogDiscardText: { color: colors.error, fontWeight: '600', fontSize: 14 },
  dialogStayBtn: { paddingVertical: spacing[2], alignItems: 'center' },
  dialogStayText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  cropPreview: { overflow: 'hidden', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignSelf: 'center' },
  cropPreviewLogo: { width: 192, height: 192 },
  cropPreviewBanner: { width: 320, height: 90 },
  cropImg: { width: '100%', height: '100%' },
  cropControl: { gap: spacing[1.5] },
  cropZoomLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  cropSliderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cropSliderMin: { fontSize: 11, color: colors.textMuted },
  cropSliderMax: { fontSize: 11, color: colors.textMuted },
  cropSliderTrack: { flex: 1, height: 32, justifyContent: 'center' },
  cropSliderFill: { height: 4, borderRadius: radii.full, backgroundColor: colors.primary },
  cropSliderThumb: { position: 'absolute', width: 16, height: 16, borderRadius: radii.full, backgroundColor: colors.primary, marginLeft: -8 },
  cropBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2] },
  cropCancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  cropCancelText: { fontSize: 13, fontWeight: '600', color: colors.text },
  cropSaveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2.5] },
  cropSaveText: { fontSize: 13, fontWeight: '700', color: colors.white },
})
