# Chinooz Monorepo

This is the monorepo for Chinooz, featuring Expo for mobile and Next.js for web.

## Project Structure

| Path | Description |
| :--- | :--- |
| `apps/buyer-mobile` | Expo app (iOS + Android) |
| `apps/buyer-web` | Next.js website |
| `packages/theme` | Shared design tokens |
| `packages/ui` | Shared cross-platform components |
| `packages/ui-web` | Web-specific components |
| `packages/hooks` | Shared React hooks |
| `packages/i18n` | Internationalization (EN / नेपाली) |
| `packages/mock-data` | Shared mock data and API stubs |
| `packages/state` | Shared Zustand stores |
| `packages/validation` | Shared Zod schemas |
| `packages/utils` | Shared utility functions |
| `packages/analytics` | Event-tracking stub |
| `packages/types` | Shared TypeScript types |
| `packages/config` | Shared configuration (ESLint, TSConfig, Tailwind) |

## Tech Stack

| Category | Technology |
| :--- | :--- |
| Monorepo Management | Turborepo + pnpm |
| Mobile | Expo + Expo Router + NativeWind |
| Web | Next.js + Tailwind CSS |
| State Management | Zustand |
| Validation | Zod |
| Styling | Tailwind CSS / NativeWind |
| Language | TypeScript |
