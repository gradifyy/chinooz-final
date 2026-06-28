import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  AccessibilityInfo,
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
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Headset,
  Shield,
  Wallet,
  Package,
  Banknote,
  UserCog,
  Rocket,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { EmptyState } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  getRiderHelpArticle,
  getRelatedHelpArticles,
  type RiderHelpCategory,
} from '@chinooz/mock-data'
import { useA11y } from '../../../components/A11yProvider'

const CATEGORY_ICONS: Record<RiderHelpCategory, LucideIcon> = {
  gettingStarted: Rocket,
  deliveries: Package,
  earnings: Wallet,
  cod: Banknote,
  account: UserCog,
  safety: Shield,
}

const HELP_PREFIX = 'rider.support.help.article'
const articleTitleKey = (id: string) => `${HELP_PREFIX}.${id}.title`
const articleBodyKey = (id: string) => `${HELP_PREFIX}.${id}.body`

export default function HelpArticleScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()
  const params = useLocalSearchParams<{ article?: string }>()

  const articleId = typeof params.article === 'string'
    ? params.article
    : Array.isArray(params.article)
      ? params.article[0]
      : ''
  const article = useMemo(() => getRiderHelpArticle(articleId), [articleId])
  const related = useMemo(() => getRelatedHelpArticles(articleId), [articleId])

  const [vote, setVote] = useState<'yes' | 'no' | null>(null)

  useEffect(() => {
    analytics.screen({ name: 'rider-help-article', properties: { articleId } })
  }, [articleId])

  const handleVote = (choice: 'yes' | 'no') => {
    setVote(choice)
    analytics.track({ event: 'rider_help_article_helpful', screen: 'rider-help-article', properties: { articleId, helpful: choice === 'yes' } })
    try { AccessibilityInfo.announceForAccessibility(t('rider.support.help.articleView.helpfulThanks')) } catch {}
  }

  const openRelated = (id: string) => {
    analytics.track({ event: 'rider_help_related_opened', screen: 'rider-help-article', properties: { fromArticleId: articleId, toArticleId: id } })
    router.replace({ pathname: '/support/faq/[article]', params: { article: id } })
  }

  if (!article) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('rider.support.help.articleView.back')}
            hitSlop={8}
            style={styles.topBarBtn}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>{t('rider.support.help.title')}</Text>
          <View style={styles.topBarBtn} />
        </View>
        <View style={{ flex: 1, paddingHorizontal: spacing[4], justifyContent: 'center' }}>
          <EmptyState
            icon={<Text style={{ fontSize: 44 }}>{'\u{1F4C4}'}</Text>}
            title={t('rider.support.help.articleView.notFoundTitle')}
            subtitle={t('rider.support.help.articleView.notFoundBody')}
            action={{
              label: t('rider.support.help.articleView.notFoundCta'),
              onPress: () => router.replace('/support/faq'),
            }}
          />
        </View>
      </View>
    )
  }

  const CategoryIcon = CATEGORY_ICONS[article.category]
  const categoryLabel = t(`rider.support.help.cat${cap(article.category)}`)
  const title = t(articleTitleKey(article.id))
  const body = t(articleBodyKey(article.id))

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('rider.support.help.articleView.back')}
          hitSlop={8}
          style={styles.topBarBtn}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/support/faq')}
          accessibilityRole="button"
          accessibilityLabel={t('rider.support.help.title')}
          style={styles.topBarTitleWrap}
        >
          <Text style={styles.topBarTitle} numberOfLines={1}>{t('rider.support.help.title')}</Text>
        </TouchableOpacity>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Article header */}
        <View style={styles.articleHeader}>
          <View style={styles.categoryPill}>
            <CategoryIcon size={13} color={colors.primary} />
            <Text style={styles.categoryPillText}>{categoryLabel}</Text>
          </View>
          <Text accessibilityRole="header" style={styles.articleTitle}>
            {title}
          </Text>
        </View>

        {/* Readable content */}
        <View style={styles.contentCard} accessibilityRole="text">
          <Text style={styles.bodyText}>{body}</Text>
        </View>

        {/* Was this helpful? */}
        <View style={styles.helpfulCard}>
          <Text accessibilityRole="header" style={styles.helpfulTitle}>
            {t('rider.support.help.articleView.helpfulTitle')}
          </Text>
          {vote ? (
            <View style={styles.helpfulVoted}>
              <Text style={styles.helpfulThanks}>{t('rider.support.help.articleView.helpfulThanks')}</Text>
            </View>
          ) : (
            <View style={styles.helpfulRow} accessibilityRole="radiogroup" accessibilityLabel={t('rider.support.help.articleView.helpfulAria')}>
              <HelpfulButton
                label={t('rider.support.help.articleView.helpfulYes')}
                ariaLabel={t('rider.support.help.articleView.helpfulYesAria')}
                icon={ThumbsUp}
                iconColor={colors.success}
                textColor={colors.success}
                active={vote === 'yes'}
                reducedMotion={reducedMotion}
                onPress={() => handleVote('yes')}
              />
              <HelpfulButton
                label={t('rider.support.help.articleView.helpfulNo')}
                ariaLabel={t('rider.support.help.articleView.helpfulNoAria')}
                icon={ThumbsDown}
                iconColor={colors.textMuted}
                textColor={colors.textMuted}
                active={vote === 'no'}
                reducedMotion={reducedMotion}
                onPress={() => handleVote('no')}
              />
            </View>
          )}
        </View>

        {/* Related articles */}
        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <Text accessibilityRole="header" style={styles.relatedTitle}>
              {t('rider.support.help.articleView.relatedTitle')}
            </Text>
            <View style={styles.relatedList}>
              {related.map((rel, i) => {
                const RIcon = CATEGORY_ICONS[rel.category]
                const relTitle = t(articleTitleKey(rel.id))
                return (
                  <RelatedRow
                    key={rel.id}
                    icon={RIcon}
                    title={relTitle}
                    ariaLabel={t('rider.support.help.articleView.relatedRowAria', { title: relTitle })}
                    reducedMotion={reducedMotion}
                    last={i === related.length - 1}
                    onPress={() => openRelated(rel.id)}
                  />
                )
              })}
            </View>
          </View>
        )}

        {/* Escalate to support CTA — always one tap */}
        <View style={styles.escalateCard}>
          <View style={styles.escalateHead}>
            <Headset size={20} color={colors.primary} />
            <Text accessibilityRole="header" style={styles.escalateTitle}>
              {t('rider.support.help.articleView.escalateTitle')}
            </Text>
          </View>
          <Text style={styles.escalateBody}>{t('rider.support.help.articleView.escalateBody')}</Text>
          <TouchableOpacity
            style={styles.escalateBtn}
            onPress={() => router.push({ pathname: '/support/contact', params: { topic: articleId } })}
            accessibilityRole="button"
            accessibilityLabel={t('rider.support.help.articleView.escalateCtaAria')}
            activeOpacity={0.85}
          >
            <Text style={styles.escalateBtnText}>{t('rider.support.help.articleView.escalateCta')}</Text>
            <ChevronRight size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

