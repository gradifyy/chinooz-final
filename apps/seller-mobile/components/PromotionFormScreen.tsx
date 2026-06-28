import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { BottomSheet } from '@chinooz/ui'
import { useA11y } from './A11yProvider'
import { analytics } from '@chinooz/analytics'
import {
  promotionFormSchema,
  promotionTypeValueSectionSchema,
  promotionTargetsSectionSchema,
  promotionScheduleSectionSchema,
} from '@chinooz/validation'
import {
  getPromotionById,
  createPromotion,
  updatePromotion,
  PROMOTION_TYPES,
  type Promotion,
  type PromotionType,
  type PromotionScope,
} from '@chinooz/mock-data'

type SectionKey = 'typeValue' | 'targets' | 'schedule'

interface FormState {
  name: string
  type: PromotionType
  discountValue: string
  code: string
  isCoupon: boolean
  scope: PromotionScope
  scopeLabel: string
  startsAt: string
  endsAt: string
  budget: string
  status: 'active' | 'scheduled' | 'expired' | 'draft'
  bogoBuyQty: string
  bogoGetQty: string
  minOrderValue: string
  minQty: string
  firstOrderOnly: boolean
  perCustomerLimit: string
  combinable: boolean
  activeImmediately: boolean
  noEndDate: boolean
  totalUses: string
  visibility: 'auto' | 'code'
  showOnStorefront: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  type: 'percentage',
  discountValue: '',
  code: '',
  isCoupon: false,
  scope: 'all',
  scopeLabel: '',
  startsAt: '',
  endsAt: '',
  budget: '',
  status: 'draft',
  bogoBuyQty: '2',
  bogoGetQty: '1',
  minOrderValue: '',
  minQty: '',
  firstOrderOnly: false,
  perCustomerLimit: '',
  combinable: false,
  activeImmediately: true,
  noEndDate: false,
  totalUses: '',
  visibility: 'auto',
  showOnStorefront: true,
}

const SECTION_ICONS: Record<SectionKey, string> = {
  typeValue: '🏷',
  targets: '🎯',
  schedule: '📅',
}

const TYPE_ICONS: Record<PromotionType, string> = {
  percentage: '%',
  fixed: 'रु',
  flash_sale: '⚡',
  bogo: '🎁',
  free_shipping: '🚚',
}

const SPRING_CONFIG = { damping: 25, stiffness: 300, mass: 0.8 }

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function fmtNPR(n: number): string {
  return n.toLocaleString()
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function getTimeRemaining(target: string): { total: number; days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, new Date(target).getTime() - Date.now())
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((total % (1000 * 60)) / 1000)
  return { total, days, hours, minutes, seconds }
}

function countdownStr(r: ReturnType<typeof getTimeRemaining>): string {
  if (r.days > 0) return `${r.days}d ${pad(r.hours)}h ${pad(r.minutes)}m`
  return `${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}`
}

