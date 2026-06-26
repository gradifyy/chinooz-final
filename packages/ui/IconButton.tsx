import React from 'react'
import { TouchableOpacity } from 'react-native'
import { colors, radii } from '@chinooz/theme'
import type { IconButtonProps } from '@chinooz/types/components'

const sizeMap: Record<string, number> = { sm: 36, md: 44, lg: 48 }
const variantMap: Record<string, string> = {
  primary: colors.primary,
  ghost: 'transparent',
  outline: 'transparent',
}

export default function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  disabled,
  accessibilityLabel,
  testID,
}: IconButtonProps) {
  const dim = sizeMap[size]
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={{
        width: dim,
        height: dim,
        borderRadius: radii.full,
        backgroundColor: variantMap[variant],
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        minWidth: 44,
        minHeight: 44,
      }}
    >
      {icon}
    </TouchableOpacity>
  )
}
