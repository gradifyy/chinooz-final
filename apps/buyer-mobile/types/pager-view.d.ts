declare module 'react-native-pager-view' {
  import { Component } from 'react'
  import { ViewProps } from 'react-native'

  export interface PagerViewProps extends ViewProps {
    initialPage?: number
    scrollEnabled?: boolean
    overdrag?: boolean
    overScrollMode?: string
    onPageSelected?: (e: { nativeEvent: { position: number } }) => void
    onPageScroll?: (e: { nativeEvent: { position: number; offset: number } }) => void
    onPageScrollStateChanged?: (e: { nativeEvent: { pageScrollState: string } }) => void
    children?: React.ReactNode
  }

  export default class PagerView extends Component<PagerViewProps> {
    setPage(index: number): void
    setPageWithoutAnimation(index: number): void
  }
}
