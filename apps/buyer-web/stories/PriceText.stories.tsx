import type { Meta, StoryObj } from '@storybook/react'
import { PriceText } from '@chinooz/ui-web'

const meta: Meta<typeof PriceText> = {
  title: 'Components/PriceText',
  component: PriceText,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: { control: 'select', options: ['default', 'deal', 'muted'] },
  },
}

export default meta
type Story = StoryObj<typeof PriceText>

export const Default: Story = { args: { price: 1499 } }
export const WithDiscount: Story = { args: { price: 1199, compareAtPrice: 1999 } }
export const Deal: Story = { args: { price: 899, compareAtPrice: 2499, variant: 'deal' } }
export const Large: Story = { args: { price: 54999, size: 'lg' } }
