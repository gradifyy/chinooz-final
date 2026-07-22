# Contributing to Chinooz

## Getting Started

```bash
pnpm install
pnpm dev
```

## Branch Model

- `main` — production-ready
- `feat/*` — new features
- `fix/*` — bug fixes
- `chore/*` — maintenance

## Commit Convention

This project uses [conventional commits](https://www.conventionalcommits.org/):

```
feat: add new landing section
fix: correct gold contrast on plum background
chore: update dependencies
refactor: migrate to server components
docs: update README
```

## Pull Request Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] No `any` types introduced
- [ ] No hard-coded colors/spacing (use `@chinooz/theme` tokens)
- [ ] All new strings have EN + NE translations in `packages/i18n/locales/`
- [ ] Conventional commit message
- [ ] No secrets committed

## Code Style

- TypeScript strict mode
- Server components by default; `'use client'` only for interactive islands
- Design tokens from `@chinooz/theme` — no hard-coded values
- framer-motion only for interactive client islands (FAQ accordion, Waitlist form, Navbar menu)
- Scroll reveals use CSS `Reveal` component (IntersectionObserver), not framer-motion
