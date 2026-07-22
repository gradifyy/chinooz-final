import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps } from 'react'

type IconName = ComponentProps<typeof Ionicons>['name']

interface IconProps {
  name: IconName
  size?: number
  color?: string
  style?: ComponentProps<typeof Ionicons>['style']
}

export const Icon = React.memo(function Icon({ name, size = 22, color, style }: IconProps) {
  return <Ionicons name={name} size={size} color={color} style={style} />
})

export default Icon
export type { IconName }
