# AGENTS.md

## Commands

```bash
pnpm install              # install all deps
pnpm dev                  # run all apps in dev mode
pnpm build                # build all apps
pnpm lint                 # lint all packages
pnpm typecheck            # type-check all packages

# landing-web
pnpm --filter landing-web dev
pnpm --filter landing-web build
pnpm --filter landing-web lint
pnpm --filter landing-web type-check
```

## Structure

```
apps/
  landing-web/    Next.js App Router + TS + Tailwind (marketing landing page)
  buyer-web/      Next.js (buyer web app)
  buyer-mobile/   Expo (buyer mobile app)
  seller-web/     Next.js (seller dashboard)
  seller-mobile/  Expo (seller mobile app)
  rider-mobile/   Expo (rider mobile app)
  admin-web/      Next.js (admin dashboard — RBAC, audit, token-scan enforcement)
packages/
  theme/          Design tokens (colors, radii, spacing, motion, typography)
  seller-theme/   Seller palette re-export (metro alias shim for shared ui)
  i18n/           EN + Nepali locale JSON + i18next
  ui/             React Native component library
  ui-web/         Web component library
  ui-core/        Headless config + behavior hooks shared by ui and ui-web
  hooks/          Shared React hooks
  utils/          Helpers (NPR format, a11y, dates, etc.)
  analytics/      Analytics stub
  types/           Shared TS types
  state/          Zustand stores (cart, ui, session, seller, rider)
  api/            HTTP adapter boundary + mock adapters
  mock-data/      Mock services + fixtures (buyer/seller/rider)
  validation/     Zod schemas
  rs3/            Rider geometry + trip simulator
  config/         ESLint, TSConfig, Tailwind presets, token-scan
```

## Conventions

- TypeScript strict mode — no `any`
- Server components by default; `'use client'` only for interactive islands
- Design tokens from `@chinooz/theme` — no hard-coded colors/spacing/radii
- All strings via `packages/i18n/locales/en.json` + `ne.json`
- Conventional commits (feat:, fix:, chore:, refactor:, docs:)
- Bi/bilingual: every user-visible string must have EN + NE translations

## Landing-web architecture

- `app/layout.tsx` — root server layout, reads locale from cookie, sets `<html lang>`
- `app/page.tsx` — server component, passes `locale` prop to all sections
- `lib/i18n/server.ts` — `getLocale()` reads cookie via `next/headers`
- `components/sections/LanguageToggle.tsx` — client island, sets cookie + `router.refresh()`
- `components/motion/Reveal.tsx` — CSS IntersectionObserver scroll reveal (no framer-motion in this component)
- `components/motion/MotionProvider.tsx` — `framer-motion` `MotionConfig reducedMotion="user"` wrapper
- `components/motion/CountUp.tsx` — animated number count-up client component
- `content/landing.ts` — re-exports from `@chinooz/i18n/locales/*.json` under `landing` key
