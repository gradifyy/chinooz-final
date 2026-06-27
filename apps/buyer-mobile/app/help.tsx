import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors, radii, spacing } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

interface FAQ { id: string; q: string; a: string; topic: string }

const TOPICS = ['topicOrders', 'topicPayments', 'topicAccount', 'topicGeneral']

function FAQItem({ faq, reduced }: { faq: FAQ; reduced: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const rotation = useSharedValue(0)
  const height = useSharedValue(0)

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  const handleToggle = useCallback(() => {
    const next = !expanded
    setExpanded(next)
    rotation.value = withTiming(next ? 90 : 0, { duration: 200 })
  }, [expanded])

  return (
    <View style={s.faqItem}>
      <TouchableOpacity onPress={handleToggle} style={s.faqQuestion} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ expanded }}>
        <Text style={s.faqQText}>{faq.q}</Text>
        <Animated.Text style={[s.chevron, chevronStyle]}>›</Animated.Text>
      </TouchableOpacity>
      {expanded && (
        <Animated.View style={s.faqAnswer}>
          <Text style={s.faqAText}>{faq.a}</Text>
        </Animated.View>
      )}
    </View>
  )
}

export default function HelpScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const [search, setSearch] = useState('')

  const faqs: FAQ[] = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: `faq-${i + 1}`,
      q: t(`help.faq${i + 1}Q`),
      a: t(`help.faq${i + 1}A`),
      topic: i < 2 ? 'topicOrders' : i < 4 ? 'topicPayments' : i < 6 ? 'topicAccount' : 'topicGeneral',
    })), [t])

  const filtered = useMemo(() => {
    if (!search.trim()) return faqs
    const q = search.toLowerCase()
    return faqs.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  }, [faqs, search])

  const grouped = useMemo(() => {
    const map = new Map<string, FAQ[]>()
    for (const faq of filtered) {
      const arr = map.get(faq.topic) || []
      arr.push(faq)
      map.set(faq.topic, arr)
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('help.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Text style={s.searchIcon}>⌕</Text>
          <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder={t('help.searchPlaceholder')} placeholderTextColor={colors.textTertiary} accessibilityLabel={t('help.searchPlaceholder')} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {grouped.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>{t('help.noResults')}</Text>
            <Text style={s.emptySub}>{t('help.noResultsSubtitle')}</Text>
          </View>
        ) : (
          grouped.map(([topic, items]) => (
            <View key={topic} style={s.topicSection}>
              <Text style={s.topicHeader}>{t(`help.${topic}`).toUpperCase()}</Text>
              <View style={s.topicCard}>
                {items.map((faq, i) => (
                  <React.Fragment key={faq.id}>
                    {i > 0 && <View style={s.divider} />}
                    <FAQItem faq={faq} reduced={reduced} />
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))
        )}
        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: colors.text },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  searchWrap: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing[3], height: 40 },
  searchIcon: { fontSize: 18, color: colors.textMuted, marginRight: spacing[2] },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, height: '100%' },
  clearIcon: { fontSize: 14, color: colors.textMuted, padding: spacing[1] },
  list: { padding: spacing[4], gap: spacing[4] },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing[12], gap: spacing[2] },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textMuted },
  topicSection: { gap: spacing[2] },
  topicHeader: { fontSize: 12, fontWeight: '600', color: colors.textMuted, paddingLeft: spacing[4] },
  topicCard: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  faqItem: {},
  faqQuestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  faqQText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, marginRight: spacing[3] },
  chevron: { fontSize: 16, color: colors.textMuted },
  faqAnswer: { paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  faqAText: { fontSize: 16, fontWeight: '400', color: colors.textMuted, lineHeight: 24 },
  divider: { height: 1, backgroundColor: '#E5E5E5', marginLeft: spacing[4] },
})
