import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { useAddressStore, useCheckoutStore } from '@chinooz/state'
import { addressFormSchema } from '@chinooz/validation'
import type { SavedAddress } from '@chinooz/state'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const KATHMANDU_AREAS = [
  'Baneshwor', 'Thamel', 'New Road', 'Patan', 'Bhaktapur', 'Koteshwor',
  'Tokha', 'Budhanilkantha', 'Balaju', 'Maharajgunj', 'Lazimpat', 'Durbar Marg',
  'Putalisadak', 'Maitidevi', 'Sinamangal', 'Chabahil', 'Swayambhu', 'Kalanki',
]

interface AddressStepProps {
  onValidChange?: (valid: boolean) => void
}

export default function AddressStep({ onValidChange }: AddressStepProps) {
  const { t } = useTranslation()
  const addresses = useAddressStore(s => s.addresses)
  const addAddress = useAddressStore(s => s.addAddress)
  const removeAddress = useAddressStore(s => s.removeAddress)
  const setDefault = useAddressStore(s => s.setDefault)
  const checkoutAddress = useCheckoutStore(s => s.address)
  const setCheckoutAddress = useCheckoutStore(s => s.setAddress)

  const [selectedId, setSelectedId] = useState<string | null>(
    checkoutAddress ? null : addresses.find(a => a.isDefault)?.id || null
  )
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [area, setArea] = useState('')
  const [label, setLabel] = useState<'home' | 'work' | 'other'>('home')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const checkScale = useSharedValue(0)

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
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [setCheckoutAddress, onValidChange])

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

  const handleDelete = useCallback((id: string) => {
    Alert.alert(t('checkout.deleteAddress'), t('checkout.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeAddress(id)
          if (selectedId === id) {
            setSelectedId(null)
            onValidChange?.(false)
          }
        },
      },
    ])
  }, [selectedId, removeAddress, onValidChange, t])

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

    if (editingId) {
      removeAddress(editingId)
    }
    addAddress({ fullName: name.trim(), phone, street: street.trim(), area, city: 'Kathmandu', label })
    setShowForm(false)
    setEditingId(null)
  }, [name, phone, street, area, label, editingId, addAddress, removeAddress])

  const isValid = name.trim().length >= 2 && phone.length === 10 && street.length >= 3 && area.length >= 2

  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('checkout.address')}</Text>

      {/* Saved addresses */}
      {addresses.length > 0 && (
        <View style={{ gap: spacing[2] }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
            {t('checkout.savedAddresses')}
          </Text>
          {addresses.map((addr, i) => {
            const isSelected = selectedId === addr.id
            return (
              <Animated.View
                key={addr.id}
                entering={FadeInDown.delay(i * 50).duration(250)}
              >
                <TouchableOpacity
                  onPress={() => handleSelect(addr)}
                  style={{
                    padding: spacing[3],
                    borderRadius: radii.lg,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                    gap: spacing[1.5],
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: radii.full,
                        backgroundColor: addr.label === 'home' ? colors.primary50 : addr.label === 'work' ? colors.infoLight : colors.border,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: addr.label === 'home' ? colors.primary : addr.label === 'work' ? colors.info : colors.textMuted }}>
                          {t(`location.${addr.label}`)}
                        </Text>
                      </View>
                      {addr.isDefault && (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.full, backgroundColor: colors.successLight }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.success }}>{t('checkout.default')}</Text>
                        </View>
                      )}
                    </View>
                    {isSelected && (
                      <Animated.Text style={{ fontSize: 18, color: colors.primary, fontWeight: '700' }}>✓</Animated.Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{addr.fullName}</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>{addr.phone}</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>
                    {addr.street}, {addr.area}, {addr.city}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[1] }}>
                    <TouchableOpacity onPress={() => handleEdit(addr)}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(addr.id)}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.error }}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                    {!addr.isDefault && (
                      <TouchableOpacity onPress={() => setDefault(addr.id)}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>{t('checkout.setDefault')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )
          })}
        </View>
      )}

      {/* Add new address */}
      {!showForm ? (
        <TouchableOpacity
          onPress={handleAddNew}
          style={{
            padding: spacing[3],
            borderRadius: radii.lg,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderStyle: 'dashed',
            alignItems: 'center',
            gap: spacing[1],
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 20, color: colors.primary }}>+</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{t('checkout.addNewAddress')}</Text>
        </TouchableOpacity>
      ) : (
        <Animated.View entering={FadeIn.duration(250)} style={{ gap: spacing[3] }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
            {editingId ? t('checkout.editAddress') : t('checkout.addNewAddress')}
          </Text>

          {/* Name */}
          <View style={{ gap: spacing[1] }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>{t('location.fullName')} *</Text>
            <TextInput
              style={{
                height: 48,
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1.5,
                borderColor: errors.fullName ? colors.error : colors.border,
                paddingHorizontal: spacing[3],
                fontSize: 15,
                color: colors.text,
              }}
              value={name}
              onChangeText={setName}
              placeholder={t('location.fullNamePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('location.fullName')}
            />
            {errors.fullName && <Text style={{ fontSize: 12, color: colors.error }}>{errors.fullName}</Text>}
          </View>

          {/* Phone */}
          <View style={{ gap: spacing[1] }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>{t('location.phone')} *</Text>
            <TextInput
              style={{
                height: 48,
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1.5,
                borderColor: errors.phone ? colors.error : colors.border,
                paddingHorizontal: spacing[3],
                fontSize: 15,
                color: colors.text,
              }}
              value={phone}
              onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              placeholder="98XXXXXXXX"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              maxLength={10}
              accessibilityLabel={t('location.phone')}
            />
            {errors.phone && <Text style={{ fontSize: 12, color: colors.error }}>{errors.phone}</Text>}
          </View>

          {/* Street */}
          <View style={{ gap: spacing[1] }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>{t('location.street')} *</Text>
            <TextInput
              style={{
                height: 48,
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1.5,
                borderColor: errors.street ? colors.error : colors.border,
                paddingHorizontal: spacing[3],
                fontSize: 15,
                color: colors.text,
              }}
              value={street}
              onChangeText={setStreet}
              placeholder={t('location.street')}
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('location.street')}
            />
            {errors.street && <Text style={{ fontSize: 12, color: colors.error }}>{errors.street}</Text>}
          </View>

          {/* Area */}
          <View style={{ gap: spacing[1] }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>{t('location.area')} *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
              {KATHMANDU_AREAS.map(a => (
                <TouchableOpacity
                  key={a}
                  onPress={() => setArea(a)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: radii.full,
                    borderWidth: 1.5,
                    borderColor: area === a ? colors.primary : colors.border,
                    backgroundColor: area === a ? colors.primary50 : colors.surface,
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontWeight: area === a ? '600' : '400', color: area === a ? colors.primary : colors.text }}>
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {errors.area && <Text style={{ fontSize: 12, color: colors.error }}>{errors.area}</Text>}
          </View>

          {/* City (locked) */}
          <View style={{ gap: spacing[1] }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>{t('location.city')}</Text>
            <TextInput
              style={{
                height: 48,
                backgroundColor: colors.background,
                borderRadius: radii.lg,
                borderWidth: 1.5,
                borderColor: colors.border,
                paddingHorizontal: spacing[3],
                fontSize: 15,
                color: colors.textMuted,
              }}
              value="Kathmandu"
              editable={false}
            />
          </View>

          {/* Label chips */}
          <View style={{ gap: spacing[1] }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>{t('location.label')}</Text>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {(['home', 'work', 'other'] as const).map(l => (
                <TouchableOpacity
                  key={l}
                  onPress={() => setLabel(l)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: radii.lg,
                    borderWidth: 1.5,
                    borderColor: label === l ? colors.primary : colors.border,
                    backgroundColor: label === l ? colors.primary50 : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: label === l ? colors.primary : colors.textMuted }}>
                    {t(`location.${l}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
            <TouchableOpacity
              onPress={() => { setShowForm(false); setEditingId(null) }}
              style={{ flex: 1, height: 44, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!isValid}
              style={{
                flex: 1,
                height: 44,
                borderRadius: radii.lg,
                backgroundColor: isValid ? colors.primary : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isValid ? 1 : 0.5,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: isValid ? colors.white : colors.textMuted }}>
                {t('location.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  )
}
