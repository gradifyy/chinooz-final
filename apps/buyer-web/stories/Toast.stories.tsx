'use client'

import { useState } from 'react'
import { Toast, Button } from '@chinooz/ui-web'

export default function ToastStories() {
  const [shown, setShown] = useState(false)
  return (
    <div className="p-8">
      <div className="flex gap-2">
        <Button onPress={() => setShown(true)} variant="primary">Show Toast</Button>
        <Button onPress={() => setShown(false)} variant="secondary">Hide</Button>
      </div>
      {shown && (
        <Toast
          variant="info"
          message="Item added to cart"
          action={{ label: 'Undo', onPress: () => {} }}
          onDismiss={() => setShown(false)}
        />
      )}
    </div>
  )
}
