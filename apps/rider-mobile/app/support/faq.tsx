import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  AccessibilityInfo,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import {
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Headset,
  LifeBuoy,
  Shield,
  Wallet,
  User,
  ThumbsUp,
  ThumbsDown,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily, easing } from '@chinooz/theme'
import { EmptyState, Skeleton } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../../components/A11yProvider'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type Category = 'general' | 'payments' | 'safety' | 'account'

type Article = {
  id: string
  category: Category
}

// i18n keys are derived from the article id to keep the data table clean.
const FAQ_PREFIX = 'rider.support.faqArticles'
const faqKey = (id: string, suffix: 'Q' | 'A') => `${FAQ_PREFIX}.${id}${suffix}`

const ARTICLES: Article[] = [
  { id: 'gen1', category: 'general' },
  { id: 'gen2', category: 'general' },
  { id: 'gen3', category: 'general' },
  { id: 'pay1', category: 'payments' },
  { id: 'pay2', category: 'payments' },
  { id: 'pay3', category: 'payments' },
  { id: 'safe1', category: 'safety' },
  { id: 'safe2', category: 'safety' },
  { id: 'safe3', category: 'safety' },
  { id: 'acc1', category: 'account' },
  { id: 'acc2', category: 'account' },
]

const CATEGORY_META: { key: Category; labelKey: string; icon: LucideIcon }[] = [
  { key: 'general', labelKey: 'rider.support.faq.categoryGeneral', icon: LifeBuoy },
  { key: 'payments', labelKey: 'rider.support.faq.categoryPayments', icon: Wallet },
  { key: 'safety', labelKey: 'rider.support.faq.categorySafety', icon: Shield },
  { key: 'account', labelKey: 'rider.support.faq.categoryAccount', icon: User },
]

