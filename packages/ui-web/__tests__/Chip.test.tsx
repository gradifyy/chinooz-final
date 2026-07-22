import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chip from '../Chip'

describe('Chip', () => {
  it('renders label text', () => {
    render(<Chip label="Electronics" />)
    expect(screen.getByText('Electronics')).toBeDefined()
  })

  it('applies default variant classes', () => {
    render(<Chip label="Default" />)
    const chip = screen.getByText('Default').closest('button')!
    expect(chip.className).toContain('bg-background')
    expect(chip.className).toContain('border-border')
  })

  it('applies active variant classes', () => {
    render(<Chip label="Active" variant="active" />)
    const chip = screen.getByText('Active').closest('button')!
    expect(chip.className).toContain('bg-primary')
    expect(chip.className).toContain('text-white')
  })

  it('calls onPress when clicked', async () => {
    const onPress = vi.fn()
    render(<Chip label="Click" onPress={onPress} />)
    await userEvent.click(screen.getByText('Click'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('renders remove button when variant is removable', () => {
    const onRemove = vi.fn()
    render(<Chip label="Removable" variant="removable" onRemove={onRemove} />)
    expect(screen.getByLabelText('Remove')).toBeDefined()
  })

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn()
    render(<Chip label="Removable" variant="removable" onRemove={onRemove} />)
    fireEvent.click(screen.getByLabelText('Remove'))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('sets data-testid', () => {
    render(<Chip label="Test" testID="my-chip" />)
    expect(screen.getByTestId('my-chip')).toBeDefined()
  })
})
