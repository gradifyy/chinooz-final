import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PriceText from '../PriceText'

describe('PriceText', () => {
  it('renders formatted NPR price', () => {
    render(<PriceText price={1999} />)
    expect(screen.getByText('NPR 1,999')).toBeDefined()
  })

  it('renders with default text color', () => {
    render(<PriceText price={1000} />)
    const price = screen.getByText('NPR 1,000')
    expect(price.className).toContain('text-text')
  })

  it('renders with primary color for deal variant', () => {
    render(<PriceText price={1000} variant="deal" />)
    const price = screen.getByText('NPR 1,000')
    expect(price.className).toContain('text-primary')
  })

  it('renders compare-at price with strikethrough', () => {
    render(<PriceText price={800} compareAtPrice={1000} />)
    expect(screen.getByText('NPR 1,000')).toBeDefined()
    const compareEl = screen.getByText('NPR 1,000')
    expect(compareEl.className).toContain('line-through')
  })

  it('renders discount percentage', () => {
    render(<PriceText price={800} compareAtPrice={1000} />)
    expect(screen.getByText('20% OFF')).toBeDefined()
  })

  it('does not render compare price when not greater than price', () => {
    render(<PriceText price={1000} compareAtPrice={800} />)
    expect(screen.queryByText('NPR 800')).toBeNull()
  })

  it('applies size classes', () => {
    render(<PriceText price={100} size="lg" />)
    const price = screen.getByText('NPR 100')
    expect(price.className).toContain('text-[24px]')
  })

  it('sets data-testid', () => {
    render(<PriceText price={100} testID="price" />)
    expect(screen.getByTestId('price')).toBeDefined()
  })
})
