import type { Meta, StoryObj } from '@storybook/react'
import { Rating } from '@chinooz/ui-web'

const meta: Meta<typeof Rating> = {
  title: 'Components/Rating',
  component: Rating,
  tags: ['autodocs'],
  argTypes: {
    rating: { control: { type: 'number', min: 0, max: 5, step: 0.5 } },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    showValue: { control: 'boolean' },
    interactive: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Rating>

export const ThreeStars: Story = { args: { rating: 3, showValue: true } }
export const FourPointFive: Story = { args: { rating: 4.5, showValue: true } }
export const Interactive: Story = { args: { rating: 0, interactive: true, maxStars: 5, size: 'lg' } }
export const Small: Story = { args: { rating: 4, size: 'sm' } }
