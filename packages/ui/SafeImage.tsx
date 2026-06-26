import React, { useState } from 'react'
import { Image, type ImageProps, type ImageSourcePropType } from 'react-native'
import { FALLBACK_AVATAR } from '@chinooz/utils'

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  source: string | null | undefined
  fallback?: string
}

export default function SafeImage({ source, fallback = FALLBACK_AVATAR, ...rest }: SafeImageProps) {
  const [failed, setFailed] = useState(false)

  const uri = !failed && typeof source === 'string' && source.startsWith('http')
    ? source
    : fallback

  return (
    <Image
      source={{ uri }}
      onError={() => setFailed(true)}
      accessibilityRole="image"
      {...rest}
    />
  )
}
