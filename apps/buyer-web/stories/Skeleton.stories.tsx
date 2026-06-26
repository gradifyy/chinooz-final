import type { Meta, StoryObj } from '@storybook/react'
import { Skeleton } from '@chinooz/ui-web'

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const TextLine: Story = { args: { height: 16, width: 300 } }
export const Circle: Story = { args: { height: 48, circle: true } }
export const Square: Story = { args: { height: 200, width: 200 } }
export const Button: Story = { args: { height: 44, width: 120, borderRadius: 12 } }
