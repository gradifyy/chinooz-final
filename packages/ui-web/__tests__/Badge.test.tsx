import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from '../Badge'

describe('Badge', () => {
  it('renders label text', () => {
    render(<Badge label="New" />)
    expect(screen.getByText('New')).toBeDefined()
  })

  it('applies primary variant classes by default', () => {
    render(<Badge label="Default" />)
    const badge = screen.getByText('Default')
    expect(badge.className).toContain('bg-primary')
    expect(badge.className).toContain('text-white')
  })

  it('applies deal variant with gold bg and text-text (AA contrast)', () => {
    render(<Badge label="-20%" variant="deal" />)
    const badge = screen.getByText('-20%')
    expect(badge.className).toContain('bg-gold')
    expect(badge.className).toContain('text-text')
  })

  it('applies warning variant with warning-text color', () => {
    render(<Badge label="Warning" variant="warning" />)
    const badge = screen.getByText('Warning')
    expect(badge.className).toContain('text-warning-text')
  })

  it('applies error variant classes', () => {
    render(<Badge label="Error" variant="error" />)
    const badge = screen.getByText('Error')
    expect(badge.className).toContain('bg-error')
  })

  it('applies sm size classes', () => {
    render(<Badge label="Small" size="sm" />)
    const badge = screen.getByText('Small')
    expect(badge.className).toContain('text-[10px]')
  })

  it('applies md size classes by default', () => {
    render(<Badge label="Medium" />)
    const badge = screen.getByText('Medium')
    expect(badge.className).toContain('text-[11px]')
  })

  it('sets data-testid', () => {
    render(<Badge label="Test" testID="my-badge" />)
    expect(screen.getByTestId('my-badge')).toBeDefined()
  })
})
