'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { duration, easing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import type {
  OrderStatusTimelineProps,
  TimelineStep,
  ShipmentTimeline,
} from '@chinooz/types'

function formatTimestamp(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface TimelineNodeProps {
  step: TimelineStep
  index: number
  totalSteps: number
  isLast: boolean
  reduced: boolean
}

function TimelineNode({ step, index, totalSteps, isLast, reduced }: TimelineNodeProps) {
  const isCompleted = step.status === 'completed'
  const isCurrent = step.status === 'current'
  const isCancelled = step.key === 'cancelled' || step.key === 'returned'

  const getNodeBg = () => {
    if (isCancelled) return 'bg-error-light'
    if (isCompleted) return 'bg-primary'
    if (isCurrent) return 'bg-primary'
    return 'bg-surface'
  }

  const getNodeBorder = () => {
    if (isCancelled) return 'border-error'
    if (isCompleted || isCurrent) return 'border-primary'
    return 'border-border'
  }

  const getLineBg = () => {
    if (isCancelled) return 'bg-error'
    if (isCompleted || isCurrent) return 'bg-primary'
    return 'bg-border'
  }

  const getLabelClasses = () => {
    if (isCancelled) return 'text-error'
    if (isCompleted || isCurrent) return 'text-text font-semibold'
    return 'text-text-muted font-normal'
  }

  const getLabelSize = () => {
    if (isCompleted || isCurrent) return 'text-base'
    return 'text-sm'
  }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: reduced ? 0 : duration.normal / 1000,
        delay: reduced ? 0 : index * 0.08,
        ease: easing.easeOut as any,
      }}
      className="flex gap-3"
    >
      {/* Node + connecting line column */}
      <div className="flex flex-col items-center" style={{ width: 24 }}>
        {/* Node circle */}
        <motion.div
          animate={
            isCurrent && !reduced
              ? { scale: [1, 1.1, 1] }
              : { scale: 1 }
          }
          transition={
            isCurrent && !reduced
              ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
              : {}
          }
          className={`
            w-6 h-6 rounded-full flex items-center justify-center
            border-2 ${getNodeBg()} ${getNodeBorder()}
          `}
          role="text"
          aria-label={`${step.label}, ${step.status}${step.timestamp ? `, ${formatTimestamp(step.timestamp)}` : ''}`}
        >
          {(isCompleted || isCurrent) && !isCancelled && (
            <span className="text-xs text-white">✓</span>
          )}
          {isCancelled && (
            <span className="text-xs text-error">
              {step.key === 'returned' ? '↩' : '✕'}
            </span>
          )}
        </motion.div>

        {/* Connecting line */}
        {!isLast && (
          <motion.div
            initial={reduced ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{
              duration: reduced ? 0 : 0.6,
              delay: reduced ? 0 : index * 0.08 + 0.2,
              type: 'spring',
              damping: 20,
              stiffness: 150,
            }}
            style={{ transformOrigin: 'top', minHeight: 32, marginTop: 4 }}
            className={`w-0.5 flex-1 ${getLineBg()}`}
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-2'}`}>
        <p className={`${getLabelSize()} ${getLabelClasses()} leading-snug`}>
          {step.label}
        </p>
        {step.timestamp && (
          <p className="text-xs text-text-muted mt-0.5">
            {formatTimestamp(step.timestamp)}
          </p>
        )}
        {step.note && (
          <p className="text-xs text-text-tertiary mt-0.5">{step.note}</p>
        )}
      </div>
    </motion.div>
  )
}

function TrackingChip({
  trackingNumber,
  onCopy,
}: {
  trackingNumber: string
  onCopy?: (tn: string) => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(trackingNumber)
    } catch {
      // fallback
    }
    setCopied(true)
    onCopy?.(trackingNumber)
    setTimeout(() => setCopied(false), 2000)
  }, [trackingNumber, onCopy])

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 bg-background rounded-md border border-border px-3 py-2 hover:bg-border-light transition-colors cursor-pointer"
      aria-label={`Tracking number: ${trackingNumber}. Click to copy.`}
    >
      <span className="text-xs font-medium text-text-secondary tabular-nums" style={{ fontFamily: 'monospace' }}>
        {trackingNumber}
      </span>
      <span className={`text-xs font-semibold ${copied ? 'text-success' : 'text-primary'}`}>
        {copied ? '✓ Copied!' : 'Copy'}
      </span>
    </button>
  )
}

