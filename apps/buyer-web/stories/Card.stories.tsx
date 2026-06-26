import type { Meta, StoryObj } from '@storybook/react'
import { Card, Text } from '@chinooz/ui-web'

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    padded: { control: 'boolean' },
    elevated: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  args: {
    children: <Text>This is a card with default padding.</Text>,
  },
}

export const Elevated: Story = {
  args: {
    elevated: true,
    children: <Text>This card has a subtle shadow.</Text>,
  },
}

export const Clickable: Story = {
  args: {
    onPress: () => alert('Card clicked!'),
    children: <Text>Click this card</Text>,
  },
}
