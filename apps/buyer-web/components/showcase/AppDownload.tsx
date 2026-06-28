'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'

export function AppDownload() {
  const { t } = useTranslation()
  const [showQR, setShowQR] = useState(false)

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('download.headline')}</h2>
          <p className="text-lg text-gray-600">{t('download.subheadline')}</p>
        </motion.div>

        {/* Download Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* App Store Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl hover:shadow-lg transition-shadow"
          >
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Apple App Store</h3>
              <p className="text-sm text-gray-600 mb-4">{t('download.comingSoon')}</p>
            </div>
            <motion.a
              href="#"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Download on App Store"
            >
              <svg className="w-40 h-auto" viewBox="0 0 135 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="135" height="40" rx="6" fill="black" />
                <path
                  d="M30 10V30M24 12L30 20L24 28M36 12L30 20L36 28"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text x="50" y="27" fill="white" fontSize="12" fontFamily="system-ui" fontWeight="600">
                  App Store
                </text>
              </svg>
            </motion.a>
          </motion.div>

          {/* Google Play Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl hover:shadow-lg transition-shadow"
          >
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Play</h3>
              <p className="text-sm text-gray-600 mb-4">{t('download.comingSoon')}</p>
            </div>
            <motion.a
              href="#"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Get it on Google Play"
            >
              <svg className="w-40 h-auto" viewBox="0 0 135 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="135" height="rx" fill="black" />
                <path
                  d="M24 12L30 18L24 24M30 18L36 12M30 18L36 24"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text x="50" y="27" fill="white" fontSize="12" fontFamily="system-ui" fontWeight="600">
                  Google Play
                </text>
              </svg>
            </motion.a>
          </motion.div>
        </div>

        {/* QR Code Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <button
            onClick={() => setShowQR(!showQR)}
            className="inline-flex items-center gap-2 px-6 py-3 text-gray-700 hover:text-magenta-600 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-magenta-500 focus:ring-offset-2 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {showQR ? t('download.hideQR') : t('download.showQR')}
          </button>

          {/* QR Code Display */}
          {showQR && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-8 flex justify-center"
            >
              <div className="p-6 bg-gray-50 rounded-2xl">
                <div className="w-48 h-48 bg-white border-4 border-gray-300 rounded-lg flex items-center justify-center">
                  {/* Placeholder QR Code - in production, use a QR code library */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600 font-medium">QR Code</p>
                    <p className="text-xs text-gray-500 mt-2">{t('download.qrPlaceholder')}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4 text-center">{t('download.qrInstructions')}</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Desktop Floating CTA (visible on desktop, sticky on scroll) */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-12 p-6 bg-gradient-to-r from-magenta-50 to-pink-50 border border-magenta-200 rounded-2xl text-center"
        >
          <p className="text-gray-700 mb-4">{t('download.waitlistCTA')}</p>
          <motion.a
            href="#waitlist"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block px-8 py-3 bg-magenta-600 hover:bg-magenta-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-magenta-500 focus:ring-offset-2"
          >
            {t('download.joinWaitlist')}
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