function CodBadge() {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-[rgba(245,158,11,0.1)] text-[#F59E0B]">
      Cash on delivery
    </span>
  )
}

function ShipmentCard({
  shipment,
  reduced,
}: {
  shipment: ShipmentTimeline
  reduced: boolean
}) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : duration.normal / 1000,
        ease: easing.easeOut as any,
      }}
      className="bg-surface rounded-xl border border-border-light p-4 space-y-3"
    >
      {/* Seller header */}
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-text">{shipment.sellerName}</h4>
        {shipment.estimatedDelivery && (
          <span className="text-xs font-medium text-primary">
            {t('orders.estimatedDelivery')}:{' '}
            {new Date(shipment.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* COD badge */}
      {shipment.isCod && <CodBadge />}

      {/* Tracking chip */}
      {shipment.trackingNumber && (
        <TrackingChip trackingNumber={shipment.trackingNumber} />
      )}

      {/* Timeline steps */}
      <div className="space-y-0">
        {shipment.steps.map((step, index) => (
          <TimelineNode
            key={step.key}
            step={step}
            index={index}
            totalSteps={shipment.steps.length}
            isLast={index === shipment.steps.length - 1}
            reduced={reduced}
          />
        ))}
      </div>

      {/* Map placeholder */}
      <div className="h-[120px] bg-shimmer rounded-xl overflow-hidden flex flex-col items-center justify-center">
        <span className="text-2xl">📍</span>
        <span className="text-xs text-text-muted mt-1">Live tracking coming soon</span>
      </div>
    </motion.div>
  )
}

export default function OrderStatusTimeline({
  steps,
  shipments,
  isCod,
  trackingNumber,
  onCopyTracking,
  className = '',
  testID,
}: OrderStatusTimelineProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const completedCount = steps.filter(s => s.status === 'completed').length
  const currentStep = steps.find(s => s.status === 'current')
  const currentStatusLabel = currentStep?.label || steps[steps.length - 1]?.label || ''

  const multiSeller = shipments && shipments.length > 1

  return (
    <div
      data-testid={testID}
      className={`space-y-4 ${className}`}
      aria-label={t('orders.orderStatus', {
        status: currentStatusLabel,
        current: completedCount + (currentStep ? 1 : 0),
        total: steps.length,
      })}
    >
      {/* Main timeline (single-seller or overview) */}
      {!multiSeller ? (
        <div className="space-y-0">
          {steps.map((step, index) => (
            <TimelineNode
              key={step.key}
              step={step}
              index={index}
              totalSteps={steps.length}
              isLast={index === steps.length - 1}
              reduced={reduced}
            />
          ))}

          {/* COD badge */}
          {isCod && (
            <div className="mt-3">
              <CodBadge />
            </div>
          )}

          {/* Tracking chip */}
          {trackingNumber && (
            <div className="mt-3">
              <TrackingChip trackingNumber={trackingNumber} onCopy={onCopyTracking} />
            </div>
          )}

          {/* Map placeholder */}
          {(currentStep?.key === 'shipped' || currentStep?.key === 'out_for_delivery') && (
            <div className="h-[120px] bg-shimmer rounded-xl overflow-hidden mt-3 flex flex-col items-center justify-center">
              <span className="text-2xl">📍</span>
              <span className="text-xs text-text-muted mt-1">Live tracking coming soon</span>
            </div>
          )}
        </div>
      ) : (
        /* Multi-seller: each shipment in its own card */
        <div className="space-y-3">
          {shipments!.map((shipment) => (
            <ShipmentCard
              key={shipment.sellerName}
              shipment={shipment}
              reduced={reduced}
            />
          ))}
        </div>
      )}
    </div>
  )
}
