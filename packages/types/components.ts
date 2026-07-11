import type { ReactNode } from 'react'
import type {
  Product,
  Order,
  OrderStatus,
  SellerInventoryVariant,
  StockEditMode,
  StockEditReason,
  SellerSubOrder,
} from './entities'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label'
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold'
export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'deal'
export type BadgeSize = 'sm' | 'md'
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'
export type RatingSize = 'sm' | 'md' | 'lg'
export type PriceTextSize = 'sm' | 'md' | 'lg'
export type ChipVariant = 'default' | 'active' | 'removable'
export type DividerOrientation = 'horizontal' | 'vertical'

export interface BaseProps {
  className?: string
  testID?: string
}

export type ButtonHaptic = 'none' | 'selection' | 'light' | 'medium'
export type ButtonShape = 'rounded' | 'pill'

export interface ButtonProps extends BaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** `pill` = full-radius CTAs (auth/onboarding). Default `rounded` = radii.lg */
  shape?: ButtonShape
  /** Haptic on press. Default `light` for primary actions; use `none` for dense toolbars. */
  haptic?: ButtonHaptic
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  onPress?: () => void
  children: ReactNode
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  accessibilityLabel?: string
}

export interface TextProps extends BaseProps {
  variant?: TextVariant
  weight?: FontWeight
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
  /** HTML autocomplete token (e.g. 'name', 'tel', 'email', 'one-time-code', 'street-address'). */
  autoComplete?: string
  /** Marks the field as required: sets `aria-required` and a visual asterisk. */
  required?: boolean
  /** Native form field name (lets `<form>` submit + browser autofill heuristics work). */
  name?: string
  /** Explicit id; when omitted a stable generated id is used. */
  id?: string
  /** Numeric keypad hint for OTP/codes without coercing to type=number. */
  inputModeOverride?: 'numeric' | 'text' | 'tel' | 'email'
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
  height?: number | string
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

// Shared used by both packages/ui (RN) and packages/ui-web (Tailwind).
// Maps to RN `flex-start`/`flex-end` and Tailwind `start`/`end` internally.
export type AlignValue = 'start' | 'center' | 'end' | 'stretch'
export type JustifyValue = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'

export interface StackProps {
  children: ReactNode
  gap?: number
  align?: AlignValue
  className?: string
}

export interface RowProps {
  children: ReactNode
  gap?: number
  align?: AlignValue
  justify?: JustifyValue
  className?: string
}

export interface ModalProps extends BaseProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** Unified SafeImage prop name — `src` is canonical; `source` accepts the RN alias. */
export interface SafeImageProps {
  src?: string | null
  source?: string | null
  fallback?: string
  className?: string
  testID?: string
  alt?: string
}

export interface AccordionProps extends BaseProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

export interface SortOption {
  key: string
  labelKey: string
}
export interface SortDropdownProps {
  visible: boolean
  onClose: () => void
  options: SortOption[]
  activeKey: string
  onSelect: (key: string) => void
  t?: (k: string) => string
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
  /** Tighter labels/badges + more track width for 3+ tabs. Defaults to false. */
  compact?: boolean
}

export interface RatingProps extends BaseProps {
  rating: number
  maxStars?: number
  size?: RatingSize
  showValue?: boolean
  interactive?: boolean
  onChange?: (rating: number) => void
}

export interface PriceTextProps extends BaseProps {
  price: number
  compareAtPrice?: number
  size?: PriceTextSize
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
  /** When false, render the final state with no entrance/pulse/line animations. Defaults to true. */
  animate?: boolean
}

export interface InventoryRowProps extends BaseProps {
  variant: SellerInventoryVariant
  /** Low-stock threshold; falls back to 10 when omitted. */
  lowStockThreshold?: number
  /** Commit a new stock value (optimistic; caller handles mutation). */
  onStockChange?: (stockCount: number, mode: StockEditMode, reason?: StockEditReason) => void
  /** Selection checkbox (bulk actions). */
  selected?: boolean
  onToggleSelect?: (id: string) => void
  /** Show optional web-only columns (committed, incoming, sold). */
  showOptionalColumns?: boolean
  /** Render the skeleton shimmer state. */
  loading?: boolean
  /** Layout: dense data-table row (web) vs compact card (mobile). */
  layout?: 'table' | 'compact'
  /** Enable the full edit popover/sheet with set/adjust + reason. */
  editable?: boolean
  /** Optimistic state: 'idle' | 'saving' | 'saved' | 'error' */
  editState?: 'idle' | 'saving' | 'saved' | 'error'
  /** Large-change threshold (absolute delta) before confirming. */
  largeChangeThreshold?: number
  /** Large-change percent swing before confirming. */
  largeChangePercent?: number
}

export type { OrderStatus }

export interface SellerOrderRowProps extends BaseProps {
  order: SellerSubOrder
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onPress?: (order: SellerSubOrder) => void
  onAction?: (order: SellerSubOrder) => void
  index?: number
  loading?: boolean
}

export interface SellerOrderCardProps extends BaseProps {
  order: SellerSubOrder
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onPress?: (order: SellerSubOrder) => void
  onAction?: (order: SellerSubOrder) => void
  index?: number
  loading?: boolean
}
