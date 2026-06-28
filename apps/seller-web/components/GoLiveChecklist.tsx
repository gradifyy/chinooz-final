'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronRight, Package, Tag, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'

interface ChecklistItem {
  key: string
  labelKey: string
  descKey: string
  done: boolean
  route: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
}

interface Props {
  items: ChecklistItem[]
  onItemPress: (route: string) => void
}

export default function GoLiveChecklist({ items, onItemPress }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const doneCount = items.filter(i => i.done).length
  const total = items.length
  const progress = total > 0 ? doneCount / total : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[18px] font-semibold text-text">{t('seller.setup.checklistTitle')}</h3>
        <p className="text-sm text-text-muted">{t('seller.setup.checklistSubtitle')}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 bg-border-light rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress * 100}%` }}
            transition={reduced ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs font-medium text-text-muted" aria-label={t('seller.setup.checklistProgress', { done: doneCount, total })}>
          {t('seller.setup.checklistProgress', { done: doneCount, total })}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => onItemPress(item.route)}
              role="checkbox"
              aria-checked={item.done}
              aria-label={t(item.labelKey)}
              className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors text-left ${item.done ? 'border-primary-50 bg-primary-50' : 'border-border-light bg-surface'}`}
            >
              <motion.div
                initial={false}
                animate={{ scale: item.done && !reduced ? [1, 1.2, 1] : 1 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center ${item.done ? 'bg-primary border-primary' : 'border-border'}`}
              >
                {item.done && <Check size={14} className="text-white" strokeWidth={3} />}
              </motion.div>
              <div className="w-8 h-8 rounded-full bg-border-light flex items-center justify-center">
                <Icon size={18} className={item.done ? 'text-primary' : 'text-text-muted'} />
              </div>
              <div className="flex-1">
                <span className={`text-base font-normal ${item.done ? 'text-primary font-semibold' : 'text-text'}`}>{t(item.labelKey)}</span>
                <p className="text-[13px] text-text-muted">{t(item.descKey)}</p>
              </div>
              <ChevronRight size={18} className="text-text-tertiary" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
