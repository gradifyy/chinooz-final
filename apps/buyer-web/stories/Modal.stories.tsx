'use client'

import { useState } from 'react'
import { Modal, Button } from '@chinooz/ui-web'

export default function ModalStories() {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-8">
      <Button onPress={() => setOpen(true)}>Open Modal</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirm action">
        <p className="text-sm text-text-muted mb-4">Are you sure you want to proceed?</p>
        <div className="flex gap-3">
          <Button variant="secondary" onPress={() => setOpen(false)}>Cancel</Button>
          <Button onPress={() => setOpen(false)}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}
