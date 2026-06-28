import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Pressable,
  TextInput,
  AccessibilityInfo,
  Platform,
  UIManager,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import {
  Search,
  ChevronRight,
  ChevronLeft,
  X,
  Headset,
  LifeBuoy,
  Shield,
  Wallet,
  Package,
  Banknote,
  UserCog,
  Rocket,
  Sparkles,
  WifiOff,
  Siren,
  Navigation,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { EmptyState, Skeleton } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  RIDER_HELP_CATEGORIES,
  RIDER_HELP_ARTICLES,
  getHelpArticlesByCategory,
  getRiderHelpContext,
  getRelevantHelpArticles,
  type RiderHelpArticle,
  type RiderHelpCategory,
} from '@chinooz/mock-data'
import { useActiveDeliveryStore } from '@chinooz/state'
import { useA11y } from '../../components/A11yProvider'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const CATEGORY_ICONS: Record<RiderHelpCategory, LucideIcon> = {
  gettingStarted: Rocket,
  deliveries: Package,
  earnings: Wallet,
  cod: Banknote,
  account: UserCog,
  safety: Shield,
}

// i18n keys are derived from the article id to keep the data table clean.
const HELP_PREFIX = 'rider.support.help.article'
const articleTitleKey = (id: string) => `${HELP_PREFIX}.${id}.title`
const articleBodyKey = (id: string) => `${HELP_PREFIX}.${id}.body`

type ArticleItem = { kind: 'article'; article: RiderHelpArticle }

