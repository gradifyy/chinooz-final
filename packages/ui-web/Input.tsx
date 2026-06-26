'use client'

import React, { useState } from 'react'
import type { InputProps } from '@chinooz/types/components'

export default function Input({
  value,
  defaultValue,
  onChangeText,
  placeholder,
  label,
  error,
  hint,
  disabled,
  readOnly,
  secureTextEntry,
  leftIcon,
  rightIcon,
  onFocus,
  onBlur,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  multiline,
  maxLength,
  className = '',
  testID,
}: InputProps) {
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const Tag = multiline ? 'textarea' : 'input'

  return (
    <div data-testid={testID} className={className}>
      {label && (
        <label className="block text-[13px] font-medium text-text mb-[6px]">{label}</label>
      )}
      <div
        className={`
          flex items-center rounded-xl border-[1.5px] bg-background
          transition-colors duration-150
          ${error ? 'border-error' : focused ? 'border-primary' : 'border-border'}
          ${multiline ? 'min-h-[100px]' : 'min-h-[48px]'}
          px-3
        `}
      >
        {leftIcon && <span className="mr-2 flex-shrink-0">{leftIcon}</span>}
        <Tag
          value={value}
          defaultValue={defaultValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            onChangeText?.(e.target.value)
          }
          placeholder={placeholder}
          disabled={disabled || readOnly}
          readOnly={readOnly}
          type={secureTextEntry && !showPassword ? 'password' : 'text'}
          inputMode={keyboardType === 'email' ? 'email' : keyboardType === 'phone' ? 'tel' : keyboardType === 'number' ? 'numeric' : undefined}
          onFocus={() => { setFocused(true); onFocus?.() }}
          onBlur={() => { setFocused(false); onBlur?.() }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter') onSubmitEditing?.()
            if (e.key === 'Enter' && returnKeyType === 'search') onSubmitEditing?.()
          }}
          maxLength={maxLength}
          aria-label={label ?? placeholder}
          className={`
            flex-1 text-[15px] text-text bg-transparent outline-none
            ${multiline ? 'min-h-[80px] py-3' : 'py-3'}
            placeholder:text-text-tertiary
          `}
          style={{ resize: multiline ? 'vertical' : 'none' as any }}
        />
        {secureTextEntry && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-xs text-text-muted p-1 flex-shrink-0"
            tabIndex={-1}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
        {rightIcon}
      </div>
      {error && <p className="text-[12px] text-error mt-1">{error}</p>}
      {hint && !error && <p className="text-[12px] text-text-muted mt-1">{hint}</p>}
    </div>
  )
}
