import React from 'react'
import { View } from 'react-native'
import Shimmer from './Shimmer'

export default function LoadingView() {
  return (
    <View className="p-4 space-y-4">
      <Shimmer width="100%" height={180} borderRadius={12} />
      <View className="flex-row space-x-3">
        {[1, 2, 3].map(i => (
          <Shimmer key={i} width={100} height={120} borderRadius={12} />
        ))}
      </View>
      <Shimmer width="100%" height={80} borderRadius={12} />
      <Shimmer width="100%" height={80} borderRadius={12} />
      <Shimmer width="100%" height={80} borderRadius={12} />
    </View>
  )
}
