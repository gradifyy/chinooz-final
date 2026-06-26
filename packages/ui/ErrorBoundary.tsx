import React, { Component, type ReactNode } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { colors, spacing, radii } from '@chinooz/theme'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, info: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info)
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing[6],
            backgroundColor: colors.background,
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: spacing[3] }}>😕</Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              textAlign: 'center',
              marginBottom: spacing[2],
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textMuted,
              textAlign: 'center',
              marginBottom: spacing[4],
            }}
          >
            We're sorry for the inconvenience. Please try again.
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: spacing[5],
              paddingVertical: spacing[3],
              borderRadius: radii.lg,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: '600' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return this.props.children
  }
}