function HelpfulButton({
  label,
  ariaLabel,
  icon: Icon,
  iconColor,
  textColor,
  active,
  reducedMotion,
  onPress,
}: {
  label: string
  ariaLabel: string
  icon: LucideIcon
  iconColor: string
  textColor: string
  active: boolean
  reducedMotion: boolean
  onPress: () => void
}) {
  const scale = useSharedValue(1)
  const handlePressIn = () => { if (!reducedMotion) scale.value = withSpring(0.94, { damping: 20, stiffness: 400 }) }
  const handlePressOut = () => { if (!reducedMotion) scale.value = withSpring(1, { damping: 20, stiffness: 400 }) }
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[styles.helpfulBtn, active && styles.helpfulBtnActive]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        activeOpacity={0.8}
      >
        <Icon size={16} color={iconColor} />
        <Text style={[styles.helpfulBtnText, { color: textColor }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

function RelatedRow({
  icon: Icon,
  title,
  ariaLabel,
  reducedMotion,
  last,
  onPress,
}: {
  icon: LucideIcon
  title: string
  ariaLabel: string
  reducedMotion: boolean
  last: boolean
  onPress: () => void
}) {
  const scale = useSharedValue(1)
  const handlePressIn = () => { if (!reducedMotion) scale.value = withSpring(0.98, { damping: 20, stiffness: 400 }) }
  const handlePressOut = () => { if (!reducedMotion) scale.value = withSpring(1, { damping: 20, stiffness: 400 }) }
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[styles.relatedRow, !last && styles.relatedRowBorder]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        activeOpacity={0.85}
      >
        <View style={styles.relatedIcon}>
          <Icon size={16} color={colors.primary} />
        </View>
        <Text style={styles.relatedRowTitle} numberOfLines={2}>{title}</Text>
        <ChevronRight size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
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
  topBarTitleWrap: { flex: 1, alignItems: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, textAlign: 'center' },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[4] },

  // Article header
  articleHeader: { gap: spacing[2] },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    alignSelf: 'flex-start',
    backgroundColor: colors.primary50,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  categoryPillText: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.primary, letterSpacing: 0.4, textTransform: 'uppercase' },
  articleTitle: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.text, lineHeight: 26, fontFamily: fontFamily.sansBold[0] },

  // Readable content
  contentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
  },
  bodyText: { fontSize: fontSize.md[0], color: colors.textSecondary, lineHeight: 24, fontFamily: fontFamily.sans[0] },

  // Helpful
  helpfulCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  helpfulTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  helpfulRow: { flexDirection: 'row', gap: spacing[3] },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 44,
  },
  helpfulBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  helpfulBtnText: { fontSize: fontSize.sm[0], fontWeight: '600' },
  helpfulVoted: { paddingVertical: spacing[1] },
  helpfulThanks: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.textMuted, fontStyle: 'italic' },

  // Related
  relatedSection: { gap: spacing[2] },
  relatedTitle: { fontSize: fontSize.md[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  relatedList: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
  },
  relatedRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  relatedIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedRowTitle: { flex: 1, fontSize: fontSize.base[0], fontWeight: '500', color: colors.text, lineHeight: 19 },

  // Escalate
  escalateCard: {
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  escalateHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  escalateTitle: { fontSize: fontSize.md[0], fontWeight: '700', color: colors.text },
  escalateBody: { fontSize: fontSize.sm[0], color: colors.textSecondary, lineHeight: 20, fontFamily: fontFamily.sans[0] },
  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    alignSelf: 'flex-start',
    minHeight: 48,
  },
  escalateBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base[0] },
})
