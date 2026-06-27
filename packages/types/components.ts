import type { ReactNode } from 'react'
import type { Product, StockStatus, Order, OrderStatus } from './entities'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label'
export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'deal'
export type BadgeSize = 'sm' | 'md'
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'
export type ChipVariant = 'default' | 'active' | 'removable'
export type DividerOrientation = 'horizontal' | 'vertical'

export interface BaseProps {
  className?: string
  testID?: string
}

export interface ButtonProps extends BaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  onPress?: () => void
  children: ReactNode
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export interface TextProps extends BaseProps {
  variant?: TextVariant
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  color?: string
  align?: 'left' | 'center' | 'right'
  numberOfLines?: number
  children: ReactNode
}

export interface HeadingProps extends BaseProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4'
  children: ReactNode
}

export interface InputProps extends BaseProps {
  value?: string
  defaultValue?: string
  onChangeText?: (text: string) => void
  placeholder?: string
  label?: string
  error?: string
  hint?: string
  disabled?: boolean
  readOnly?: boolean
  secureTextEntry?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  onFocus?: () => void
  onBlur?: () => void
  keyboardType?: 'default' | 'email' | 'phone' | 'number'
  returnKeyType?: 'done' | 'next' | 'search' | 'go'
  onSubmitEditing?: () => void
  multiline?: boolean
  maxLength?: number
}

export interface SearchBarProps extends BaseProps {
  value: string
  onChangeText: (text: string) => void
  onSubmit?: () => void
  placeholder?: string
  onClear?: () => void
}

export interface CardProps extends BaseProps {
  padded?: boolean
  elevated?: boolean
  onPress?: () => void
  children: ReactNode
}

export interface BadgeProps extends BaseProps {
  label: string
  variant?: BadgeVariant
  size?: BadgeSize
}

export interface ChipProps extends BaseProps {
  label: string
  variant?: ChipVariant
  onPress?: () => void
  onRemove?: () => void
}

export interface AvatarProps extends BaseProps {
  source?: string | null
  name?: string
  size?: AvatarSize
  fallback?: ReactNode
}

export interface DividerProps extends BaseProps {
  orientation?: DividerOrientation
  color?: string
}

export interface SkeletonProps extends BaseProps {
  width?: number | string
  height?: number
  borderRadius?: number | string
  circle?: boolean
}

export interface SpinnerProps extends BaseProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export interface BottomSheetProps extends BaseProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export interface ModalProps extends BaseProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export interface ToastProps extends BaseProps {
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  visible: boolean
  action?: { label: string; onPress: () => void }
}

export interface TabsProps extends BaseProps {
  tabs: { key: string; label: string }[]
  activeKey: string
  onChange: (key: string) => void
}

export type InboxTab = 'notifications' | 'messages' | 'assistant'

export interface SegmentedControlProps extends BaseProps {
  segments: { key: string; label: string; badge?: number }[]
  activeKey: string
  onChange: (key: string) => void
}

export interface RatingProps extends BaseProps {
  rating: number
  maxStars?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  interactive?: boolean
  onChange?: (rating: number) => void
}

export interface PriceTextProps extends BaseProps {
  price: number
  compareAtPrice?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'deal' | 'muted'
}

export interface QuantityStepperProps extends BaseProps {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  disabled?: boolean
}

export interface EmptyStateProps extends BaseProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: { label: string; onPress: () => void }
}

export interface IconButtonProps extends BaseProps {
  icon: ReactNode
  onPress?: () => void
  size?: ButtonSize
  variant?: 'primary' | 'ghost' | 'outline'
  disabled?: boolean
  accessibilityLabel: string
}

export type ProductCardVariant = 'default' | 'compact'

export interface ProductCardProps extends BaseProps {
  product: Product
  variant?: ProductCardVariant
  wishlisted?: boolean
  onPress?: (product: Product) => void
  onToggleWishlist?: (product: Product) => void
  onAddToCart?: (product: Product) => void
  onLongPress?: (product: Product) => void
}

export interface OrderCardProps extends BaseProps {
  order: Order
  sellerName?: string
  shipmentCount?: number
  onPress?: (order: Order) => void
  onAction?: (order: Order) => void
}

export type TimelineStepStatus = 'completed' | 'current' | 'upcoming'

export interface TimelineStep {
  key: string
  label: string
  status: TimelineStepStatus
  timestamp?: string
  note?: string
}

export interface ShipmentTimeline {
  sellerName: string
  steps: TimelineStep[]
  estimatedDelivery?: string
  trackingNumber?: string
  isCod?: boolean
}

export interface OrderStatusTimelineProps extends BaseProps {
  steps: TimelineStep[]
  shipments?: ShipmentTimeline[]
  isCod?: boolean
  trackingNumber?: string
  onCopyTracking?: (trackingNumber: string) => void
}

export type { OrderStatus }