export default function HelpCenterScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()
  const params = useLocalSearchParams<{ q?: string }>()

  const [search, setSearch] = useState(typeof params.q === 'string' ? params.q : '')
  const [debounced, setDebounced] = useState(search)
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    analytics.screen({ name: 'rider-support-faq' })
    // Simulate a brief content fetch so skeletons + aria-busy are exercised.
    const id = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(search), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return ARTICLES.filter((a) => {
      if (activeCategory !== 'all' && a.category !== activeCategory) return false
      if (!q) return true
      return (
        t(faqKey(a.id, 'Q')).toLowerCase().includes(q) ||
        t(faqKey(a.id, 'A')).toLowerCase().includes(q)
      )
    })
  }, [debounced, activeCategory, t])

  const toggleExpand = (id: string) => {
    if (!reducedMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'))
    }
    setExpanded((prev) => (prev === id ? null : id))
  }

  const hasResults = filtered.length > 0

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('rider.support.back')}
          hitSlop={8}
          style={styles.topBarBtn}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{t('rider.support.faq.title')}</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>{t('rider.support.faq.subtitle')}</Text>

        <View style={styles.searchWrap}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('rider.support.faq.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel={t('rider.support.faq.searchAria')}
            inputMode="search"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              accessibilityRole="button"
              accessibilityLabel={t('rider.support.faq.searchAria')}
              hitSlop={8}
              style={styles.searchClear}
            >
              <X size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        <View style={styles.chipsRow}>
          <CategoryChip
            label={t('rider.support.faq.categoryGeneral')}
            icon={LifeBuoy}
            active={activeCategory === 'all'}
            onPress={() => setActiveCategory('all')}
            ariaLabel={t('rider.support.faq.categoryGeneral')}
            reducedMotion={reducedMotion}
          />
          {CATEGORY_META.map((c) => (
            <CategoryChip
              key={c.key}
              label={t(c.labelKey)}
              icon={c.icon}
              active={activeCategory === c.key}
              onPress={() => setActiveCategory(c.key)}
              ariaLabel={t(c.labelKey)}
              reducedMotion={reducedMotion}
            />
          ))}
        </View>

        {isLoading ? (
          <View
            style={styles.skeletonWrap}
            accessibilityRole="none"
            accessibilityState={{ busy: true }}
            accessibilityLabel={t('rider.support.faq.skeletonAria')}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.skeletonRow}>
                <View style={{ flex: 1, gap: spacing[2] }}>
                  <Skeleton width="80%" height={16} />
                  <Skeleton width="55%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : hasResults ? (
          <View style={styles.listCard}>
            {filtered.map((article, i) => (
              <ArticleRow
                key={article.id}
                article={article}
                expanded={expanded === article.id}
                onToggle={() => toggleExpand(article.id)}
                reducedMotion={reducedMotion}
                t={t}
                divider={i < filtered.length - 1}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<Text style={{ fontSize: 44 }}>{'\u{1F50D}'}</Text>}
            title={t('rider.support.faq.emptyTitle')}
            subtitle={t('rider.support.faq.emptySubtitle')}
            action={{
              label: t('rider.support.faq.contactCta'),
              onPress: () => router.push('/support/contact'),
            }}
          />
        )}

        <TouchableOpacity
          style={styles.contactCta}
          onPress={() => router.push('/support/contact')}
          accessibilityRole="button"
          accessibilityLabel={t('rider.support.faq.contactCtaAria')}
          activeOpacity={0.85}
        >
          <Headset size={20} color={colors.primary} />
          <Text style={styles.contactCtaText}>{t('rider.support.faq.contactCta')}</Text>
          <ChevronRight size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

function CategoryChip({
  label,
  icon: Icon,
  active,
  onPress,
  ariaLabel,
  reducedMotion,
}: {
  label: string
  icon: LucideIcon
  active: boolean
  onPress: () => void
  ariaLabel: string
  reducedMotion: boolean
}) {
  const scale = useSharedValue(1)
  const handlePressIn = () => { if (!reducedMotion) scale.value = withSpring(0.96, { damping: 20, stiffness: 400 }) }
  const handlePressOut = () => { if (!reducedMotion) scale.value = withSpring(1, { damping: 20, stiffness: 400 }) }
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[styles.chip, active && styles.chipActive]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        accessibilityState={{ selected: active }}
        activeOpacity={0.85}
      >
        <Icon size={14} color={active ? colors.white : colors.textMuted} />
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

function ArticleRow({
  article,
  expanded,
  onToggle,
  reducedMotion,
  t,
  divider,
}: {
  article: Article
  expanded: boolean
  onToggle: () => void
  reducedMotion: boolean
  t: (k: string, o?: Record<string, unknown>) => string
  divider: boolean
}) {
  const rotate = useSharedValue(0)

  useEffect(() => {
    rotate.value = expanded
      ? withTiming(1, { duration: reducedMotion ? 0 : 200, easing: Easing.bezier(...easing.easeOut) })
      : withTiming(0, { duration: reducedMotion ? 0 : 200, easing: Easing.bezier(...easing.easeOut) })
  }, [expanded, reducedMotion])

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 180}deg` }],
  }))

  const question = t(faqKey(article.id, 'Q'))
  const answer = t(faqKey(article.id, 'A'))
  const status = expanded ? t('rider.support.faq.articleCloseAria') : t('rider.support.faq.articleOpenAria')

  return (
    <View style={[styles.articleRow, divider && styles.articleRowBorder]}>
      <TouchableOpacity
        style={styles.articleHead}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={t('rider.support.faq.articleAria', { title: question, status })}
        accessibilityState={{ expanded }}
        activeOpacity={0.85}
      >
        <Text style={styles.articleQuestion} numberOfLines={expanded ? undefined : 2}>
          {question}
        </Text>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={18} color={colors.textTertiary} />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.articleBody}>
          <Text style={styles.answerLabel}>{t('rider.support.faq.answerLabel')}</Text>
          <Text style={styles.articleAnswer}>{answer}</Text>
          <HelpfulRow articleId={article.id} t={t} />
        </View>
      )}
    </View>
  )
}

function HelpfulRow({ articleId, t }: { articleId: string; t: (k: string, o?: Record<string, unknown>) => string }) {
  const [vote, setVote] = useState<'yes' | 'no' | null>(null)
  const scaleYes = useSharedValue(1)
  const scaleNo = useSharedValue(1)

  const handleVote = (choice: 'yes' | 'no') => {
    setVote(choice)
    analytics.track({ event: 'rider_faq_helpful', screen: 'rider-support-faq', properties: { articleId, helpful: choice === 'yes' } })
    try { AccessibilityInfo.announceForAccessibility(t('rider.support.faq.helpfulThanks')) } catch {}
  }

  const animYes = useAnimatedStyle(() => ({ transform: [{ scale: scaleYes.value }] }))
  const animNo = useAnimatedStyle(() => ({ transform: [{ scale: scaleNo.value }] }))

  return (
    <View style={styles.helpfulRow} accessibilityRole="radiogroup" accessibilityLabel={t('rider.support.faq.helpfulAria')}>
      {vote ? (
        <Text style={styles.helpfulThanks}>{t('rider.support.faq.helpfulThanks')}</Text>
      ) : (
        <>
          <Animated.View style={animYes}>
            <TouchableOpacity
              style={styles.helpfulBtn}
              onPress={() => handleVote('yes')}
              onPressIn={() => { scaleYes.value = withSpring(0.94, { damping: 20, stiffness: 400 }) }}
              onPressOut={() => { scaleYes.value = withSpring(1, { damping: 20, stiffness: 400 }) }}
              accessibilityRole="button"
              accessibilityLabel={t('rider.support.faq.helpfulYes')}
              activeOpacity={0.8}
            >
              <ThumbsUp size={16} color={colors.success} />
              <Text style={styles.helpfulYesText}>{t('rider.support.faq.helpfulYes')}</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={animNo}>
            <TouchableOpacity
              style={styles.helpfulBtn}
              onPress={() => handleVote('no')}
              onPressIn={() => { scaleNo.value = withSpring(0.94, { damping: 20, stiffness: 400 }) }}
              onPressOut={() => { scaleNo.value = withSpring(1, { damping: 20, stiffness: 400 }) }}
              accessibilityRole="button"
              accessibilityLabel={t('rider.support.faq.helpfulNo')}
              activeOpacity={0.8}
            >
              <ThumbsDown size={16} color={colors.textMuted} />
              <Text style={styles.helpfulNoText}>{t('rider.support.faq.helpfulNo')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </View>
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
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[3] },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
  },
  searchInput: { flex: 1, fontSize: fontSize.base[0], color: colors.text, padding: 0 },
  searchClear: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 36,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.text },
  chipTextActive: { color: colors.white },
  skeletonWrap: { gap: spacing[3], marginTop: spacing[1] },
  skeletonRow: { flexDirection: 'row', alignItems: 'center' },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  articleRow: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  articleRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  articleHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  articleQuestion: { flex: 1, fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, lineHeight: 20 },
  articleBody: { marginTop: spacing[3], gap: spacing[2] },
  answerLabel: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
  articleAnswer: { fontSize: fontSize.sm[0], color: colors.textSecondary, lineHeight: 20, fontFamily: fontFamily.sans[0] },
  helpfulRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2], alignItems: 'center' },
  helpfulBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingVertical: spacing[1.5] },
  helpfulYesText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.success },
  helpfulNoText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textMuted },
  helpfulThanks: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.textMuted, fontStyle: 'italic' },
  contactCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  contactCtaText: { flex: 1, fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
})
