'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Pencil, Trash2, X } from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { analytics } from '@chinooz/analytics'
import {
  SELLER_SHIPPING_DEFAULTS,
  SELLER_CARRIERS,
  type ShippingZone,
  type ShippingRule,
  type ShippingSettings,
} from '@chinooz/mock-data'

type Errors = {
  freeThreshold?: string
  handlingDays?: string
  returnWindow?: string
  zones?: Record<string, { fee?: string; days?: string }>
}

function cloneDefaults(): ShippingSettings {
  return JSON.parse(JSON.stringify(SELLER_SHIPPING_DEFAULTS))
}

export default function ShippingSettings() {
  const { t } = useTranslation()
  const router = useRouter()

  const [settings, setSettings] = useState<ShippingSettings>(cloneDefaults)
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null)
  const [removingZone, setRemovingZone] = useState<ShippingZone | null>(null)
  const [dirtyDialog, setDirtyDialog] = useState<null | (() => void)>(null)

  const initialRef = useRef<ShippingSettings>(settings)

  useEffect(() => {
    analytics.screen({ name: 'seller-settings-shipping' })
  }, [])

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialRef.current), [settings])

  const validate = useCallback((): Errors => {
    const errs: Errors = {}
    if (settings.freeShippingThresholdNpr < 0) errs.freeThreshold = t('seller.settings.shipping.freeThresholdError')
    if (settings.handlingDays < 0) errs.handlingDays = t('seller.settings.shipping.handlingDaysError')
    if (settings.returnWindowDays < 0) errs.returnWindow = t('seller.settings.shipping.returnWindowError')
    const zoneErrs: Record<string, { fee?: string; days?: string }> = {}
    for (const z of settings.zones) {
      const ze: { fee?: string; days?: string } = {}
      if (z.feeNpr < 0) ze.fee = t('seller.settings.shipping.zoneFeeError')
      if (z.estimatedDays < 0) ze.days = t('seller.settings.shipping.zoneDaysError')
      if (ze.fee || ze.days) zoneErrs[z.id] = ze
    }
    if (Object.keys(zoneErrs).length > 0) errs.zones = zoneErrs
    return errs
  }, [settings, t])

  const handleSave = useCallback(() => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    setTimeout(() => {
      initialRef.current = settings
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 600)
  }, [settings, validate])

  const guardedNav = useCallback(
    (fn: () => void) => {
      if (dirty) setDirtyDialog(() => fn)
      else fn()
    },
    [dirty],
  )

  const updateZone = (id: string, patch: Partial<ShippingZone>) => {
    setSettings(prev => ({ ...prev, zones: prev.zones.map(z => z.id === id ? { ...z, ...patch } : z) }))
    setSaved(false)
  }

  const addZone = () => {
    const id = `zone-${Date.now()}`
    const newZone: ShippingZone = { id, name: '', areas: '', feeNpr: 0, estimatedDays: 1, codAvailable: false, carriers: [] }
    setSettings(prev => ({ ...prev, zones: [...prev.zones, newZone] }))
    setEditingZone(newZone)
    setSaved(false)
  }

  const removeZone = (id: string) => {
    setSettings(prev => ({ ...prev, zones: prev.zones.filter(z => z.id !== id) }))
    setRemovingZone(null)
    setSaved(false)
  }

  return (
    <Screen>
      <Container>
        <div className="py-6 md:py-8">
          <div className="xl:mx-auto xl:max-w-4xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link
                href="/settings"
                onClick={(e) => { e.preventDefault(); guardedNav(() => router.push('/settings')) }}
                className="inline-flex min-touch items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-text-muted hover:bg-background hover:text-text transition-colors"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span>{t('seller.settings.shipping.backToSettings')}</span>
              </Link>
              <h1 className="text-lg font-semibold text-text md:text-xl">{t('seller.settings.shipping.editTitle')}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${dirty ? 'text-warning' : 'text-text-tertiary'}`}>
                {dirty && <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />}
                {dirty ? t('seller.settings.shipping.dirtyIndicator') : ''}
              </span>
            </div>

            <div className="space-y-6">
              {/* Delivery zones table */}
              <Section title={t('seller.settings.shipping.sectionZones')} action={
                <button type="button" onClick={addZone} className="inline-flex min-touch items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
                  <Plus size={16} aria-hidden="true" />
                  {t('seller.settings.shipping.addZone')}
                </button>
              }>
                {settings.zones.length === 0 ? (
                  <p className="py-6 text-center text-sm text-text-muted">{t('seller.settings.shipping.noZones')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                          <th scope="col" className="py-2 pr-3 font-semibold">{t('seller.settings.shipping.colZone')}</th>
                          <th scope="col" className="py-2 px-3 font-semibold">{t('seller.settings.shipping.colFee')}</th>
                          <th scope="col" className="py-2 px-3 font-semibold">{t('seller.settings.shipping.colDays')}</th>
                          <th scope="col" className="py-2 px-3 font-semibold">{t('seller.settings.shipping.colCod')}</th>
                          <th scope="col" className="py-2 px-3 font-semibold">{t('seller.settings.shipping.colCarriers')}</th>
                          <th scope="col" className="py-2 pl-3 font-semibold">{t('seller.settings.shipping.colActions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settings.zones.map(zone => {
                          const ze = errors.zones?.[zone.id]
                          return (
                            <tr key={zone.id} className="border-b border-border-light last:border-0" aria-label={t('seller.settings.shipping.zoneAria', { name: zone.name, fee: zone.feeNpr, days: zone.estimatedDays, cod: zone.codAvailable ? t('common.yes') : t('common.no') })}>
                              <td className="py-3 pr-3">
                                <div className="font-semibold text-text">{zone.name || '—'}</div>
                                <div className="text-xs text-text-muted">{zone.areas}</div>
                              </td>
                              <td className="py-3 px-3">
                                <input
                                  type="number"
                                  min={0}
                                  value={zone.feeNpr}
                                  onChange={(e) => updateZone(zone.id, { feeNpr: parseInt(e.target.value) || 0 })}
                                  aria-label={`${t('seller.settings.shipping.zoneFee')} — ${zone.name}`}
                                  aria-invalid={!!ze?.fee}
                                  className={`w-20 rounded-md border bg-surface px-2 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${ze?.fee ? 'border-error' : 'border-border'}`}
                                />
                                {ze?.fee && <p className="mt-0.5 text-xs text-error" role="alert">{ze.fee}</p>}
                              </td>
                              <td className="py-3 px-3">
                                <input
                                  type="number"
                                  min={0}
                                  value={zone.estimatedDays}
                                  onChange={(e) => updateZone(zone.id, { estimatedDays: parseInt(e.target.value) || 0 })}
                                  aria-label={`${t('seller.settings.shipping.zoneDays')} — ${zone.name}`}
                                  aria-invalid={!!ze?.days}
                                  className={`w-16 rounded-md border bg-surface px-2 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${ze?.days ? 'border-error' : 'border-border'}`}
                                />
                                {ze?.days && <p className="mt-0.5 text-xs text-error" role="alert">{ze.days}</p>}
                              </td>
                              <td className="py-3 px-3">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={zone.codAvailable}
                                  aria-label={`${t('seller.settings.shipping.zoneCod')} — ${zone.name}`}
                                  onClick={() => updateZone(zone.id, { codAvailable: !zone.codAvailable })}
                                  className={`relative h-6 w-11 rounded-full transition-colors ${zone.codAvailable ? 'bg-success' : 'bg-border'}`}
                                >
                                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${zone.codAvailable ? 'left-[22px]' : 'left-0.5'}`} />
                                </button>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {zone.carriers.map(cid => {
                                    const carrier = SELLER_CARRIERS.find(c => c.id === cid)
                                    return carrier ? (
                                      <span key={cid} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">{t(carrier.labelKey)}</span>
                                    ) : null
                                  })}
                                  {zone.carriers.length === 0 && <span className="text-xs text-text-tertiary">—</span>}
                                </div>
                              </td>
                              <td className="py-3 pl-3">
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => setEditingZone(zone)} aria-label={`${t('seller.settings.shipping.editZone')} — ${zone.name}`} className="rounded-md p-1.5 text-text-muted hover:bg-background hover:text-text transition-colors">
                                    <Pencil size={16} />
                                  </button>
                                  <button type="button" onClick={() => setRemovingZone(zone)} aria-label={`${t('seller.settings.shipping.zoneRemove')} — ${zone.name}`} className="rounded-md p-1.5 text-text-muted hover:bg-error-light hover:text-error transition-colors">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {/* Shipping rules */}
              <Section title={t('seller.settings.shipping.sectionRules')}>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-text">{t('seller.settings.shipping.ruleLabel')}</label>
                  <div className="flex gap-3">
                    {(['flat', 'weight'] as ShippingRule[]).map(rule => {
                      const active = settings.rule === rule
                      return (
                        <button
                          key={rule}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={rule === 'flat' ? t('seller.settings.shipping.ruleFlat') : t('seller.settings.shipping.ruleWeight')}
                          onClick={() => { setSettings(prev => ({ ...prev, rule })); setSaved(false) }}
                          className={`flex-1 rounded-md border px-4 py-3 text-left transition-colors ${active ? 'border-primary bg-primary-50' : 'border-border bg-surface hover:bg-background'}`}
                        >
                          <span className={`block text-sm font-semibold ${active ? 'text-primary' : 'text-text'}`}>
                            {rule === 'flat' ? t('seller.settings.shipping.ruleFlat') : t('seller.settings.shipping.ruleWeight')}
                          </span>
                          <span className="mt-0.5 block text-xs text-text-muted">
                            {rule === 'flat' ? t('seller.settings.shipping.ruleFlatHint') : t('seller.settings.shipping.ruleWeightHint')}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t('seller.settings.shipping.freeThreshold')} hint={t('seller.settings.shipping.freeThresholdHint')} error={errors.freeThreshold}>
                    <input type="number" min={0} value={settings.freeShippingThresholdNpr} onChange={(e) => { setSettings(prev => ({ ...prev, freeShippingThresholdNpr: parseInt(e.target.value) || 0 })); setSaved(false) }} aria-label={t('seller.settings.shipping.freeThreshold')} aria-invalid={!!errors.freeThreshold} className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.freeThreshold ? 'border-error' : 'border-border'}`} />
                  </Field>
                  <Field label={t('seller.settings.shipping.handlingDays')} hint={t('seller.settings.shipping.handlingDaysHint')} error={errors.handlingDays}>
                    <input type="number" min={0} value={settings.handlingDays} onChange={(e) => { setSettings(prev => ({ ...prev, handlingDays: parseInt(e.target.value) || 0 })); setSaved(false) }} aria-label={t('seller.settings.shipping.handlingDays')} aria-invalid={!!errors.handlingDays} className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.handlingDays ? 'border-error' : 'border-border'}`} />
                  </Field>
                  <Field label={t('seller.settings.shipping.returnWindow')} hint={t('seller.settings.shipping.returnWindowHint')} error={errors.returnWindow}>
                    <input type="number" min={0} value={settings.returnWindowDays} onChange={(e) => { setSettings(prev => ({ ...prev, returnWindowDays: parseInt(e.target.value) || 0 })); setSaved(false) }} aria-label={t('seller.settings.shipping.returnWindow')} aria-invalid={!!errors.returnWindow} className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.returnWindow ? 'border-error' : 'border-border'}`} />
                  </Field>
                </div>
              </Section>

              {/* Return policy */}
              <Section title={t('seller.settings.shipping.sectionReturns')}>
                <Field label={t('seller.settings.shipping.returnPolicy')} hint={t('seller.settings.shipping.returnPolicyHint')}>
                  <textarea
                    value={settings.returnPolicyText}
                    onChange={(e) => { setSettings(prev => ({ ...prev, returnPolicyText: e.target.value })); setSaved(false) }}
                    aria-label={t('seller.settings.shipping.returnPolicy')}
                    rows={5}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-y"
                    placeholder={t('seller.settings.shipping.returnPolicyPlaceholder')}
                  />
                </Field>
              </Section>
            </div>
          </div>
        </div>
      </Container>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border-light bg-surface/95 backdrop-blur">
        <Container>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-2">
              {saved ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                  {t('seller.settings.shipping.saved')}
                </span>
              ) : dirty ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-warning">
                  <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
                  {t('seller.settings.shipping.dirtyIndicator')}
                </span>
              ) : (
                <span className="text-sm text-text-tertiary">{t('seller.settings.shipping.editSubtitle')}</span>
              )}
              {Object.keys(errors).length > 0 && <span className="text-sm font-semibold text-error" role="alert">{t('seller.settings.shipping.validationError')}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setSettings(initialRef.current); setErrors({}); setSaved(false) }} disabled={!dirty || saving} aria-label={t('seller.settings.shipping.discard')} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-background transition-colors disabled:opacity-40">
                {t('seller.settings.shipping.discard')}
              </button>
              <button type="button" onClick={handleSave} disabled={!dirty || saving} aria-label={t('seller.settings.shipping.save')} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-40">
                {saving ? t('seller.settings.shipping.saving') : t('seller.settings.shipping.save')}
              </button>
            </div>
          </div>
        </Container>
      </div>

      {/* Zone edit dialog */}
      {editingZone && (
        <ZoneDialog
          zone={editingZone}
          t={t}
          onApply={(updated) => { updateZone(updated.id, updated); setEditingZone(null) }}
          onCancel={() => setEditingZone(null)}
        />
      )}

      {/* Remove confirm */}
      {removingZone && (
        <ConfirmDialog
          title={t('seller.settings.shipping.zoneRemoveConfirm')}
          body={t('seller.settings.shipping.zoneRemoveConfirmBody')}
          confirmLabel={t('seller.settings.shipping.zoneRemove')}
          cancelLabel={t('seller.settings.shipping.cancel')}
          onConfirm={() => removeZone(removingZone.id)}
          onCancel={() => setRemovingZone(null)}
        />
      )}

      {/* Dirty guard */}
      {dirtyDialog && (
        <ConfirmDialog
          title={t('seller.settings.storefront.dirtyDialogTitle')}
          body={t('seller.settings.storefront.dirtyDialogBody')}
          confirmLabel={t('seller.settings.storefront.dirtyDialogSave')}
          cancelLabel={t('seller.settings.storefront.dirtyDialogDiscard')}
          onConfirm={() => { const fn = dirtyDialog; setDirtyDialog(null); handleSave(); fn?.() }}
          onCancel={() => { const fn = dirtyDialog; setDirtyDialog(null); fn?.() }}
        />
      )}
    </Screen>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border-light bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-text">{title}</h2>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-text">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-error" role="alert">{error}</p> : hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
    </div>
  )
}

function ZoneDialog({ zone, t, onApply, onCancel }: { zone: ShippingZone; t: (k: string, o?: Record<string, unknown>) => string; onApply: (z: ShippingZone) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<ShippingZone>(zone)
  const update = <K extends keyof ShippingZone>(key: K, value: ShippingZone[K]) => setDraft(prev => ({ ...prev, [key]: value }))

  const toggleCarrier = (cid: string) => {
    setDraft(prev => ({ ...prev, carriers: prev.carriers.includes(cid) ? prev.carriers.filter(c => c !== cid) : [...prev.carriers, cid] }))
  }

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={t('seller.settings.shipping.zoneDialogTitle')}>
      <button className="absolute inset-0 bg-overlay" onClick={onCancel} aria-label={t('seller.settings.shipping.cancel')} />
      <div className="relative mx-4 max-w-md rounded-lg bg-surface p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">{t('seller.settings.shipping.zoneDialogTitle')}</h2>
          <button type="button" onClick={onCancel} aria-label={t('seller.settings.shipping.cancel')} className="rounded-md p-1 text-text-muted hover:bg-background"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <Field label={t('seller.settings.shipping.zoneName')}>
            <input type="text" value={draft.name} onChange={(e) => update('name', e.target.value)} aria-label={t('seller.settings.shipping.zoneName')} className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors" placeholder={t('seller.settings.shipping.zoneNamePlaceholder')} />
          </Field>
          <Field label={t('seller.settings.shipping.zoneAreas')}>
            <input type="text" value={draft.areas} onChange={(e) => update('areas', e.target.value)} aria-label={t('seller.settings.shipping.zoneAreas')} className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors" placeholder={t('seller.settings.shipping.zoneAreasPlaceholder')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('seller.settings.shipping.zoneFee')} hint={t('seller.settings.shipping.zoneFeeHint')}>
              <input type="number" min={0} value={draft.feeNpr} onChange={(e) => update('feeNpr', parseInt(e.target.value) || 0)} aria-label={t('seller.settings.shipping.zoneFee')} className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors" />
            </Field>
            <Field label={t('seller.settings.shipping.zoneDays')} hint={t('seller.settings.shipping.zoneDaysHint')}>
              <input type="number" min={0} value={draft.estimatedDays} onChange={(e) => update('estimatedDays', parseInt(e.target.value) || 0)} aria-label={t('seller.settings.shipping.zoneDays')} className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors" />
            </Field>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-text">{t('seller.settings.shipping.zoneCod')}</span>
              <button type="button" role="switch" aria-checked={draft.codAvailable} aria-label={t('seller.settings.shipping.zoneCod')} onClick={() => update('codAvailable', !draft.codAvailable)} className={`relative h-6 w-11 rounded-full transition-colors ${draft.codAvailable ? 'bg-success' : 'bg-border'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${draft.codAvailable ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <p className="text-xs text-text-muted">{t('seller.settings.shipping.zoneCodHint')}</p>
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold text-text">{t('seller.settings.shipping.zoneCarriers')}</span>
            <div className="flex flex-wrap gap-2">
              {SELLER_CARRIERS.map(c => {
                const active = draft.carriers.includes(c.id)
                return (
                  <button key={c.id} type="button" onClick={() => toggleCarrier(c.id)} aria-pressed={active} aria-label={t(c.labelKey)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${active ? 'bg-primary text-white' : 'border border-border bg-surface text-text hover:bg-background'}`}>
                    {t(c.labelKey)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-background transition-colors">{t('seller.settings.shipping.cancel')}</button>
          <button type="button" onClick={() => onApply(draft)} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-dark transition-colors">{t('seller.settings.shipping.apply')}</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: { title: string; body: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-overlay" onClick={onCancel} aria-label={cancelLabel} />
      <div className="relative mx-4 max-w-sm rounded-lg bg-surface p-5 shadow-xl">
        <h2 className="mb-2 text-base font-semibold text-text">{title}</h2>
        <p className="mb-4 text-sm text-text-secondary">{body}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text hover:bg-background transition-colors">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
