import type { Meta, StoryObj } from '@storybook/react'
import { Chip } from '@chinooz/ui-web'

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'active', 'removable'] },
  },
}

export default meta
type Story = StoryObj<typeof Chip>

export const Default: Story = { args: { label: 'Electronics' } }
export const Active: Story = { args: { label: 'Selected', variant: 'active' } }
export const Removable: Story = { args: { label: 'Filter', variant: 'removable' } }
