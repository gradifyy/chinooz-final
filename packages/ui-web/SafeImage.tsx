'use client'

import React, { useState } from 'react'
import { FALLBACK_AVATAR } from '@chinooz/utils'

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined
  fallback?: string
}

export default function SafeImage({ src, fallback = FALLBACK_AVATAR, alt = '', ...rest }: SafeImageProps) {
  const [failed, setFailed] = useState(false)

  const uri = !failed && typeof src === 'string' && src.startsWith('http')
    ? src
    : fallback

  return (
    <img
      src={uri}
      alt={alt}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
      {...rest}
    />
  )
}
