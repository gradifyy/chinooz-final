import { Screen, ProductGrid, Skeleton, Stack, Section } from '@chinooz/ui'
import { View } from 'react-native'

export default function HomeScreen() {
  return (
    <Screen>
      <Stack gap={24}>
        <Skeleton width="100%" height={180} borderRadius={16} />

        <Section title="Categories">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width={72} height={72} circle />
            ))}
          </View>
        </Section>

        <Section title="Flash Deals" action={{ label: 'See All', onPress: () => {} }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <View key={i} style={{ width: 140 }}>
                <Skeleton width={140} height={140} borderRadius={12} />
                <View style={{ gap: 6, marginTop: 8 }}>
                  <Skeleton width="100%" height={12} />
                  <Skeleton width="50%" height={14} />
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Popular Near You">
          <ProductGrid count={4} />
        </Section>

        <Section title="Recommended">
          <ProductGrid count={4} />
        </Section>
      </Stack>
    </Screen>
  )
}
