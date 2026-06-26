import React from 'react'
import { View, TextInput, TouchableOpacity, Text } from 'react-native'

interface SearchBarProps {
  value: string
  onChangeText: (text: string) => void
  onSubmit?: () => void
  placeholder?: string
  onClear?: () => void
}

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search products, brands & more...',
  onClear,
}: SearchBarProps) {
  return (
    <View className="flex-row items-center bg-gray-100 rounded-xl px-4 h-10">
      <Text className="text-gray-400 mr-2 text-lg">⌕</Text>
      <TextInput
        className="flex-1 text-sm text-gray-900 h-full"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} className="ml-2">
          <Text className="text-gray-400 text-lg">✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
