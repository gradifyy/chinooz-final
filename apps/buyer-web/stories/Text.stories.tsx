import type { Meta, StoryObj } from '@storybook/react'
import { Text } from '@chinooz/ui-web'

const meta: Meta<typeof Text> = {
  title: 'Components/Text',
  component: Text,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['h1', 'h2', 'h3', 'h4', 'body', 'caption', 'label'] },
    weight: { control: 'select', options: ['normal', 'medium', 'semibold', 'bold'] },
    align: { control: 'select', options: ['left', 'center', 'right'] },
  },
}

export default meta
type Story = StoryObj<typeof Text>

export const Heading1: Story = {
  args: { variant: 'h1', children: 'Heading 1' },
}

export const Heading2: Story = {
  args: { variant: 'h2', children: 'Heading 2' },
}

export const Body: Story = {
  args: { children: 'This is body text for the application.' },
}

export const Caption: Story = {
  args: { variant: 'caption', children: 'Small caption text' },
}

export const Bold: Story = {
  args: { weight: 'bold', children: 'Bold text' },
}
