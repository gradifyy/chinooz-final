'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@chinooz/ui-web'

export default function WebLoader() {
  const reduced = useReducedMotion()

  return (
    <div className="fixed inset-0 bg-primary flex flex-col items-center justify-center z-[9999]">
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: 'spring', damping: 18, stiffness: 120, mass: 1, delay: 0.1 }
        }
        className="flex flex-col items-center gap-5"
      >
        <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center overflow-hidden relative">
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 0.12 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="absolute inset-0 bg-white/15 rounded-full"
          />
          <img
            src="/chinooz-logo.png"
            alt="Chinooz"
            className="w-[70%] h-[70%] object-contain relative z-10"
          />
        </div>
        <motion.h1
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.3 }}
          className="text-3xl font-bold text-white tracking-tight"
        >
          Chinooz
        </motion.h1>
        <motion.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.5 }}
          className="text-sm text-white/70 tracking-widest uppercase"
        >
          Nepal&apos;s Marketplace
        </motion.p>
      </motion.div>
    </div>
  )
}
