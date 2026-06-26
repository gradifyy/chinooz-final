import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from '@chinooz/ui-web'

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'success', 'warning', 'error', 'info', 'neutral', 'deal'] },
    size: { control: 'select', options: ['sm', 'md'] },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Primary: Story = { args: { label: 'New', variant: 'primary' } }
export const Success: Story = { args: { label: 'In Stock', variant: 'success' } }
export const Warning: Story = { args: { label: 'Low Stock', variant: 'warning' } }
export const Error: Story = { args: { label: 'Sold Out', variant: 'error' } }
export const Deal: Story = { args: { label: '50% OFF', variant: 'deal' } }
export const Small: Story = { args: { label: 'New', size: 'sm' } }
