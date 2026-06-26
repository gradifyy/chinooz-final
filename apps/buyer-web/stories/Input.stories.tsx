import type { Meta, StoryObj } from '@storybook/react'
import { Input } from '@chinooz/ui-web'

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    hint: { control: 'text' },
    disabled: { control: 'boolean' },
    secureTextEntry: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { placeholder: 'Enter text...', label: 'Full Name' },
}

export const WithError: Story = {
  args: { placeholder: 'Email', label: 'Email', error: 'Invalid email address', value: 'bad' },
}

export const WithHint: Story = {
  args: { placeholder: 'Password', label: 'Password', hint: 'At least 8 characters', secureTextEntry: true },
}

export const Disabled: Story = {
  args: { placeholder: 'Disabled input', label: 'Disabled', disabled: true },
}

export const Textarea: Story = {
  args: { placeholder: 'Write your message...', label: 'Message', multiline: true },
}
