import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@chinooz/ui-web'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'destructive'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', children: 'Buy Now' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Add to Cart' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Cancel' },
}

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Delete' },
}

export const Small: Story = {
  args: { size: 'sm', children: 'Small' },
}

export const Large: Story = {
  args: { size: 'lg', children: 'Large' },
}

export const Loading: Story = {
  args: { loading: true, children: 'Loading...' },
}

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
}

export const FullWidth: Story = {
  args: { fullWidth: true, children: 'Full Width Button' },
}
