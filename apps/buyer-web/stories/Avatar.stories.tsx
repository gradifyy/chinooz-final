import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from '@chinooz/ui-web'

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    name: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Avatar>

export const WithInitials: Story = { args: { name: 'Priya Sharma' } }
export const Small: Story = { args: { name: 'RJ', size: 'sm' } }
export const Large: Story = { args: { name: 'Ananya Patel', size: 'lg' } }
export const NoName: Story = { args: {} }
