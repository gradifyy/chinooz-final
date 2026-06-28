'use client'

import React from 'react'
import { Store } from 'lucide-react'

interface Props {
  storeName: string
  categoryName: string
  logoUrl: string
  bannerUrl: string
  noLogoLabel: string
  noBannerLabel: string
  noNameLabel: string
  noCategoryLabel: string
  previewTitle: string
}

export default function StorefrontPreview({
  storeName,
  categoryName,
  logoUrl,
  bannerUrl,
  noLogoLabel,
  noBannerLabel,
  noNameLabel,
  noCategoryLabel,
  previewTitle,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-text-muted">{previewTitle}</span>
      <div className="bg-surface rounded-xl border border-border-light overflow-hidden">
        {bannerUrl ? (
          <img src={bannerUrl} alt="Store banner" className="w-full h-[100px] object-cover bg-border-light" />
        ) : (
          <div className="w-full h-[100px] bg-border-light flex items-center justify-center">
            <span className="text-xs font-medium text-text-tertiary">{noBannerLabel}</span>
          </div>
        )}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-3 -mt-6">
            <div className="rounded-lg overflow-hidden border-[3px] border-surface">
              {logoUrl ? (
                <img src={logoUrl} alt="Store logo" className="w-12 h-12 object-cover bg-border-light rounded-lg" />
              ) : (
                <div className="w-12 h-12 bg-border-light rounded-lg flex items-center justify-center">
                  <Store size={20} className="text-text-tertiary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-text truncate">{storeName || noNameLabel}</p>
              <p className="text-xs font-medium text-text-muted truncate">{categoryName || noCategoryLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
