import React from 'react'
import Text from './Text'
import type { HeadingProps } from '@chinooz/types/components'

export default function Heading({ variant = 'h2', children, testID }: HeadingProps) {
  return (
    <Text variant={variant} testID={testID}>
      {children}
    </Text>
  )
}
