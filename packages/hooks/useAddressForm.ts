import { useState, useCallback } from 'react'
import { useAddressStore, useCheckoutStore } from '@chinooz/state'
import type { SavedAddress } from '@chinooz/state'
import { addressFormSchema } from '@chinooz/validation'

interface UseAddressFormOptions {
  onValidChange?: (valid: boolean) => void
  onSelect?: () => void
}

export function useAddressForm({ onValidChange, onSelect }: UseAddressFormOptions = {}) {
  const addresses = useAddressStore(s => s.addresses)
  const addAddress = useAddressStore(s => s.addAddress)
  const removeAddress = useAddressStore(s => s.removeAddress)
  const setDefault = useAddressStore(s => s.setDefault)
  const checkoutAddress = useCheckoutStore(s => s.address)
  const setCheckoutAddress = useCheckoutStore(s => s.setAddress)

  const [selectedId, setSelectedId] = useState<string | null>(
    checkoutAddress ? null : addresses.find(a => a.isDefault)?.id || null,
  )
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [label, setLabel] = useState<'home' | 'work' | 'other'>('home')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSelect = useCallback((addr: SavedAddress) => {
    setSelectedId(addr.id)
    setCheckoutAddress({
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      area: addr.area,
      city: addr.city,
      label: addr.label,
    })
    onValidChange?.(true)
    onSelect?.()
  }, [setCheckoutAddress, onValidChange, onSelect])

  const handleAddNew = useCallback(() => {
    setName('')
    setPhone('')
    setStreet('')
    setArea('')
    setLabel('home')
    setErrors({})
    setEditingId(null)
    setShowForm(true)
  }, [])

  const handleEdit = useCallback((addr: SavedAddress) => {
    setName(addr.fullName)
    setPhone(addr.phone)
    setStreet(addr.street)
    setArea(addr.area)
    setLabel(addr.label)
    setErrors({})
    setEditingId(addr.id)
    setShowForm(true)
  }, [])

  const performDelete = useCallback((id: string) => {
    removeAddress(id)
    if (selectedId === id) {
      setSelectedId(null)
      onValidChange?.(false)
    }
  }, [selectedId, removeAddress, onValidChange])

  const handleSave = useCallback(() => {
    const result = addressFormSchema.safeParse({ fullName: name, phone, street, area, city: 'Kathmandu', label })
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        newErrors[issue.path[0] as string] = issue.message
      })
      setErrors(newErrors)
      return
    }
    setErrors({})
    if (editingId) removeAddress(editingId)
    addAddress({ fullName: name.trim(), phone, street: street.trim(), area, city: 'Kathmandu', label })
    setShowForm(false)
    setEditingId(null)
  }, [name, phone, street, area, label, editingId, addAddress, removeAddress])

  const handleCancel = useCallback(() => {
    setShowForm(false)
    setEditingId(null)
  }, [])

  const isValid = name.trim().length >= 2 && phone.length === 10 && street.length >= 3 && area.length >= 2

  return {
    addresses,
    setDefault,
    selectedId,
    showForm,
    editingId,
    name,
    setName,
    phone,
    setPhone,
    street,
    setStreet,
    area,
    setArea,
    label,
    setLabel,
    errors,
    handleSelect,
    handleAddNew,
    handleEdit,
    performDelete,
    handleSave,
    handleCancel,
    isValid,
  }
}
