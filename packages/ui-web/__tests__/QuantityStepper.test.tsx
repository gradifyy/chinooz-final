import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuantityStepper from '../QuantityStepper'

describe('QuantityStepper', () => {
  it('renders current value', () => {
    render(<QuantityStepper value={3} />)
    expect(screen.getByText('3')).toBeDefined()
  })

  it('calls onChange with value+1 when + clicked', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={2} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Increase quantity'))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('calls onChange with value-1 when − clicked', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={2} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Decrease quantity'))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('disables decrease button at min', () => {
    render(<QuantityStepper value={1} min={1} />)
    expect(screen.getByLabelText('Decrease quantity')).toHaveProperty('disabled', true)
  })

  it('disables increase button at max', () => {
    render(<QuantityStepper value={10} max={10} />)
    expect(screen.getByLabelText('Increase quantity')).toHaveProperty('disabled', true)
  })

  it('disables both buttons when disabled prop is true', () => {
    render(<QuantityStepper value={5} disabled />)
    expect(screen.getByLabelText('Increase quantity')).toHaveProperty('disabled', true)
    expect(screen.getByLabelText('Decrease quantity')).toHaveProperty('disabled', true)
  })

  it('renders with aria-labels for accessibility', () => {
    render(<QuantityStepper value={1} />)
    expect(screen.getByLabelText('Decrease quantity')).toBeDefined()
    expect(screen.getByLabelText('Increase quantity')).toBeDefined()
  })

  it('sets data-testid', () => {
    render(<QuantityStepper value={1} testID="qty" />)
    expect(screen.getByTestId('qty')).toBeDefined()
  })
})
