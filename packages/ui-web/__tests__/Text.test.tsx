import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Text from '../Text'

describe('Text', () => {
  it('renders children', () => {
    render(<Text>Hello world</Text>)
    expect(screen.getByText('Hello world')).toBeDefined()
  })

  it('applies body variant by default', () => {
    render(<Text>Body</Text>)
    const el = screen.getByText('Body')
    expect(el.className).toContain('text-base')
    expect(el.className).toContain('font-normal')
  })

  it('applies h1 variant classes', () => {
    render(<Text variant="h1">Heading 1</Text>)
    const el = screen.getByText('Heading 1')
    expect(el.className).toContain('text-3xl')
    expect(el.className).toContain('font-bold')
  })

  it('applies h2 variant classes', () => {
    render(<Text variant="h2">Heading 2</Text>)
    const el = screen.getByText('Heading 2')
    expect(el.className).toContain('text-2xl')
  })

  it('applies caption variant classes', () => {
    render(<Text variant="caption">Caption</Text>)
    const el = screen.getByText('Caption')
    expect(el.className).toContain('text-sm')
  })

  it('applies weight override', () => {
    render(<Text weight="bold">Bold Body</Text>)
    const el = screen.getByText('Bold Body')
    expect(el.className).toContain('font-bold')
  })

  it('applies custom className', () => {
    render(<Text className="text-primary">Custom</Text>)
    const el = screen.getByText('Custom')
    expect(el.className).toContain('text-primary')
  })

  it('sets data-testid', () => {
    render(<Text testID="my-text">Test</Text>)
    expect(screen.getByTestId('my-text')).toBeDefined()
  })

  it('applies numberOfLines truncation styles', () => {
    render(<Text numberOfLines={2}>Truncated</Text>)
    const el = screen.getByText('Truncated')
    expect(el.style.overflow).toBe('hidden')
    expect(el.style.WebkitLineClamp).toBe('2')
  })
})
