import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radii } from '@chinooz/theme'
import CategoryTree from '../../components/CategoryTree'
import OfflineBanner from '../../components/OfflineBanner'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE_PADDING = 16

export default function CategoriesScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <OfflineBanner />

      {/* Search bar */}
      <View style={{ paddingHorizontal: EDGE_PADDING, paddingTop: spacing[4], paddingBottom: spacing[2] }}>
        <TouchableOpacity
          onPress={() => router.push('/search')}
          style={{
            height: 44,
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing[3],
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>🔍 {t('common.searchPlaceholder')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: EDGE_PADDING,
          paddingTop: spacing[4],
          paddingBottom: insets.bottom + spacing[6],
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing[4] }}>
          {t('categories.title')}
        </Text>

        <CategoryTree />
      </ScrollView>
    </View>
  )
}
