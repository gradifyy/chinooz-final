import { Screen, Skeleton, Stack, Grid } from '@chinooz/ui'
import { View } from 'react-native'

export default function CategoriesScreen() {
  return (
    <Screen>
      <Stack gap={16}>
        <Skeleton width="60%" height={24} />
        <Grid columns={2} gap={12}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i}>
              <Skeleton height={100} borderRadius={12} />
              <View style={{ marginTop: 8 }}>
                <Skeleton width="70%" height={14} />
              </View>
            </View>
          ))}
        </Grid>
      </Stack>
    </Screen>
  )
}
