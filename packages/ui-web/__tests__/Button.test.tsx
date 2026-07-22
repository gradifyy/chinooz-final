import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../Button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDefined()
  })

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>)
    const btn = screen.getByText('Primary').closest('button')!
    expect(btn.className).toContain('bg-primary')
    expect(btn.className).toContain('text-white')
  })

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const btn = screen.getByText('Secondary').closest('button')!
    expect(btn.className).toContain('bg-primary-50')
    expect(btn.className).toContain('text-primary')
  })

  it('applies destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    const btn = screen.getByText('Delete').closest('button')!
    expect(btn.className).toContain('bg-error')
  })

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const btn = screen.getByText('Ghost').closest('button')!
    expect(btn.className).toContain('bg-transparent')
  })

  it('applies size classes', () => {
    render(<Button size="sm">Small</Button>)
    const btn = screen.getByText('Small').closest('button')!
    expect(btn.className).toContain('h-11')

    render(<Button size="lg">Large</Button>)
    const largeBtn = screen.getByText('Large').closest('button')!
    expect(largeBtn.className).toContain('h-[52px]')
  })

  it('applies fullWidth class', () => {
    render(<Button fullWidth>Full</Button>)
    const btn = screen.getByText('Full').closest('button')!
    expect(btn.className).toContain('w-full')
  })

  it('calls onPress when clicked', async () => {
    const onPress = vi.fn()
    render(<Button onPress={onPress}>Click</Button>)
    await userEvent.click(screen.getByText('Click'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not call onPress when disabled', async () => {
    const onPress = vi.fn()
    render(<Button disabled onPress={onPress}>Click</Button>)
    await userEvent.click(screen.getByText('Click'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('does not call onPress when loading', async () => {
    const onPress = vi.fn()
    const { container } = render(<Button loading onPress={onPress}>Click</Button>)
    const btn = container.querySelector('button')!
    await userEvent.click(btn)
    expect(onPress).not.toHaveBeenCalled()
  })

  it('shows spinner when loading', () => {
    const { container } = render(<Button loading>Loading</Button>)
    const btn = container.querySelector('button')!
    expect(btn.querySelector('svg.animate-spin')).not.toBeNull()
  })

  it('renders left and right icons', () => {
    render(
      <Button leftIcon={<span data-testid="left">L</span>} rightIcon={<span data-testid="right">R</span>}>
        With Icons
      </Button>
    )
    expect(screen.getByTestId('left')).toBeDefined()
    expect(screen.getByTestId('right')).toBeDefined()
  })

  it('sets data-testid', () => {
    render(<Button testID="submit-btn">Submit</Button>)
    expect(screen.getByTestId('submit-btn')).toBeDefined()
  })
})
