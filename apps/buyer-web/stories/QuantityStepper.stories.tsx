import type { Meta, StoryObj } from '@storybook/react'
import { QuantityStepper } from '@chinooz/ui-web'
import { useState } from 'react'

const meta: Meta<typeof QuantityStepper> = {
  title: 'Components/QuantityStepper',
  component: QuantityStepper,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof QuantityStepper>

export const Default: Story = {
  render: () => {
    const [qty, setQty] = useState(1)
    return <QuantityStepper value={qty} onChange={setQty} />
  },
}

export const AtMin: Story = {
  render: () => <QuantityStepper value={1} min={1} onChange={() => {}} />,
}

export const AtMax: Story = {
  render: () => <QuantityStepper value={10} max={10} onChange={() => {}} />,
}
