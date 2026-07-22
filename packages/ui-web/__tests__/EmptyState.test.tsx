import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmptyState from '../EmptyState'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items" />)
    expect(screen.getByText('No items')).toBeDefined()
  })

  it('renders subtitle when provided', () => {
    render(<EmptyState title="Empty" subtitle="Try again later" />)
    expect(screen.getByText('Try again later')).toBeDefined()
  })

  it('does not render subtitle when not provided', () => {
    render(<EmptyState title="Empty" />)
    expect(screen.queryByText('Try again later')).toBeNull()
  })

  it('renders icon when provided', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="icon">📭</span>} />)
    expect(screen.getByTestId('icon')).toBeDefined()
  })

  it('renders action button when action is provided', async () => {
    const onPress = vi.fn()
    render(<EmptyState title="Empty" action={{ label: 'Retry', onPress }} />)
    const btn = screen.getByText('Retry')
    expect(btn).toBeDefined()
    await userEvent.click(btn)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not render action when not provided', () => {
    render(<EmptyState title="Empty" />)
    expect(screen.queryByText('Retry')).toBeNull()
  })

  it('renders with testID prop', () => {
    render(<EmptyState title="Test" testID="empty" />)
    expect(screen.getByText('Test')).toBeDefined()
  })
})
