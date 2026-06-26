import type { Meta, StoryObj } from '@storybook/react'
import { EmptyState } from '@chinooz/ui-web'

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const Default: Story = {
  args: {
    title: 'No items found',
    subtitle: 'Try adjusting your search or filter to find what you are looking for.',
  },
}

export const WithAction: Story = {
  args: {
    title: 'Your cart is empty',
    subtitle: 'Looks like you have not added anything yet. Start shopping to fill it up!',
    action: { label: 'Start Shopping', onPress: () => {} },
  },
}
