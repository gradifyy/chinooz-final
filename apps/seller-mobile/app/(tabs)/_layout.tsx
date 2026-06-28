import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SellerTopBar } from '../../components/SellerTopBar'
import { SellerTabBar } from '../../components/SellerTabBar'
import { AddProductSheet } from '../../components/AddProductSheet'

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top }}>
        <SellerTopBar />
      </View>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="products" />
        <Stack.Screen name="orders" />
        <Stack.Screen name="more" />
      </Stack>
      <SellerTabBar onAddPress={() => setAddOpen(true)} />
      <AddProductSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
})
