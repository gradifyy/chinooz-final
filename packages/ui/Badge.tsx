import React from 'react'
import { View, Text } from 'react-native'

interface BadgeProps {
  label: string
  variant?: 'primary' | 'deal' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
}

const variantStyles = {
  primary: 'bg-[#8A1B57]',
  deal: 'bg-[#E0A93B]',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
}

export default function Badge({ label, variant = 'primary', size = 'md' }: BadgeProps) {
  return (
    <View className={`${variantStyles[variant]} ${size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'} rounded-full`}>
      <Text className={`text-white font-bold ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>{label}</Text>
    </View>
  )
}
