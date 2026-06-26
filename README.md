# Chinooz Monorepo

Nepal's online marketplace — buyer app, front-end only.

## Structure

```
apps/
  buyer-mobile/    Expo + Expo Router + NativeWind
  buyer-web/       Next.js (App Router) + Tailwind CSS
packages/
  theme/           Design tokens
  ui/              React Native component library
  ui-web/          Web component library
  hooks/           Shared React hooks
  i18n/            EN + नेपाली
  mock-data/       Typed fixtures
  state/           Zustand stores
  validation/      Zod schemas
  utils/           Helpers (NPR format, etc.)
  analytics/       Stub
  types/           Shared TS types
  config/          ESLint, TSConfig, Tailwind presets
```

## Commands

```bash
pnpm install              # install all deps
pnpm dev                  # run all apps in dev mode
pnpm build                # build all apps
pnpm lint                 # lint all packages
pnpm typecheck            # type-check all packages

# per-app
pnpm --filter buyer-web dev
pnpm --filter buyer-mobile dev
```