export default function HelpCenterScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()
  const params = useLocalSearchParams<{ q?: string }>()

  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)
  const hasActiveTrip =
    !!activeDelivery &&
    activeDelivery.status !== 'delivered' &&
    activeDelivery.status !== 'cancelled' &&
    activeDelivery.status !== 'failed'
  const hasCod = hasActiveTrip && !!activeDelivery.isCod

  const [search, setSearch] = useState(typeof params.q === 'string' ? params.q : '')
  const [debounced, setDebounced] = useState(search)
  const [activeCategory, setActiveCategory] = useState<RiderHelpCategory | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    analytics.screen({ name: 'rider-help-center' })
    const id = setTimeout(() => setIsLoading(false), 450)
    return () => clearTimeout(id)
  }, [])

  // Simulate offline detection (in a real app, use NetInfo).
  useEffect(() => {
    const checkOnline = async () => {
      try {
        // Mock: randomly simulate offline 10% of the time in dev.
        // In production, this would use @react-native-community/netinfo.
        const isOnline = true
        setIsOffline(!isOnline)
      } catch {
        setIsOffline(true)
      }
    }
    checkOnline()
  }, [])

  // Announce offline state.
  useEffect(() => {
    if (isOffline) {
      try { AccessibilityInfo.announceForAccessibility(t('rider.support.states.offlineAria')) } catch {}
    }
  }, [isOffline, t])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(search), 180)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // Context-relevant articles, surfaced first when not searching.
  const relevantArticles = useMemo(() => {
    if (debounced.trim() || activeCategory !== 'all') return []
    const ctx = getRiderHelpContext({ hasActiveDelivery: hasActiveTrip, hasCod })
    return getRelevantHelpArticles(ctx)
  }, [debounced, activeCategory, hasActiveTrip, hasCod])

  const isSearching = debounced.trim().length > 0

  // Filter articles by search query + active category.
  const filteredArticles = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return RIDER_HELP_ARTICLES.filter((a) => {
      if (activeCategory !== 'all' && a.category !== activeCategory) return false
      if (!q) return true
      return (
        t(articleTitleKey(a.id)).toLowerCase().includes(q) ||
        t(articleBodyKey(a.id)).toLowerCase().includes(q)
      )
    })
  }, [debounced, activeCategory, t])

  // Build sectioned list for browsing (no search): relevant first, then categories.
  const sections = useMemo(() => {
    if (isSearching) {
      return [{
        id: 'results',
        title: t('rider.support.help.resultsAria', { count: filteredArticles.length }),
        data: filteredArticles.map(a => ({ kind: 'article' as const, article: a })),
      }]
    }
    const list: { id: string; title: string; data: ArticleItem[] }[] = []
    if (relevantArticles.length > 0 && activeCategory === 'all') {
      list.push({
        id: 'relevant',
        title: t('rider.support.help.relevantTitle'),
        data: relevantArticles.map(a => ({ kind: 'article' as const, article: a })),
      })
    }
    const cats = activeCategory === 'all'
      ? RIDER_HELP_CATEGORIES
      : RIDER_HELP_CATEGORIES.filter(c => c.key === activeCategory)
    for (const cat of cats) {
      const arts = getHelpArticlesByCategory(cat.key)
      if (arts.length === 0) continue
      list.push({
        id: cat.key,
        title: t(cat.labelKey),
        data: arts.map(a => ({ kind: 'article' as const, article: a })),
      })
    }
    return list
  }, [isSearching, filteredArticles, relevantArticles, activeCategory, t])

  const openArticle = (article: RiderHelpArticle) => {
    analytics.track({ event: 'rider_help_article_opened', screen: 'rider-help-center', properties: { articleId: article.id, category: article.category } })
    router.push({ pathname: '/support/faq/[article]', params: { article: article.id } })
  }

  const hasResults = filteredArticles.length > 0

  // Announce result count when a search completes.
  useEffect(() => {
    if (!isSearching || isLoading) return
    const msg = hasResults
      ? t('rider.support.help.resultsAria', { count: filteredArticles.length })
      : t('rider.support.help.resultsNoneAria')
    const id = setTimeout(() => {
      try { AccessibilityInfo.announceForAccessibility(msg) } catch {}
    }, 300)
    return () => clearTimeout(id)
  }, [isSearching, hasResults, filteredArticles.length, isLoading, t])

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
        <Text style={styles.topBarTitle} numberOfLines={1}>{t('rider.support.help.title')}</Text>
        <View style={styles.topBarBtn} />
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('rider.support.help.searchPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel={t('rider.support.help.searchAria')}
          inputMode="search"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel={t('rider.support.help.searchAria')}
            hitSlop={8}
            style={styles.searchClear}
          >
            <X size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <View style={styles.chipsRow}>
        <CategoryChip
          label={t('rider.support.help.catAll')}
          icon={LifeBuoy}
          active={activeCategory === 'all'}
          onPress={() => setActiveCategory('all')}
          ariaLabel={t('rider.support.help.catAll')}
          reducedMotion={reducedMotion}
        />
        {RIDER_HELP_CATEGORIES.map((c) => (
          <CategoryChip
            key={c.key}
            label={t(c.labelKey)}
            icon={CATEGORY_ICONS[c.key]}
            active={activeCategory === c.key}
            onPress={() => setActiveCategory(c.key)}
            ariaLabel={t(c.labelKey)}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>

      {/* Offline banner — key safety info always available */}
      {isOffline && (
        <View style={styles.offlineBanner} accessibilityLiveRegion="polite" accessibilityLabel={t('rider.support.states.offlineAria')}>
          <WifiOff size={16} color={colors.warning} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.offlineBannerTitle}>{t('rider.support.states.offlineTitle')}</Text>
            <Text style={styles.offlineBannerBody}>{t('rider.support.states.offlineBody')}</Text>
          </View>
        </View>
      )}

      {/* Offline cached emergency info — ALWAYS available */}
      {isOffline && (
        <View style={styles.offlineEmergencyCard} accessibilityLabel={t('rider.support.states.offlineCachedSection')}>
          <Text accessibilityRole="header" style={styles.offlineSectionTitle}>{t('rider.support.states.offlineCachedSection')}</Text>
          <View style={styles.offlineEmergencyList}>
            <View style={styles.offlineEmergencyRow}>
              <Siren size={16} color={colors.error} />
              <Text style={styles.offlineEmergencyLabel}>{t('rider.support.emergencyPolice')}</Text>
              <Text style={styles.offlineEmergencyNumber}>{t('rider.support.emergencyPoliceNumber')}</Text>
            </View>
            <View style={styles.offlineEmergencyRow}>
              <LifeBuoy size={16} color={colors.error} />
              <Text style={styles.offlineEmergencyLabel}>{t('rider.support.emergencyAmbulance')}</Text>
              <Text style={styles.offlineEmergencyNumber}>{t('rider.support.emergencyAmbulanceNumber')}</Text>
            </View>
            <View style={styles.offlineEmergencyRow}>
              <Navigation size={16} color={colors.error} />
              <Text style={styles.offlineEmergencyLabel}>{t('rider.support.emergencyTraffic')}</Text>
              <Text style={styles.offlineEmergencyNumber}>{t('rider.support.emergencyTrafficNumber')}</Text>
            </View>
          </View>
        </View>
      )}

      {isLoading ? (
        <View
          style={styles.skeletonWrap}
          accessibilityRole="none"
          accessibilityState={{ busy: true }}
          accessibilityLabel={t('rider.support.help.skeletonAria')}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <View style={styles.skeletonIcon}>
                <Skeleton width={20} height={20} circle />
              </View>
              <View style={{ flex: 1, gap: spacing[1.5] }}>
                <Skeleton width="75%" height={14} />
                <Skeleton width="50%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : isSearching && !hasResults ? (
        <EmptyState
          icon={<Text style={{ fontSize: 44 }}>{'\u{1F50D}'}</Text>}
          title={t('rider.support.help.emptyTitle')}
          subtitle={t('rider.support.help.emptySubtitle')}
          action={{
            label: t('rider.support.help.contactCta'),
            onPress: () => router.push('/support/contact'),
          }}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => {
            const sec = sections.find(s => s.data.includes(item))
            return `${sec?.id ?? ''}-${index}`
          }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing[10] }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              {section.id === 'relevant' && <Sparkles size={15} color={colors.primary} />}
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {section.title}
              </Text>
              {section.id === 'relevant' && (
                <Text style={styles.sectionHint}>{t('rider.support.help.relevantSubtitle')}</Text>
              )}
            </View>
          )}
          renderItem={({ item, section }) => (
            <ArticleRow
              item={item}
              inRelevant={section.id === 'relevant'}
              reducedMotion={reducedMotion}
              t={t}
              onPress={() => openArticle(item.article)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
          renderSectionFooter={() => <View style={styles.sectionFooter} />}
        />
      )}

      {/* Escalate CTA — always one tap */}
      <View style={[styles.escalateBar, { paddingBottom: insets.bottom + spacing[3] }]}>
        <TouchableOpacity
          style={styles.escalateBtn}
          onPress={() => router.push('/support/contact')}
          accessibilityRole="button"
          accessibilityLabel={t('rider.support.help.contactCtaAria')}
          activeOpacity={0.85}
        >
          <Headset size={20} color={colors.primary} />
          <Text style={styles.escalateText}>{t('rider.support.help.contactCta')}</Text>
          <ChevronRight size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
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
  item,
  inRelevant,
  reducedMotion,
  t,
  onPress,
}: {
  item: ArticleItem
  inRelevant: boolean
  reducedMotion: boolean
  t: (k: string, o?: Record<string, unknown>) => string
  onPress: () => void
}) {
  const scale = useSharedValue(1)
  const handlePressIn = () => { if (!reducedMotion) scale.value = withSpring(0.98, { damping: 20, stiffness: 400 }) }
  const handlePressOut = () => { if (!reducedMotion) scale.value = withSpring(1, { damping: 20, stiffness: 400 }) }
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const Icon = CATEGORY_ICONS[item.article.category]
  const title = t(articleTitleKey(item.article.id))
  const body = t(articleBodyKey(item.article.id))

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[styles.articleCard, inRelevant && styles.articleCardRelevant]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={t('rider.support.help.articleAria', { title })}
        accessibilityHint={t('rider.support.help.openArticle')}
        activeOpacity={0.85}
      >
        <View style={[styles.articleIcon, inRelevant && styles.articleIconRelevant]}>
          <Icon size={18} color={inRelevant ? colors.primary : colors.textMuted} />
        </View>
        <View style={styles.articleBody}>
          <Text style={styles.articleTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.articlePreview} numberOfLines={2}>{body}</Text>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 44,
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
  },
  searchInput: { flex: 1, fontSize: fontSize.base[0], color: colors.text, padding: 0 },
  searchClear: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexWrap: 'wrap',
  },
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
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  skeletonIcon: { width: 36, height: 36, borderRadius: 9999, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[1] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    backgroundColor: colors.background,
    flexWrap: 'wrap',
  },
  sectionTitle: { fontSize: fontSize.md[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  sectionHint: { fontSize: fontSize.xs[0], color: colors.textMuted, flexBasis: '100%' },
  sectionFooter: { height: spacing[2] },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    minHeight: 56,
  },
  articleCardRelevant: { borderColor: colors.primaryLight, backgroundColor: colors.primary50 },
  articleIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleIconRelevant: { backgroundColor: colors.surface },
  articleBody: { flex: 1, gap: 2 },
  articleTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, lineHeight: 19 },
  articlePreview: { fontSize: fontSize.sm[0], color: colors.textMuted, lineHeight: 17, fontFamily: fontFamily.sans[0] },
  rowSeparator: { height: spacing[2] },
  escalateBar: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
  },
  escalateText: { flex: 1, fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },

  // Offline banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  offlineBannerTitle: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.warning },
  offlineBannerBody: { fontSize: fontSize.xs[0], color: colors.textMuted },
  offlineEmergencyCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: spacing[2],
  },
  offlineSectionTitle: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  offlineEmergencyList: { gap: spacing[1] },
  offlineEmergencyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[1.5] },
  offlineEmergencyLabel: { flex: 1, fontSize: fontSize.sm[0], fontWeight: '500', color: colors.text },
  offlineEmergencyNumber: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.error, fontFamily: fontFamily.sansSemiBold[0] },
})
