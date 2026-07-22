import { useMemo } from 'react'
import { fontFamily } from '@chinooz/theme'

export function useFontFamily(locale: 'en' | 'ne' = 'en') {
  return useMemo(() => {
    if (locale === 'ne') {
      return {
        regular: fontFamily.devanagari[0],
        bold: fontFamily.devanagariBold[0],
        semibold: fontFamily.devanagariSemiBold[0],
      }
    }
    return {
      regular: fontFamily.sans[0],
      bold: fontFamily.sansBold[0],
      semibold: fontFamily.sansSemiBold[0],
    }
  }, [locale])
}
