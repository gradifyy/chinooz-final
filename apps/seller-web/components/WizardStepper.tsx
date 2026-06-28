'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'

export interface WizardStep {
  key: string
  label: string
}

interface Props {
  steps: WizardStep[]
  current: number
}

export default function WizardStepper({ steps, current }: Props) {
  const reduced = useReducedMotion()

  return (
    <div className="px-4 py-3" role="progressbar">
      <div className="relative h-[3px] bg-border rounded-full mb-3 overflow-hidden">
        <motion.div
          className="absolute h-full bg-primary rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${current === 0 ? 0 : (current / (steps.length - 1)) * 100}%` }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300, mass: 0.8 }}
        />
      </div>
      <div className="flex justify-between">
        {steps.map((step, i) => {
          const isCompleted = i < current
          const isCurrent = i === current
          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCompleted
                    ? 'bg-primary border-primary text-white'
                    : isCurrent
                    ? 'border-primary bg-surface text-primary'
                    : 'border-border bg-surface text-text-tertiary'
                }`}
              >
                {isCompleted ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              <span
                className={`text-xs font-semibold mt-1.5 ${
                  isCurrent ? 'text-primary' : isCompleted ? 'text-text' : 'text-text-tertiary'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
