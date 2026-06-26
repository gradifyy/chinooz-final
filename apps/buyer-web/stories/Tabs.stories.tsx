import type { Meta, StoryObj } from '@storybook/react'
import { Tabs } from '@chinooz/ui-web'
import { useState } from 'react'

const tabsMeta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
}

export default tabsMeta
type Story = StoryObj<typeof Tabs>

const items = [
  { key: 'all', label: 'All' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'home', label: 'Home & Kitchen' },
  { key: 'books', label: 'Books' },
]

export const Default: Story = {
  render: () => {
    const [active, setActive] = useState('all')
    return <Tabs tabs={items} activeKey={active} onChange={setActive} />
  },
}

export const WithActiveElectronics: Story = {
  render: () => {
    const [active, setActive] = useState('electronics')
    return <Tabs tabs={items} activeKey={active} onChange={setActive} />
  },
}
