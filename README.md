# Chinooz Monorepo

Nepal's premier online marketplace — multi-app platform with shared design system and i18n.

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

## Getting Started

```bash
pnpm install              # install all deps
cp .env.example .env      # create env file
pnpm dev                  # run all apps in dev mode
```

## Commands

```bash
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

## Environment

See `.env.example` for required environment variables.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch model, commit convention, and PR checklist.