export default function PromotionFormScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()

  const editId = (params?.id as string) || undefined
  const isEdit = !!editId

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [initialForm, setInitialForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showUnsaved, setShowUnsaved] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['typeValue']))

  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snackbarOpacity = useSharedValue(0)

  const { data: existingPromo } = useQuery({
    queryKey: ['promotion', editId],
    queryFn: () => (editId ? getPromotionById(editId) : Promise.resolve(null)),
    enabled: !!editId,
  })

  useEffect(() => {
    analytics.screen({ name: isEdit ? 'seller-promotion-edit' : 'seller-promotion-new' })
  }, [isEdit])

  useEffect(() => {
    if (!isEdit || !existingPromo) return
    const loaded: FormState = {
      name: existingPromo.name,
      type: existingPromo.type,
      discountValue: String(existingPromo.discountValue),
      code: existingPromo.code,
      isCoupon: existingPromo.isCoupon,
      scope: existingPromo.scope,
      scopeLabel: existingPromo.scopeLabel ?? '',
      startsAt: existingPromo.startsAt.slice(0, 10),
      endsAt: existingPromo.endsAt.slice(0, 10),
      budget: existingPromo.budget ? String(existingPromo.budget) : '',
      status: existingPromo.status,
      bogoBuyQty: '2',
      bogoGetQty: '1',
      minOrderValue: '',
      minQty: '',
      firstOrderOnly: false,
      perCustomerLimit: '',
      combinable: false,
      activeImmediately: true,
      noEndDate: false,
      totalUses: '',
      visibility: 'auto',
      showOnStorefront: true,
    }
    setForm(loaded)
    setInitialForm(loaded)
  }, [isEdit, existingPromo])

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm])

  useEffect(() => {
    return () => { if (snackbarTimer.current) clearTimeout(snackbarTimer.current) }
  }, [])

  const showSnackbar = useCallback((msg: string) => {
    setSnackbar(msg)
    snackbarOpacity.value = reducedMotion ? 1 : withTiming(1, { duration: 200 })
    try { if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current)
    snackbarTimer.current = setTimeout(() => {
      setSnackbar(null)
      snackbarOpacity.value = reducedMotion ? 0 : withTiming(0, { duration: 200 })
    }, 3000)
  }, [reducedMotion, snackbarOpacity])

  const snackbarStyle = useAnimatedStyle(() => ({
    opacity: snackbarOpacity.value,
    transform: [{ translateY: snackbarOpacity.value === 1 ? 0 : 20 }],
  }))

  const updateField = useCallback((field: keyof FormState, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
  }, [])

  const toggleSection = (key: SectionKey) => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const parseData = useMemo(() => ({
    ...form,
    discountValue: form.discountValue ? Number(form.discountValue) : 0,
    budget: form.budget ? Number(form.budget) : undefined,
    productsCount: 0,
    bogoBuyQty: form.bogoBuyQty ? Number(form.bogoBuyQty) : undefined,
    bogoGetQty: form.bogoGetQty ? Number(form.bogoGetQty) : undefined,
    minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
    minQty: form.minQty ? Number(form.minQty) : undefined,
    perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : undefined,
    firstOrderOnly: form.firstOrderOnly,
    combinable: form.combinable,
  } as any), [form])

  const sectionErrors = useMemo(() => {
    const sections: Record<SectionKey, number> = { typeValue: 0, targets: 0, schedule: 0 }
    const r1 = promotionTypeValueSectionSchema.safeParse(parseData)
    if (!r1.success) sections.typeValue = r1.error.issues.length
    const r2 = promotionTargetsSectionSchema.safeParse(parseData)
    if (!r2.success) sections.targets = r2.error.issues.length
    const r3 = promotionScheduleSectionSchema.safeParse(parseData)
    if (!r3.success) sections.schedule = r3.error.issues.length
    return sections
  }, [parseData])

  const totalErrors = Object.values(sectionErrors).reduce((a, b) => a + b, 0)

  const sectionComplete = useMemo(() => ({
    typeValue: sectionErrors.typeValue === 0,
    targets: sectionErrors.targets === 0,
    schedule: sectionErrors.schedule === 0,
  }), [sectionErrors])

  const validateAll = (): boolean => {
    const result = promotionFormSchema.safeParse(parseData)
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (!newErrors[field]) newErrors[field] = issue.message
      }
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }

  const buildPromoInput = (status: 'active' | 'draft') => ({
    name: form.name,
    type: form.type,
    status,
    discountValue: Number(form.discountValue) || 0,
    code: form.code || '',
    isCoupon: form.isCoupon,
    scope: form.scope,
    scopeLabel: form.scope === 'category' ? form.scopeLabel : undefined,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
    budget: form.budget ? Number(form.budget) : undefined,
    productsCount: 0,
  })

  const handleSaveDraft = async () => {
    setSaveState('saving')
    try {
      if (isEdit && editId) {
        await updatePromotion(editId, { ...buildPromoInput('draft'), id: editId })
      } else {
        await createPromotion(buildPromoInput('draft'))
      }
      setSaveState('saved')
      setInitialForm(form)
      showSnackbar(t('seller.promotions.builder.saved'))
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('idle')
      showSnackbar(t('seller.promotions.builder.saveError'))
    }
  }

  const handleActivate = async () => {
    if (!validateAll()) {
      showSnackbar(t('seller.promotions.builder.errorSummary', { count: totalErrors }))
      return
    }
    setPublishing(true)
    try {
      if (isEdit && editId) {
        await updatePromotion(editId, { ...buildPromoInput('active'), id: editId })
      } else {
        await createPromotion(buildPromoInput('active'))
      }
      setPublishing(false)
      setInitialForm(form)
      showSnackbar(t('seller.promotions.builder.activate'))
      setTimeout(() => router.push('/promotions'), 1200)
    } catch {
      setPublishing(false)
      showSnackbar(t('seller.promotions.builder.saveError'))
    }
  }

  const handleBack = () => {
    if (isDirty) setShowUnsaved(true)
    else router.push('/promotions')
  }

  const debouncedForm = useDebounced(form, 250)
  const previewData = useMemo(() => {
    const dv = Number(debouncedForm.discountValue) || 0
    const compareAt = 2000
    let price = compareAt
    if (debouncedForm.type === 'percentage' || debouncedForm.type === 'flash_sale') {
      price = Math.round(compareAt * (1 - dv / 100))
    } else if (debouncedForm.type === 'fixed') {
      price = Math.max(0, compareAt - dv)
    }
    return { name: debouncedForm.name || t('seller.promotions.builder.previewName'), price, compareAt, type: debouncedForm.type, discountValue: dv, code: debouncedForm.code, isCoupon: debouncedForm.isCoupon, endsAt: debouncedForm.endsAt }
  }, [debouncedForm, t])

  const [countdown, setCountdown] = useState(() => getTimeRemaining(new Date(Date.now() + 7 * 86400000).toISOString()))
  useEffect(() => {
    if (!previewData.endsAt) return
    const target = new Date(previewData.endsAt).toISOString()
    const r = getTimeRemaining(target)
    setCountdown(r)
    if (r.total <= 0) return
    const id = setInterval(() => {
      const r2 = getTimeRemaining(target)
      setCountdown(r2)
      if (r2.total <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [previewData.endsAt])

  const sections: { key: SectionKey; label: string; hint: string }[] = [
    { key: 'typeValue', label: t('seller.promotions.builder.sectionTypeValue'), hint: t('seller.promotions.builder.fieldTypeHint') },
    { key: 'targets', label: t('seller.promotions.builder.sectionTargets'), hint: t('seller.promotions.builder.fieldScope') },
    { key: 'schedule', label: t('seller.promotions.builder.sectionSchedule'), hint: t('seller.promotions.builder.fieldStartsAtHint') },
  ]

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={t('seller.promotions.builder.backAria')}
            hitSlop={8}
            style={styles.backBtn}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>
              {isEdit ? t('seller.promotions.builder.editTitle') : t('seller.promotions.builder.newTitle')}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{t('seller.promotions.builder.subtitle')}</Text>
          </View>
          {saveState === 'saving' && <Text style={styles.saveIndicator}>{t('seller.promotions.builder.saving')}</Text>}
          {saveState === 'saved' && <Text style={styles.savedIndicator}>✓ {t('seller.promotions.builder.saved')}</Text>}
          {totalErrors > 0 && (
            <View style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>{totalErrors}</Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Live preview */}
          <PreviewCard data={previewData} countdown={countdown} t={t} />

          {/* Collapsible sections */}
          {sections.map(s => (
            <CollapsibleSection
              key={s.key}
              sectionKey={s.key}
              label={s.label}
              hint={s.hint}
              complete={sectionComplete[s.key]}
              errorCount={sectionErrors[s.key]}
              expanded={expandedSections.has(s.key)}
              onToggle={() => toggleSection(s.key)}
              reducedMotion={reducedMotion}
            >
              {s.key === 'typeValue' && <TypeValueSection form={form} errors={errors} updateField={updateField} t={t} />}
              {s.key === 'targets' && <TargetsSection form={form} errors={errors} updateField={updateField} t={t} />}
              {s.key === 'schedule' && <ScheduleSection form={form} errors={errors} updateField={updateField} t={t} />}
            </CollapsibleSection>
          ))}

          {/* Error summary */}
          {totalErrors > 0 && (
            <View style={styles.errorSummary} accessibilityRole="alert" accessible={true}>
              <Text style={styles.errorSummaryTitle}>
                {t('seller.promotions.builder.errorSummary', { count: totalErrors })}
              </Text>
              {Object.entries(errors).map(([field, msg]) => (
                <Text key={field} style={styles.errorSummaryItem}>• {msg}</Text>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky save bar */}
      <View style={[styles.saveBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
        <TouchableOpacity
          onPress={handleSaveDraft}
          disabled={publishing}
          accessibilityRole="button"
          accessibilityLabel={t('seller.promotions.builder.saveDraftAria')}
          style={styles.saveDraftBtn}
        >
          <Text style={styles.saveDraftText}>{t('seller.promotions.builder.saveDraft')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleActivate}
          disabled={publishing}
          accessibilityRole="button"
          accessibilityLabel={t('seller.promotions.builder.activateAria')}
          style={styles.activateBtn}
        >
          <Text style={styles.activateText}>
            {publishing ? '…' : t('seller.promotions.builder.activate')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dirty guard */}
      <BottomSheet
        visible={showUnsaved}
        onClose={() => setShowUnsaved(false)}
        title={t('seller.promotions.builder.dirtyDialogTitle')}
      >
        <Text style={styles.dirtyBody}>{t('seller.promotions.builder.dirtyDialogBody')}</Text>
        <View style={styles.dirtyActions}>
          <TouchableOpacity onPress={() => setShowUnsaved(false)} style={styles.dirtyCancelBtn}>
            <Text style={styles.dirtyCancelText}>{t('seller.promotions.builder.dirtyDialogCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowUnsaved(false); router.push('/promotions') }}
            style={styles.dirtyDiscardBtn}
          >
            <Text style={styles.dirtyDiscardText}>{t('seller.promotions.builder.dirtyDialogDiscard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => { setShowUnsaved(false); await handleSaveDraft(); router.push('/promotions') }}
            style={styles.dirtySaveBtn}
          >
            <Text style={styles.dirtySaveText}>{t('seller.promotions.builder.dirtyDialogSave')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Snackbar */}
      {snackbar && (
        <Animated.View
          style={[styles.snackbar, snackbarStyle]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.snackbarIcon}>✓</Text>
          <Text style={styles.snackbarText}>{snackbar}</Text>
        </Animated.View>
      )}
    </View>
  )
}

type TT = (key: string, opts?: Record<string, unknown>) => string

// ---- Collapsible section ----

function CollapsibleSection({
  sectionKey,
  label,
  hint,
  complete,
  errorCount,
  expanded,
  onToggle,
  reducedMotion,
  children,
}: {
  sectionKey: SectionKey
  label: string
  hint: string
  complete: boolean
  errorCount: number
  expanded: boolean
  onToggle: () => void
  reducedMotion: boolean
  children: React.ReactNode
}) {
  const height = useSharedValue(expanded ? 1 : 0)
  const rotate = useSharedValue(expanded ? 1 : 0)

  useEffect(() => {
    height.value = expanded ? 1 : 0
    rotate.value = expanded ? 1 : 0
  }, [expanded])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: height.value,
    transform: [{ scaleY: reducedMotion ? 1 : withSpring(height.value, SPRING_CONFIG) }],
  }))

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(reducedMotion ? (expanded ? 180 : 0) : rotate.value * 180)}deg` }],
  }))

  return (
    <View style={styles.sectionCard}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={label}
        style={styles.sectionHeader}
      >
        <Text style={styles.sectionIcon}>{SECTION_ICONS[sectionKey]}</Text>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{label}</Text>
          <Text style={styles.sectionHint} numberOfLines={1}>{hint}</Text>
        </View>
        {complete ? (
          <Text style={styles.checkIcon}>✓</Text>
        ) : errorCount > 0 ? (
          <View style={styles.errorDot}>
            <Text style={styles.errorDotText}>{errorCount}</Text>
          </View>
        ) : null}
        <Animated.Text style={[styles.chevron, chevronStyle]}>▾</Animated.Text>
      </Pressable>
      {expanded && (
        <Animated.View style={[styles.sectionBody, contentStyle]}>
          {children}
        </Animated.View>
      )}
    </View>
  )
}

// ---- Form sections ----

function Field({ label, hint, error, errorId, children }: { label: string; hint?: string; error?: string; errorId?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
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

function TypeValueSection({ form, errors, updateField, t }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string | boolean) => void; t: TT }) {
  const [codeAnnounce, setCodeAnnounce] = useState('')

  const generateCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    updateField('code', code)
    setCodeAnnounce(t('seller.promotions.builder.codeGenerated', { code }))
    setTimeout(() => setCodeAnnounce(''), 3000)
  }, [updateField, t])

  const isPercent = form.type === 'percentage' || form.type === 'flash_sale'
  const isBogo = form.type === 'bogo'
  const isFreeShip = form.type === 'free_shipping'

  return (
    <View style={styles.sectionContent}>
      <Field label={t('seller.promotions.builder.fieldName')} hint={t('seller.promotions.builder.fieldNameHint')} error={errors.name}>
        <TextInput
          value={form.name}
          onChangeText={v => updateField('name', v)}
          placeholder="e.g. Dashain Dhamaka"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={t('seller.promotions.builder.fieldName')}
          style={[styles.input, errors.name && styles.inputError]}
        />
      </Field>

      {/* Type chooser — selectable cards */}
      <View>
        <Text style={styles.fieldLabel}>{t('seller.promotions.builder.fieldType')}</Text>
        <Text style={styles.fieldHint}>{t('seller.promotions.builder.fieldTypeHint')}</Text>
        <View style={styles.typeGrid}>
          {PROMOTION_TYPES.map(tt => {
            const selected = form.type === tt.key
            const shortKey = tt.key === 'percentage' ? 'typePercentageShort' : tt.key === 'fixed' ? 'typeFixedShort' : tt.key === 'flash_sale' ? 'typeFlashSaleShort' : tt.key === 'bogo' ? 'typeBogoShort' : 'typeFreeShippingShort'
            return (
              <TouchableOpacity
                key={tt.key}
                onPress={() => updateField('type', tt.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={t(`seller.promotions.${shortKey}`)}
                style={[styles.typeCard, selected && styles.typeCardActive]}
                activeOpacity={0.7}
              >
                <View style={[styles.typeCardIcon, selected && styles.typeCardIconActive]}>
                  <Text style={[styles.typeCardIconText, selected && styles.typeCardIconTextActive]}>{TYPE_ICONS[tt.key]}</Text>
                </View>
                <Text style={[styles.typeCardLabel, selected && styles.typeCardLabelActive]} numberOfLines={1}>
                  {t(`seller.promotions.${shortKey}`)}
                </Text>
                {selected && (
                  <View style={styles.typeCardCheck}>
                    <Text style={styles.typeCardCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Adapted value inputs */}
      {!isFreeShip && !isBogo && (
        <Field label={t('seller.promotions.builder.fieldDiscountValue')} hint={isPercent ? t('seller.promotions.builder.fieldDiscountValueHint') : undefined} error={errors.discountValue}>
          <View style={styles.inputWithSuffix}>
            <TextInput
              value={form.discountValue}
              onChangeText={v => updateField('discountValue', v)}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('seller.promotions.builder.fieldDiscountValue')}
              keyboardType="numeric"
              inputMode="numeric"
              style={[styles.input, styles.inputWithSuffixInput, errors.discountValue && styles.inputError]}
            />
            <Text style={styles.suffixText}>{isPercent ? '%' : 'NPR'}</Text>
          </View>
          {isPercent && Number(form.discountValue) > 100 && (
            <Text style={styles.fieldError}>Percentage cannot exceed 100</Text>
          )}
        </Field>
      )}

      {/* BOGO qty pickers */}
      {isBogo && (
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <View style={{ flex: 1 }}>
            <Field label={t('seller.promotions.builder.fieldBogoBuyQty')} hint={t('seller.promotions.builder.fieldBogoBuyQtyHint')}>
              <TextInput
                value={form.bogoBuyQty}
                onChangeText={v => updateField('bogoBuyQty', v)}
                placeholder="2"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel={t('seller.promotions.builder.fieldBogoBuyQty')}
                keyboardType="numeric"
                inputMode="numeric"
                style={styles.input}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t('seller.promotions.builder.fieldBogoGetQty')} hint={t('seller.promotions.builder.fieldBogoGetQtyHint')}>
              <TextInput
                value={form.bogoGetQty}
                onChangeText={v => updateField('bogoGetQty', v)}
                placeholder="1"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel={t('seller.promotions.builder.fieldBogoGetQty')}
                keyboardType="numeric"
                inputMode="numeric"
                style={styles.input}
              />
            </Field>
          </View>
        </View>
      )}

      {/* Coupon toggle */}
      <TouchableOpacity
        onPress={() => updateField('isCoupon', !form.isCoupon)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: form.isCoupon }}
        style={styles.checkboxRow}
      >
        <View style={[styles.checkbox, form.isCoupon && styles.checkboxChecked]}>
          {form.isCoupon && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>{t('seller.promotions.builder.fieldIsCoupon')}</Text>
      </TouchableOpacity>
      <Text style={styles.checkboxHint}>{t('seller.promotions.builder.fieldIsCouponHint')}</Text>

      {/* Code generator */}
      {form.isCoupon && (
        <Field label={t('seller.promotions.builder.fieldCode')} hint={t('seller.promotions.builder.fieldCodeHint')} error={errors.code}>
          <View style={styles.codeRow}>
            <TextInput
              value={form.code}
              onChangeText={v => updateField('code', v.toUpperCase())}
              placeholder="DASHAIN25"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('seller.promotions.builder.fieldCode')}
              autoCapitalize="characters"
              style={[styles.input, styles.codeInput, styles.codeInputFlex, errors.code && styles.inputError]}
            />
            <TouchableOpacity
              onPress={generateCode}
              accessibilityRole="button"
              accessibilityLabel={t('seller.promotions.builder.generateCodeAria')}
              style={styles.generateBtn}
            >
              <Text style={styles.generateBtnIcon}>↻</Text>
              <Text style={styles.generateBtnText}>{t('seller.promotions.builder.generateCode')}</Text>
            </TouchableOpacity>
          </View>
          {codeAnnounce ? (
            <Text style={styles.codeAnnounce} accessibilityRole="alert" accessibilityLiveRegion="polite">{codeAnnounce}</Text>
          ) : null}
        </Field>
      )}

      {/* Effective price example */}
      <EffectivePriceCard form={form} t={t} />
    </View>
  )
}

function TargetsSection({ form, errors, updateField, t }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string | boolean) => void; t: TT }) {
  const scopeOptions: { key: PromotionScope; label: string }[] = [
    { key: 'all', label: t('seller.promotions.builder.fieldScopeAll') },
    { key: 'category', label: t('seller.promotions.builder.fieldScopeCategory') },
    { key: 'products', label: t('seller.promotions.builder.fieldScopeProducts') },
    { key: 'order', label: t('seller.promotions.builder.fieldScopeOrder') },
  ]
  return (
    <View style={styles.sectionContent}>
      {/* Scope chooser */}
      <View>
        <Text style={styles.fieldLabel}>{t('seller.promotions.builder.fieldScope')}</Text>
        <View style={styles.scopeRow}>
          {scopeOptions.map(opt => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => updateField('scope', opt.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: form.scope === opt.key }}
              accessibilityLabel={opt.label}
              style={[styles.scopeChip, form.scope === opt.key && styles.scopeChipActive]}
            >
              <Text style={[styles.scopeChipText, form.scope === opt.key && styles.scopeChipTextActive]} numberOfLines={1}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {form.scope === 'category' && (
        <Field label={t('seller.promotions.builder.fieldScopeLabel')} hint={t('seller.promotions.builder.fieldScopeLabelHint')} error={errors.scopeLabel}>
          <TextInput
            value={form.scopeLabel}
            onChangeText={v => updateField('scopeLabel', v)}
            placeholder="e.g. Electronics"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('seller.promotions.builder.fieldScopeLabel')}
            style={[styles.input, errors.scopeLabel && styles.inputError]}
          />
        </Field>
      )}

      {form.scope === 'products' && (
        <View style={styles.productPickerPlaceholder}>
          <Text style={styles.productPickerText}>Product picker — select specific products to include.</Text>
        </View>
      )}

      {/* Conditions group */}
      <View style={styles.conditionsGroup}>
        <Text style={styles.conditionsTitle}>{t('seller.promotions.builder.conditionsTitle')}</Text>
        <Text style={styles.conditionsHint}>{t('seller.promotions.builder.conditionsHint')}</Text>
        <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            <View style={{ flex: 1 }}>
              <Field label={t('seller.promotions.builder.fieldMinOrderValue')} hint={t('seller.promotions.builder.fieldMinOrderValueHint')}>
                <View style={styles.inputWithSuffix}>
                  <TextInput
                    value={form.minOrderValue}
                    onChangeText={v => updateField('minOrderValue', v)}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    accessibilityLabel={t('seller.promotions.builder.fieldMinOrderValue')}
                    keyboardType="numeric"
                    inputMode="numeric"
                    style={[styles.input, styles.inputWithSuffixInput]}
                  />
                  <Text style={styles.suffixText}>NPR</Text>
                </View>
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('seller.promotions.builder.fieldMinQty')} hint={t('seller.promotions.builder.fieldMinQtyHint')}>
                <TextInput
                  value={form.minQty}
                  onChangeText={v => updateField('minQty', v)}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel={t('seller.promotions.builder.fieldMinQty')}
                  keyboardType="numeric"
                  inputMode="numeric"
                  style={styles.input}
                />
              </Field>
            </View>
          </View>
          <Field label={t('seller.promotions.builder.fieldPerCustomerLimit')} hint={t('seller.promotions.builder.fieldPerCustomerLimitHint')}>
            <TextInput
              value={form.perCustomerLimit}
              onChangeText={v => updateField('perCustomerLimit', v)}
              placeholder="0 = unlimited"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('seller.promotions.builder.fieldPerCustomerLimit')}
              keyboardType="numeric"
              inputMode="numeric"
              style={styles.input}
            />
          </Field>
          <ToggleRow
            label={t('seller.promotions.builder.fieldFirstOrderOnly')}
            hint={t('seller.promotions.builder.fieldFirstOrderOnlyHint')}
            checked={form.firstOrderOnly}
            onChange={v => updateField('firstOrderOnly', v)}
          />
          <ToggleRow
            label={t('seller.promotions.builder.fieldCombinable')}
            hint={t('seller.promotions.builder.fieldCombinableHint')}
            checked={form.combinable}
            onChange={v => updateField('combinable', v)}
          />
        </View>
      </View>
    </View>
  )
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHint}>{hint}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onChange(!checked)}
        accessibilityRole="switch"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        style={[styles.toggleSwitch, checked && styles.toggleSwitchActive]}
      >
        <View style={[styles.toggleKnob, checked && styles.toggleKnobActive]} />
      </TouchableOpacity>
    </View>
  )
}

function EffectivePriceCard({ form, t }: { form: FormState; t: TT }) {
  const original = 2000
  const dv = Number(form.discountValue) || 0
  let discounted = original
  let youSave = 0
  let label = t('seller.promotions.builder.effectiveNoDiscount')

  if (form.type === 'percentage' || form.type === 'flash_sale') {
    discounted = Math.round(original * (1 - Math.min(dv, 100) / 100))
    youSave = original - discounted
    label = `${dv}% OFF`
  } else if (form.type === 'fixed') {
    discounted = Math.max(0, original - dv)
    youSave = original - discounted
    label = `NPR ${fmtNPR(dv)} OFF`
  } else if (form.type === 'bogo') {
    label = t('seller.promotions.builder.effectiveBogo', { buy: form.bogoBuyQty || '2', get: form.bogoGetQty || '1' })
  } else if (form.type === 'free_shipping') {
    label = t('seller.promotions.builder.effectiveFreeShip')
  }

  const vat = Math.round(discounted * 0.13 / 1.13)
  const showPrice = form.type !== 'bogo' && form.type !== 'free_shipping'

  return (
    <View style={styles.effectiveCard} accessibilityLabel={t('seller.promotions.builder.effectivePriceTitle')}>
      <Text style={styles.effectiveTitle}>{t('seller.promotions.builder.effectivePriceTitle')}</Text>
      <Text style={styles.effectiveSubtitle}>{t('seller.promotions.builder.effectivePriceSubtitle')}</Text>
      <View style={styles.effectiveBody}>
        <View style={{ flex: 1 }}>
          {showPrice ? (
            <>
              <View style={styles.effectivePriceRow}>
                <Text style={styles.effectivePrice}>NPR {fmtNPR(discounted)}</Text>
                {original > discounted && (
                  <Text style={styles.effectiveOriginal}>NPR {fmtNPR(original)}</Text>
                )}
              </View>
              {youSave > 0 && (
                <Text style={styles.effectiveSave}>
                  {t('seller.promotions.builder.effectiveYouSave', { amount: fmtNPR(youSave) })}
                </Text>
              )}
              <Text style={styles.effectiveVat}>
                {t('seller.promotions.builder.effectiveVat')} · NPR {fmtNPR(vat)}
              </Text>
            </>
          ) : (
            <Text style={styles.effectiveLabel}>{label}</Text>
          )}
        </View>
        <View style={styles.effectiveBadge}>
          <Text style={styles.effectiveBadgeText}>{label}</Text>
        </View>
      </View>
    </View>
  )
}

function ScheduleSection({ form, errors, updateField, t }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string | boolean) => void; t: TT }) {
  const visibilitySegs = [
    { key: 'auto' as const, label: t('seller.promotions.builder.visibilityAuto') },
    { key: 'code' as const, label: t('seller.promotions.builder.visibilityCode') },
  ]

  return (
    <View style={styles.sectionContent}>
      {/* Active immediately toggle */}
      <ToggleRow
        label={t('seller.promotions.builder.fieldActiveImmediately')}
        hint={t('seller.promotions.builder.fieldActiveImmediatelyHint')}
        checked={form.activeImmediately}
        onChange={v => updateField('activeImmediately', v)}
      />

      {/* Start date-time */}
      {!form.activeImmediately && (
        <Field label={t('seller.promotions.builder.fieldStartsAt')} hint={t('seller.promotions.builder.fieldStartsAtHint')} error={errors.startsAt}>
          <TextInput
            value={form.startsAt}
            onChangeText={v => updateField('startsAt', v)}
            placeholder="YYYY-MM-DDTHH:MM"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('seller.promotions.builder.fieldStartsAt')}
            style={[styles.input, errors.startsAt && styles.inputError]}
          />
          <Text style={styles.timezoneText}>{t('seller.promotions.builder.timezone')}</Text>
        </Field>
      )}

      {/* No end date toggle */}
      <ToggleRow
        label={t('seller.promotions.builder.fieldNoEndDate')}
        hint={t('seller.promotions.builder.fieldNoEndDateHint')}
        checked={form.noEndDate}
        onChange={v => updateField('noEndDate', v)}
      />

      {/* End date-time */}
      {!form.noEndDate && (
        <Field label={t('seller.promotions.builder.fieldEndsAt')} hint={t('seller.promotions.builder.fieldEndsAtHint')} error={errors.endsAt}>
          <TextInput
            value={form.endsAt}
            onChangeText={v => updateField('endsAt', v)}
            placeholder="YYYY-MM-DDTHH:MM"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('seller.promotions.builder.fieldEndsAt')}
            style={[styles.input, errors.endsAt && styles.inputError]}
          />
        </Field>
      )}

      {/* Usage limits */}
      <View style={styles.conditionsGroup}>
        <Text style={styles.conditionsTitle}>Usage limits</Text>
        <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            <View style={{ flex: 1 }}>
              <Field label={t('seller.promotions.builder.fieldTotalUses')} hint={t('seller.promotions.builder.fieldTotalUsesHint')} error={errors.totalUses}>
                <TextInput
                  value={form.totalUses}
                  onChangeText={v => updateField('totalUses', v)}
                  placeholder="0 = unlimited"
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel={t('seller.promotions.builder.fieldTotalUses')}
                  keyboardType="numeric"
                  inputMode="numeric"
                  style={[styles.input, errors.totalUses && styles.inputError]}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('seller.promotions.builder.fieldPerCustomerLimit')} hint={t('seller.promotions.builder.fieldPerCustomerLimitHint')}>
                <TextInput
                  value={form.perCustomerLimit}
                  onChangeText={v => updateField('perCustomerLimit', v)}
                  placeholder="0 = unlimited"
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel={t('seller.promotions.builder.fieldPerCustomerLimit')}
                  keyboardType="numeric"
                  inputMode="numeric"
                  style={styles.input}
                />
              </Field>
            </View>
          </View>
          <Field label={t('seller.promotions.builder.fieldBudgetCap')} hint={t('seller.promotions.builder.fieldBudgetCapHint')}>
            <View style={styles.inputWithSuffix}>
              <TextInput
                value={form.budget}
                onChangeText={v => updateField('budget', v)}
                placeholder="0 = unlimited"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel={t('seller.promotions.builder.fieldBudgetCap')}
                keyboardType="numeric"
                inputMode="numeric"
                style={[styles.input, styles.inputWithSuffixInput]}
              />
              <Text style={styles.suffixText}>NPR</Text>
            </View>
          </Field>
        </View>
      </View>

      {/* Visibility */}
      <View style={styles.conditionsGroup}>
        <Text style={styles.conditionsTitle}>{t('seller.promotions.builder.visibilityTitle')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
          {visibilitySegs.map(seg => (
            <TouchableOpacity
              key={seg.key}
              onPress={() => updateField('visibility', seg.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: form.visibility === seg.key }}
              accessibilityLabel={seg.label}
              style={[styles.scopeChip, { flex: 1, alignItems: 'center' }, form.visibility === seg.key && styles.scopeChipActive]}
            >
              <Text style={[styles.scopeChipText, form.visibility === seg.key && styles.scopeChipTextActive]}>
                {seg.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.conditionsHint}>
          {form.visibility === 'auto' ? t('seller.promotions.builder.visibilityAutoHint') : t('seller.promotions.builder.visibilityCodeHint')}
        </Text>
        <View style={{ marginTop: spacing[3] }}>
          <ToggleRow
            label={t('seller.promotions.builder.fieldShowOnStorefront')}
            hint={t('seller.promotions.builder.fieldShowOnStorefrontHint')}
            checked={form.showOnStorefront}
            onChange={v => updateField('showOnStorefront', v)}
          />
        </View>
      </View>

      {/* Plain-language rule summary */}
      <RuleSummaryCard form={form} t={t} />
    </View>
  )
}

function RuleSummaryCard({ form, t }: { form: FormState; t: TT }) {
  const dv = Number(form.discountValue) || 0
  const discountLabel = form.type === 'percentage' || form.type === 'flash_sale'
    ? t('seller.promotions.builder.ruleSummaryDiscount', { value: `${dv}%` })
    : form.type === 'fixed'
      ? t('seller.promotions.builder.ruleSummaryDiscount', { value: `NPR ${fmtNPR(dv)}` })
      : form.type === 'bogo'
        ? t('seller.promotions.builder.effectiveBogo', { buy: form.bogoBuyQty || '2', get: form.bogoGetQty || '1' })
        : t('seller.promotions.builder.effectiveFreeShip')

  const scopeLabel = form.scope === 'all'
    ? t('seller.promotions.builder.ruleSummaryScope')
    : form.scope === 'category'
      ? t('seller.promotions.builder.ruleSummaryScopeCategory', { label: form.scopeLabel || '—' })
      : form.scope === 'products'
        ? t('seller.promotions.builder.ruleSummaryScopeProducts')
        : t('seller.promotions.builder.ruleSummaryScopeOrder')

  const fmtDate = (d: string) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d }
  }

  const scheduleLabel = form.noEndDate
    ? t('seller.promotions.builder.ruleSummaryNoEnd', { start: form.activeImmediately ? t('seller.promotions.builder.ruleSummaryActiveNow') : fmtDate(form.startsAt) })
    : t('seller.promotions.builder.ruleSummarySchedule', {
        start: form.activeImmediately ? t('seller.promotions.builder.ruleSummaryActiveNow') : fmtDate(form.startsAt),
        end: fmtDate(form.endsAt),
      })

  const parts: string[] = [discountLabel, scopeLabel, scheduleLabel]
  if (form.totalUses && Number(form.totalUses) > 0) {
    parts.push(t('seller.promotions.builder.ruleSummaryUses', { count: form.totalUses }))
  }
  if (form.budget && Number(form.budget) > 0) {
    parts.push(t('seller.promotions.builder.ruleSummaryBudget', { amount: fmtNPR(Number(form.budget)) }))
  }
  parts.push(form.visibility === 'auto' ? t('seller.promotions.builder.ruleSummaryVisibility') : t('seller.promotions.builder.ruleSummaryVisibilityCode'))
  if (form.showOnStorefront) {
    parts.push(t('seller.promotions.builder.ruleSummaryStorefront'))
  }

  return (
    <View style={styles.effectiveCard} accessibilityLabel={t('seller.promotions.builder.ruleSummaryTitle')}>
      <Text style={styles.effectiveTitle}>{t('seller.promotions.builder.ruleSummaryTitle')}</Text>
      <Text style={styles.ruleSummaryText}>{parts.join(' · ')}</Text>
    </View>
  )
}

// ---- Preview card ----

function PreviewCard({ data, countdown, t }: { data: { name: string; price: number; compareAt: number; type: PromotionType; discountValue: number; code: string; isCoupon: boolean; endsAt: string }; countdown: ReturnType<typeof getTimeRemaining>; t: TT }) {
  const isSale = data.type === 'flash_sale' || data.type === 'percentage'
  const offLabel = data.type === 'percentage' || data.type === 'flash_sale'
    ? `${data.discountValue}% OFF`
    : data.type === 'fixed'
      ? `NPR ${data.discountValue} OFF`
      : data.type === 'bogo'
        ? t('seller.promotions.builder.previewBogo')
        : t('seller.promotions.builder.previewFreeShip')
  const showCountdown = countdown.total > 0 && data.endsAt
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewImageArea}>
        <View style={styles.previewIconCircle}>
          <Text style={styles.previewIconText}>{TYPE_ICONS[data.type]}</Text>
        </View>
        {isSale && (
          <View style={styles.previewSaleBadge}>
            <Text style={styles.previewSaleBadgeText}>{t('seller.promotions.saleBadge')}</Text>
          </View>
        )}
        <View style={styles.previewOffBadge}>
          <Text style={styles.previewOffBadgeText}>{offLabel}</Text>
        </View>
      </View>
      <View style={styles.previewBody}>
        <Text style={styles.previewName} numberOfLines={1}>{data.name}</Text>
        <View style={styles.previewPriceRow}>
          <Text style={styles.previewPrice}>NPR {fmtNPR(data.price)}</Text>
          {data.compareAt > data.price && (
            <Text style={styles.previewCompareAt}>NPR {fmtNPR(data.compareAt)}</Text>
          )}
        </View>
        {data.type === 'free_shipping' && (
          <Text style={styles.previewFreeShip}>{t('seller.promotions.builder.previewFreeShip')}</Text>
        )}
        {data.type === 'bogo' && (
          <Text style={styles.previewBogo}>{t('seller.promotions.builder.previewBogo')}</Text>
        )}
        {data.isCoupon ? (
          <View style={styles.previewCoupon}>
            <Text style={styles.previewCouponText}>{data.code || 'CODE'}</Text>
          </View>
        ) : (
          <Text style={styles.previewNoCoupon}>{t('seller.promotions.builder.previewNoCoupon')}</Text>
        )}
        {showCountdown && (
          <View style={styles.previewCountdownArea}>
            <Text style={styles.previewCountdownLabel}>{t('seller.promotions.builder.previewCountdown')}</Text>
            <Text style={styles.previewCountdownValue} accessibilityRole="timer">
              {countdownStr(countdown)}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: colors.white, fontWeight: '300', marginTop: -4 },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: fontSize.sm[0], color: colors.primary50, marginTop: 2 },
  saveIndicator: { fontSize: fontSize.sm[0], color: colors.primary50 },
  savedIndicator: { fontSize: fontSize.sm[0], color: colors.white, fontWeight: '600' },
  errorBadge: {
    backgroundColor: 'rgba(220,38,38,0.9)',
    borderRadius: radii.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1.5],
  },
  errorBadgeText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.white },

  scrollContent: { padding: spacing[4], gap: spacing[3] },

  // Preview
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  previewImageArea: {
    height: 120,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    position: 'relative',
  },
  previewIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: 'rgba(138,27,87,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewIconText: { fontSize: 24, fontWeight: '700', color: colors.primary },
  previewSaleBadge: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    backgroundColor: colors.gold,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  previewSaleBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white, letterSpacing: 0.5 },
  previewOffBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  previewOffBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  previewBody: { padding: spacing[4] },
  previewName: { fontSize: fontSize.md[0], fontWeight: '600', color: colors.text },
  previewPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[2], marginTop: spacing[2] },
  previewPrice: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.gold, fontVariant: ['tabular-nums'] },
  previewCompareAt: { fontSize: fontSize.base[0], color: colors.textMuted, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  previewFreeShip: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.success, marginTop: spacing[1] },
  previewBogo: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.primary, marginTop: spacing[1] },
  previewCoupon: {
    marginTop: spacing[3],
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  previewCouponText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.primary, fontFamily: 'monospace' },
  previewNoCoupon: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: spacing[3] },
  previewCountdownArea: { marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.borderLight },
  previewCountdownLabel: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textMuted },
  previewCountdownValue: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], marginTop: 2 },

  // Sections
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  sectionIcon: { fontSize: 20 },
  sectionHeaderText: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text },
  sectionHint: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
  checkIcon: { fontSize: 16, color: colors.success, fontWeight: '700' },
  errorDot: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: radii.full,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorDotText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.error },
  chevron: { fontSize: 16, color: colors.textMuted, marginLeft: spacing[1] },
  sectionBody: { paddingHorizontal: spacing[4], paddingBottom: spacing[4] },
  sectionContent: { gap: spacing[4] },

  // Fields
  field: { gap: spacing[1.5] },
  fieldLabel: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  fieldHint: { fontSize: fontSize.sm[0], fontWeight: '400', color: colors.textMuted },
  fieldError: { fontSize: fontSize.sm[0], fontWeight: '400', color: colors.error },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: fontSize.base[0],
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.error },
  inputWithSuffix: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  inputWithSuffixInput: { flex: 1, borderWidth: 0, backgroundColor: 'transparent' },
  suffixText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.textMuted, paddingHorizontal: spacing[3] },
  codeInput: { fontFamily: 'monospace' },
  codeInputFlex: { flex: 1 },
  codeRow: { flexDirection: 'row', gap: spacing[2], alignItems: 'stretch' },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2.5],
  },
  generateBtnIcon: { fontSize: 16, color: colors.text },
  generateBtnText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  codeAnnounce: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.success, marginTop: spacing[1] },

  // Product picker placeholder
  productPickerPlaceholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    padding: spacing[4],
    alignItems: 'center',
  },
  productPickerText: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center' },

  // Conditions
  conditionsGroup: { marginTop: spacing[2], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.borderLight },
  conditionsTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  conditionsHint: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },

  // Toggle row
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[3] },
  toggleLabel: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  toggleHint: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: { backgroundColor: colors.primary },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleKnobActive: { transform: [{ translateX: 20 }] },

  // Effective price card
  effectiveCard: {
    borderWidth: 1,
    borderColor: 'rgba(224,169,59,0.3)',
    backgroundColor: 'rgba(224,169,59,0.05)',
    borderRadius: radii.md,
    padding: spacing[4],
  },
  effectiveTitle: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  effectiveSubtitle: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2, marginBottom: spacing[3] },
  effectiveBody: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  effectivePriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] },
  effectivePrice: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.gold, fontVariant: ['tabular-nums'] },
  effectiveOriginal: { fontSize: fontSize.base[0], color: colors.textMuted, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  effectiveSave: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.success, marginTop: 2 },
  effectiveVat: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2 },
  effectiveLabel: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  effectiveBadge: {
    backgroundColor: colors.gold,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 4,
  },
  effectiveBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  timezoneText: { fontSize: fontSize.xs[0], color: colors.textTertiary, marginTop: spacing[1] },
  ruleSummaryText: { fontSize: fontSize.base[0], color: colors.text, lineHeight: 20, marginTop: spacing[2] },

  // Type grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  typeCard: {
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
    minWidth: '47%',
    flex: 1,
    position: 'relative',
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  typeCardIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardIconActive: { backgroundColor: colors.primary },
  typeCardIconText: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  typeCardIconTextActive: { color: colors.white },
  typeCardLabel: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  typeCardLabelActive: { color: colors.primary },
  typeCardCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardCheckText: { fontSize: 10, fontWeight: '700', color: colors.white },

  // Checkbox
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], paddingVertical: spacing[1] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.white, fontSize: 13, fontWeight: '700' },
  checkboxLabel: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  checkboxHint: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: -spacing[1] },

  // Scope
  scopeRow: { flexDirection: 'column', gap: spacing[2] },
  scopeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    alignItems: 'center',
  },
  scopeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  scopeChipText: { fontSize: fontSize.base[0], fontWeight: '500', color: colors.textMuted },
  scopeChipTextActive: { color: colors.primary, fontWeight: '600' },

  // Error summary
  errorSummary: {
    backgroundColor: 'rgba(220,38,38,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
    borderRadius: radii.md,
    padding: spacing[3],
    gap: spacing[1],
  },
  errorSummaryTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.error },
  errorSummaryItem: { fontSize: fontSize.sm[0], color: colors.error, paddingLeft: spacing[2] },

  // Save bar
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  saveDraftBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  activateBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white },

  // Dirty guard
  dirtyBody: { fontSize: fontSize.base[0], color: colors.textMuted, lineHeight: 20, paddingHorizontal: spacing[4], marginTop: spacing[2] },
  dirtyActions: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[4], marginTop: spacing[5], flexWrap: 'wrap' },
  dirtyCancelBtn: { flex: 1, height: 44, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  dirtyCancelText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  dirtyDiscardBtn: { flex: 1, height: 44, borderRadius: radii.md, backgroundColor: 'rgba(220,38,38,0.08)', alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  dirtyDiscardText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.error },
  dirtySaveBtn: { flex: 1, height: 44, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  dirtySaveText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.white },

  // Snackbar
  snackbar: {
    position: 'absolute',
    bottom: 80,
    left: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 9999,
  },
  snackbarIcon: { fontSize: 16, color: colors.success, fontWeight: '700' },
  snackbarText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, flex: 1 },
})
