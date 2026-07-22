#!/usr/bin/env node
/**
 * CI key-symmetry check — verifies that en.json and ne.json have identical
 * leaf-key sets. Fails the build if any key is present in one locale but
 * missing from the other.
 *
 * Run: node scripts/check-i18n-symmetry.js
 * Exit code: 0 = pass, 1 = fail
 */

const fs = require('fs')
const path = require('path')

const localesDir = path.resolve(__dirname, '..', 'packages', 'i18n', 'locales')
const enPath = path.join(localesDir, 'en.json')
const nePath = path.join(localesDir, 'ne.json')

function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full))
    } else {
      keys.push(full)
    }
  }
  return keys
}

function main() {
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
  const ne = JSON.parse(fs.readFileSync(nePath, 'utf8'))

  const enKeys = new Set(flattenKeys(en))
  const neKeys = new Set(flattenKeys(ne))

  const inNeNotEn = [...neKeys].filter(k => !enKeys.has(k)).sort()
  const inEnNotNe = [...enKeys].filter(k => !neKeys.has(k)).sort()

  if (inNeNotEn.length === 0 && inEnNotNe.length === 0) {
    console.log('✓ i18n key symmetry: PASS (en.json and ne.json have identical key sets)')
    process.exit(0)
  }

  console.error('✗ i18n key symmetry: FAIL')
  if (inNeNotEn.length > 0) {
    console.error(`\n  Keys in ne.json but NOT in en.json (${inNeNotEn.length}):`)
    for (const key of inNeNotEn.slice(0, 20)) {
      console.error(`    - ${key}`)
    }
    if (inNeNotEn.length > 20) {
      console.error(`    ... and ${inNeNotEn.length - 20} more`)
    }
  }
  if (inEnNotNe.length > 0) {
    console.error(`\n  Keys in en.json but NOT in ne.json (${inEnNotNe.length}):`)
    for (const key of inEnNotNe) {
      console.error(`    - ${key}`)
    }
  }
  console.error('\n  Fix: Add the missing keys to the appropriate locale file.')
  process.exit(1)
}

main()
