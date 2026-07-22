# Chinooz Landing Page — Ultimate Frontend Audit (Swarm Report)

**Scope:** `apps/landing-web` + shared packages it reuses (`@chinooz/theme`, `i18n`, `ui-web`, `utils`, `types`, `hooks`, `analytics`, `config`). Frontend only.
**Method:** 12 bounded domain agents (A1–A12) audited in parallel (high effort) → 2 xhigh synthesis agents merged, de-duplicated, cross-checked, and ranked. **164 raw findings → 47 master findings.** Read-only audit; no code was modified.
**Date:** 2026-06-28 · **Branch audited:** `buy`

---

## 1. Executive Summary

**Health score: 32 / 100**

**The 2-second premium verdict:** **No.** Beneath genuinely premium bilingual copy and a handsome plum palette, this is an unfinished draft. Forked tokens render every card at the wrong radius with flat black (not plum-tinted) shadows; Nepali is non-persistent and broken on section headings; all framer-motion animation ignores `prefers-reduced-motion`; anchor nav and favicons are broken; store CTAs do nothing; and the LCP headline is hidden until hydration. It reads as a promising template, not Linear × Stripe × Airbnb × Revolut craft.

The foundation is real — strong next/font setup, a proper fluid clamp ramp, premium EN+NE copy, correct security headers, JSON-LD scaffolding, a typed waitlist boundary — but the craft layer above it is riddled with token forks, dead SEO assets, non-persistent i18n, and motion that fights both performance and accessibility. The single Critical issue (i18n forked from the spec) is the root cause of ~6 downstream Major findings.

### Top 10 issues

| # | ID | Sev | Issue |
|---|---|---|---|
| 1 | M-001 | **Critical** | i18n forked: local `content/landing.ts` + custom `useState` context bypass `packages/i18n` (react-i18next); locale never persisted, NE non-crawlable, hreflang dead, translations diverge from shared en/ne files. |
| 2 | M-003 | Major | Locale in `useState` only (no localStorage/cookie/URL), `html lang=en` hardcoded in SSR, `?lang=ne` never read; NE users get a flash of English on every reload and the hreflang target serves English HTML. |
| 3 | M-004 | Major | `prefers-reduced-motion` not honored for any framer-motion JS animation (8+ infinite loops + all reveals); CSS block covers keyframes only, no `useReducedMotion` anywhere. |
| 4 | M-002 | Major | Radii token source off-spec (sm4/md8/lg12/xl16/2xl20 vs spec 8/12/16/24/32); three competing layers, wrong preset wins, every `rounded-2xl` card renders 20px not 32px. |
| 5 | M-015 | Major | LCP hero `h1` mounts `opacity:0`, visible only after framer-motion hydration + 0.2s delay + 0.8s anim; LCP exceeds 2.0s mid-Android target. |
| 6 | M-014 | Major | All 13 sections are `use client` with framer-motion, statically imported (no `next/dynamic`); entire page JS hydrates upfront, high TBT, Lighthouse mobile <95 likely. |
| 7 | M-012 | Major | Favicons referenced in metadata are missing from `public/` (404 every load); OG metadata points to non-existent `/og-image.png` while next/og generates one; `robots.txt` shadows `robots.ts`; webmanifest uses logo as 192/512 icon. |
| 8 | M-007 | Major | Anchor nav broken: labels mismatched to targets, 3 of 4 links collapse to `#ecosystem`; no `scroll-padding-top` so fixed navbar obscures every section heading. |
| 9 | M-010 | Major | Forked color/shadow/gradient tokens: shadows neutral `rgba(0,0,0)` not plum-tinted, gradients hard-coded, theme package never imported, `globals.css` hand-forks tokens. |
| 10 | M-017 | Major | Hard-coded English strings bypass i18n (Story/Payments/Download labels, all aria-labels, skip link, waitlist messages); NE mode shows mixed-script English. |

---

## 2. Severity Dashboard

| Severity | Count | Meaning |
|---|---|---|
| 🔴 Critical | **1** | Blocks a core spec requirement; root cause of cascading failures. |
| 🟠 Major | **19** | Misses the Quality Bar (Lighthouse <95, CLS/LCP breach, horizontal scroll, missing reduced-motion, broken SEO/favicons, missing i18n persistence, forked tokens). |
| 🟡 Minor | **24** | Real defects that degrade craft/UX but don't breach the hard Quality Bar. |
| ⚪ Polish | **3** | Finish-level refinements. |
| **Total** | **47** | (deduplicated from 164 raw agent findings) |

**Domain contribution (raw → master):** A1 19, A2 11, A3 23, A4 11, A5 7, A6 17, A7 11, A8 15, A9 12, A10 14, A11 10, A12 14.

---

## 3. Coverage Matrix — Section × State × Locale × Viewport

`Y` = covered/verified · `GAP` = missing or unverified · `N/A` = not applicable

| Section | Default | Hover | Scroll-reveal | Loading | Error | MobileMenu | Waitlist-states | EN | NE | ReducedMotion | 360px | 768px | 1024px | 1280px | 1440px |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Navbar | Y | Y | N/A | N/A | N/A | GAP | N/A | Y | Y | GAP | GAP | Y | Y | Y | Y |
| Hero | Y | Y | Y | N/A | N/A | N/A | N/A | Y | Y | GAP | Y | Y | Y | Y | Y |
| TrustStrip | Y | N/A | N/A | N/A | N/A | N/A | N/A | Y | Y | Y | Y | Y | Y | Y | Y |
| Stats | Y | N/A | Y | N/A | N/A | N/A | N/A | Y | GAP | GAP | GAP | Y | Y | Y | Y |
| Story | Y | Y | Y | N/A | N/A | N/A | N/A | Y | GAP | GAP | Y | Y | Y | Y | Y |
| Ecosystem | Y | GAP | Y | N/A | N/A | N/A | N/A | Y | Y | GAP | Y | Y | Y | Y | Y |
| HowItWorks | Y | N/A | Y | N/A | N/A | N/A | N/A | Y | Y | GAP | Y | Y | GAP | GAP | GAP |
| Payments | Y | Y | Y | N/A | N/A | N/A | N/A | Y | GAP | GAP | Y | Y | Y | Y | Y |
| Waitlist | Y | Y | Y | Y | Y | N/A | GAP | Y | GAP | GAP | GAP | Y | Y | Y | Y |
| Download | Y | GAP | Y | N/A | N/A | N/A | N/A | Y | GAP | GAP | Y | Y | Y | Y | Y |
| FAQ | Y | Y | Y | N/A | N/A | N/A | N/A | Y | Y | GAP | Y | Y | Y | Y | Y |
| Footer | Y | GAP | N/A | N/A | N/A | N/A | N/A | Y | Y | N/A | GAP | Y | Y | Y | Y |

**Pattern:** Default/hover/scroll-reveal and EN are broadly covered. The systematic gaps are **ReducedMotion** (10 of 12 sections — only TrustStrip and FAQ have any guard), **NE** (7 sections leak English or break Devanagari), **360px** (5 sections have long-Nepali overflow risk), **MobileMenu** (no dialog a11y), and **Waitlist-states** (no validating/reset paths).

---

## 4. Quality-Bar Scorecard

| Metric | Target | Actual (static estimate) | Status |
|---|---|---|---|
| Lighthouse Perf | ≥95 mobile | ~75–85 (unsplit 13-section framer-motion client bundle ~150–200KB gzip, LCP headline hidden until hydration, 3 infinite 120px-blur scale animations) | 🔴 fail |
| Lighthouse A11y | ≥95 | ~88–92 (skip link not first focusable, mobile menu no focus trap/Escape, hardcoded `html lang`, multiple WCAG AA contrast fails, marquee double-read) | 🟠 at-risk |
| Lighthouse SEO | ≥95 | ~85–90 (dead `?lang=ne` hreflang, incomplete English-only JSON-LD, SearchAction 404, stale copyright; title/description/canonical/robots otherwise correct) | 🟠 at-risk |
| Lighthouse Best-Practices | ≥95 | ~80–88 (`favicon.ico` + `apple-touch-icon` + `favicon-16` 404 every load, `/og-image.png` 404, webmanifest invalid icons, robots duplicate) | 🔴 fail |
| LCP | <2.0s mid-Android | ~2.0–2.8s (hero `h1` LCP element mounts `opacity:0`, gated behind framer-motion hydration + 0.2s delay + 0.8s anim) | 🔴 fail |
| CLS | <0.05 | <0.05 on EN default load (all `next/image` have width/height, FadeUp transform-only); **NE-toggle at risk** (Noto Devanagari `preload:false` → FOUT/reflow + locale FOUC) | 🟠 at-risk |
| No horizontal scroll | none 360→1440 | none detected (no `w-screen`/`100vw`/negative-margin; decorative overflow clipped); **360px NE long-string overflow risk** (nav pill, waitlist count badge, Stats `१०हजार+`) | 🟠 at-risk |
| Reduced-motion | ALWAYS honored, calm static fallback | NOT honored for any framer-motion JS animation (CSS block covers keyframes only; no `useReducedMotion`/`MotionConfig`); 8+ infinite loops + all reveals still animate | 🔴 fail |

**Status legend:** 🔴 fail (breaches Quality Bar) · 🟠 at-risk (conditional/borderline) · 🟢 pass. No metric is a clean pass; 4 of 8 hard-fail.

---

## 5. Full Findings — Grouped by Domain, Sorted by Severity

> Each finding: **ID · Severity · Section · Files · Issue · Evidence · Fix · Effort · Contributors.** Effort: S(<½d) / M(½–2d) / L(>2d).

### 5.1 Internationalization

**M-001 · 🔴 Critical · i18n architecture** · `content/landing.ts:1`, `lib/i18n/context.tsx:1-43`, `package.json:14,24,25`, `packages/i18n/index.ts:1` · Effort **L**
i18n is forked from the spec: a local `content/landing.ts` object plus a hand-rolled `lib/i18n/context.tsx` (`useState`) is used instead of `packages/i18n` (react-i18next). `@chinooz/i18n`, `react-i18next` and `i18next` are declared deps but never imported. Root cause of the non-persistent locale, dead hreflang, English-only SSR/JSON-LD, and translation drift from the shared en/ne locale files used by buyer/seller/rider apps.
*Evidence:* `context.tsx` imports `Locale` from `@/content/landing` (not `@chinooz/i18n`) and uses `useState`; grep for `react-i18next`/`i18next`/`@chinooz/i18n` across the landing app returns zero source imports; `packages/i18n` `initReactI18next` is never called.
*Fix:* Migrate landing strings into `packages/i18n/locales/en.json` + `ne.json` under a `landing.*` namespace; replace `context.tsx` with `initI18n()` + `useTranslation`; delete `content/landing.ts` or keep only as a typed shape reference. *(A3, A7, A9, A12)*

**M-003 · 🟠 Major · Locale persistence / SSR / hreflang** · `lib/i18n/context.tsx:25-32`, `app/layout.tsx:99-102,183,193` · Effort **M**
Locale is not persisted (`useState` only, no localStorage/cookie/URL) and `<html lang="en">` is hardcoded in SSR; the context mutates `document.lang` only post-hydration. `metadata.alternates` declares `ne → ?lang=ne` but the app never reads the query param, so the hreflang target serves identical English HTML. NE users get a flash of English + Devanagari reflow on every reload, and NE content is non-crawlable in initial HTML.
*Fix:* Persist locale to localStorage + cookie; read cookie/`?lang=` server-side and render `<html lang={locale}>` from the server; make `?lang=ne` authoritative or switch to `/[locale]` routing; only emit hreflang for URLs that serve localized content. *(A2, A3, A6, A8, A9)*

**M-017 · 🟠 Major · Hard-coded English copy** · `Story.tsx:82-112`, `Payments.tsx:74-95`, `Download.tsx:127`, `Navbar.tsx:97,118`, `app/page.tsx:27`, `lib/waitlist/submit.ts:20,32` · Effort **M**
Numerous user-facing strings bypass the i18n content object: Story/Payments/Download decorative labels (`COD + Khalti`, `NPR`, `Nepali Rupee`, `Khalti`/`eSewa`/`COD`, `iOS & Android`, `Coming soon`), every `aria-label`, the skip link, and waitlist submit success/error messages. NE users see English inside otherwise-translated sections and hear English from AT.
*Fix:* Move all visible/AT strings into `content/landing.ts` (or `packages/i18n`) under both EN and NE; for `submit.ts` return error codes mapped to localized messages in the component; apply `font-devanagari` on the NE path. *(A3, A9, A11)*

**M-034 · 🟡 Minor · NE overflow at 360px** · `content/landing.ts:188,305,220`, `Navbar.tsx:108`, `Waitlist.tsx:67`, `Stats.tsx:24-33` · Effort **S**
Several Nepali strings are materially longer than English and sit in constrained chrome without overflow handling: `nav.waitlist` (27 vs 13 chars) in a small button, `waitlist.count` (very long) in a single-line `rounded-full` badge, and Stats `१०हजार+` (7 glyphs) at 32px in an ~88px 2-col cell at 360px → wrap/clip and horizontal-scroll risk.
*Fix:* `max-w-full` + `text-balance`/`break-words` on long NE containers; let the count badge wrap (`rounded-full` → `rounded-2xl`); reduce Stats card padding on mobile (`p-6 sm:p-8`); 360px-test the nav waitlist button. *(A5, A9)*

### 5.2 Design Token & Brand Integrity

**M-002 · 🟠 Major · Theme source / radii** · `packages/theme/radii.ts:2-9`, `tailwind-preset.js:79-87`, `tailwind.config.ts:10`, `globals.css:24-28` · Effort **S**
Radii token source (`packages/theme/radii.ts`) is off-spec (sm4/md8/lg12/xl16/2xl20/3xl24 vs spec sm8/md12/lg16/xl24/2xl32). Three competing radius definitions exist (`radii.ts`, `tailwind-preset.js`, `globals.css --radius-*`) and the wrong preset wins for Tailwind utilities, so every `rounded-2xl` card renders at 20px instead of 32px. CSS vars are dead for utilities. Monorepo-wide since the preset is shared.
*Fix:* Update `radii.ts` to spec values; regenerate preset `borderRadius` from `radii.ts` programmatically; wire Tailwind `borderRadius` to the CSS vars or drop the redundant vars so there is a single source. *(A1, A3, A5, A11)*

**M-010 · 🟠 Major · Color/shadow/gradient tokens** · `shadows.ts:15-51`, `tailwind-preset.js:112-117`, `tailwind.config.ts:29-35`, `Hero.tsx:101`, `Ecosystem.tsx:25-27`, `globals.css:6-36` · Effort **M**
Forked color/shadow/gradient tokens: `shadows.ts` defines neutral `rgba(0,0,0)` instead of plum-tinted shadows (every card/button renders flat black elevation); `tailwind.config` `backgroundImage` hard-codes all plum/gold hexes and introduces non-token dark colors; inline arbitrary shadow utilities duplicate plum/gold literals; `packages/theme` is never imported by the landing app (TS token API is dead code); `globals.css` hand-writes a third, mostly-dead token layer.
*Fix:* Re-base shadows on a plum-tinted shadow color; define gradient/aurora tokens in `packages/theme` and reference via CSS vars; import `@chinooz/theme` tokens into components or generate preset+globals from source; add plum/gold glow shadow tokens. *(A1)*

**M-011 · 🟠 Major · Ecosystem / gold discipline** · `Ecosystem.tsx:18-28`, `content/landing.ts:69`, `TrustStrip.tsx:24` · Effort **S**
Gold is used as a full 48×48 icon fill (`bg-gold text-white`) on the Sellers Ecosystem card plus a gold-tinted hover shadow, promoting gold from sparing accent to co-equal hero color and breaking plum-as-hero discipline. White-on-gold measures ~2.2:1, failing WCAG 1.4.11 non-text contrast (3:1) for the informational icon tile.
*Fix:* Make the Sellers card use `primary`/`primary-light` like the others; keep gold restricted to small accents (dots, check icons). If gold must stay, use a dark icon (`text-text` on gold ~6:1) to pass 1.4.11. *(A1, A6)*

### 5.3 Motion & Animation

**M-004 · 🟠 Major · Reduced motion (global)** · `globals.css:94-111`, `FadeUp.tsx:20`, `Hero.tsx:25`, `Story.tsx:74`, `Download.tsx:65`, `Button.tsx:38`, `packages/ui-web/hooks/useReducedMotion.ts:5` · Effort **M**
`prefers-reduced-motion` is not honored for any framer-motion JS animation. The `globals.css` reduced-motion block covers CSS keyframes only; every JS-driven reveal/float/entrance/scale keeps running for reduced-motion users. No `useReducedMotion`/`MotionConfig` is used anywhere, although `packages/ui-web` reduced-aware variants + `useReducedMotion` hook exist unused.
*Fix:* Wrap the app in `<MotionConfig reducedMotion="user">` in `layout.tsx` and/or import `useReducedMotion` in FadeUp/Hero/Story/Download/Button; when reduced, render final state and skip infinite loops. Reuse `packages/ui-web/motion.ts` reduced-aware variants. *(A3, A4, A6, A7, A10)*

**M-032 · 🟡 Minor · Motion tokens / variants** · `packages/theme/motion.ts:8-12`, `globals.css:31-35`, `FadeUp.tsx:22-31,71`, `Hero.tsx:65`, `packages/ui-web/motion.ts:14` · Effort **M**
Motion is not tokenized: three different easings coexist (`motion.ts` easeOut/easeInOut, `globals.css --ease-main [0.2,0,0,1]`, inline `[0.2,0,0,1]`); `packages/theme/motion.ts` lacks the spec cinematic token (600–900ms) and does not define `[0.2,0,0,1]`; there is no `lib/motion.ts` centralized variants file (each section redefines inline framer variants); the reduced-aware `packages/ui-web/motion.ts` is unused; FadeUp sets permanent `willChange` on every instance.
*Fix:* Add `easeMain [0.2,0,0,1]` and a cinematic duration token to `motion.ts`; create `lib/motion.ts` re-exporting `packages/ui-web/motion.ts` variants and replace all inline variants; remove the static `willChange` (set only while animating). *(A1, A4)*

**M-039 · 🟡 Minor · FAQ / shimmer keyframe** · `FAQ.tsx:64-71`, `tailwind.config.ts:57-60` · Effort **S**
FAQ animates `height:auto` (a layout property) instead of transform/opacity, causing reflow/repaint jank and violating the 60fps transform/opacity-only rule. Separately the tailwind shimmer keyframe animates `backgroundPosition` (paint, non-composited) though currently unused (dead but non-compliant if revived).
*Fix:* Replace FAQ height animation with a transform-based reveal (`grid-template-rows 0fr→1fr`, or `scaleY`/`translateY` + `opacity` with `overflow:hidden`); replace the shimmer keyframe with a transform-based skeleton shimmer if used. *(A4)*

### 5.4 Typography & Type-System

**M-005 · 🟠 Major · Display-face discipline / faux-bold** · `components/ui/Section.tsx:70`, `Hero.tsx:70`, `Stats.tsx:33`, `Payments.tsx:74`, `layout.tsx:25` · Effort **M**
Instrument Serif is flooded beyond the hero: the shared SectionHeader (`font-display`) drives every section heading, plus stat values, step titles, card titles and the NPR centerpiece. It also ships only weight 400 yet every usage adds `font-bold`, so the browser synthesizes a faux-bold, degrading the serif and adding paint cost on the LCP. Three families (Inter + Instrument Serif + Noto) co-occur on NE screens, violating the max-2-families rule.
*Fix:* Restrict `font-display` to the hero `h1` only; replace `font-display` in Section/Stats/HowItWorks/Ecosystem/Payments/Story with `font-sans`; drop `font-bold` from every `font-display` element (render Instrument Serif at native 400). *(A2)*

**M-006 · 🟠 Major · NE typography / font switching / preload** · `Section.tsx:68-75`, `layout.tsx:15-21,192`, `context.tsx:18-43`, `globals.css:64-66` · Effort **M**
NE typography is broken: the body never switches font-family on locale (only per-element opt-in guards exist), the shared SectionHeader has no `font-devanagari` guard so NE section headlines render in Instrument Serif (no Devanagari glyphs) and fall back to system serif, and Noto Sans Devanagari is `preload:false` so the NE toggle triggers a late fetch → FOUT + CLS.
*Fix:* Toggle a `font-devanagari` class on `documentElement`/`body` when `locale==='ne'` so the whole document switches family; set `preload:true` for Noto 400/500/600; make SectionHeader locale-aware or drive font switching at the wrapper level. *(A2, A9)*

**M-021 · 🟡 Minor · Stats / count-up** · `content/landing.ts:37-41,219-223`, `Stats.tsx:31-38`, `tailwind.config.ts:40,44-65` · Effort **M**
The signature number count-up technique is missing: Stats values are stored as display strings (`'500+'`, `'10K+'`, `'१०हजार+'`) so there is no numeric value to animate, and the tailwind `animate-count-up` utility references a `count-up` keyframe that does not exist in the keyframes map (dead/no-op). `tabular-nums` is also ineffective on the mixed/Devanagari strings.
*Fix:* Store numeric value + suffix; implement a reduced-motion-aware count-up (`useMotionValue`/`animate`) and add the missing `@keyframes count-up`; apply `tabular-nums` only to the numeric span; map to Devanagari digits for NE. *(A2, A3, A4, A7)*

**M-044 · 🟡 Minor · Font payload / fluid scale / tabular** · `layout.tsx:26`, `tailwind.config.ts:18-28`, `tailwind-preset.js:94-105`, `Payments.tsx:74`, `globals.css:46-49,59-61` · Effort **S**
Instrument Serif is configured `style:['normal','italic']` causing next/font to emit an unused italic file (no italic usage anywhere); the preset's fixed-px fontSize scale coexists with the fluid clamp ramp and is used for the fixed `text-4xl 'NPR'` centerpiece (does not scale at 360px); and global `font-feature-settings` lacks `tnum`/`lnum` so tabular figures depend on a rarely-applied (and ineffective) `.tabular-nums` class.
*Fix:* Drop `style:['normal','italic']`; replace `text-4xl` on the NPR centerpiece with a fluid token (`text-display-md`) or `clamp()`; enable `tnum` on stat/price components explicitly once numeric values exist. *(A2)*

### 5.5 Section-by-Section UX

**M-007 · 🟠 Major · Navbar / anchor nav** · `Navbar.tsx:29-34`, `app/page.tsx:14`, `globals.css:40-44`, `Section.tsx:20` · Effort **M**
Anchor navigation is broken: nav link labels are mismatched to scroll targets (Features→`#how-it-works`, How It Works→`#ecosystem`, For Sellers and For Riders both→`#ecosystem`) and no `#features`/`#sellers`/`#riders` sections exist. No `scroll-padding-top`/`scroll-margin-top`, so the fixed 64–80px navbar obscures every section heading on in-page jumps. Nav items are `<button onClick>` not `<a href>`, removing anchor semantics/crawlability.
*Fix:* Reconcile labels with real anchors (or add the missing sections); add `scroll-padding-top:5rem` to `html` and/or `scroll-mt-24` to each id'd section; prefer `<a href="#id">` over JS `scrollTo` for crawlability. *(A3, A5, A6, A11)*

**M-022 · 🟡 Minor · Page IA vs brief** · `app/page.tsx:14-64` · Effort **L**
Information architecture diverges from the brief: there is no Categories/value-prop section (L3), no AppShowcase device gallery (L5), and no Features bento + Nepal-first count-ups section (L6). The page goes Hero→TrustStrip→Stats→Story→Ecosystem→HowItWorks→Payments→Waitlist→Download→FAQ→Footer.
*Fix:* Add the missing sections per the brief IA (Categories L3, AppShowcase L5 using the unused onboarding PNGs via `next/image`, Features bento L6); update Navbar links to target them. *(A3, A11)*

**M-033 · 🟡 Minor · HowItWorks / visual alignment** · `HowItWorks.tsx:31,45` · Effort **S**
The HowItWorks desktop connecting line is vertically misaligned with the step icons: the line sits at `top-12` (48px) but the 64px icon's vertical center is at ~32px, so the line passes below the icon centers rather than through them.
*Fix:* Set the line to `top-8` (32px) or compute it to match the icon center. *(A3)*

**M-045 · ⚪ Polish · Ecosystem / affordance** · `Ecosystem.tsx:56,107` · Effort **S**
Ecosystem cards declare `cursor-default` and have no whole-card action, yet apply a hover border + shadow that signal clickability, creating a misleading affordance (the real CTA is a separate button at the bottom).
*Fix:* Either make the whole card clickable (`cursor-pointer` + onClick scrolling to waitlist) or reduce the hover shadow to a subtle non-interactive highlight. *(A3)*

### 5.6 Accessibility

**M-008 · 🟠 Major · Navbar / mobile menu** · `Navbar.tsx:112-122,128-160,43-47` · Effort **M**
The mobile menu overlay lacks dialog accessibility (no focus trap, no Escape handler, no body scroll lock, no focus move/return, no `role=dialog`/`aria-modal`) and Tab leaks into the hidden desktop controls. When opened at the top of the page (`scrolled=false`) the header is transparent with white text on a white overlay, so the close button and logo are white-on-white and invisible.
*Fix:* Add `role=dialog aria-modal` + a `useEffect` that locks body overflow, traps focus, closes on Escape, and returns focus to the toggle; force the scrolled visual style whenever `mobileOpen` is true. *(A3, A6)*

**M-009 · 🟠 Major · Skip link / focus order** · `app/page.tsx:18-28`, `Navbar.tsx:55-122` · Effort **S**
The skip-to-main-content link is not the first focusable element: it is rendered inside `<main>` after `<Navbar/>`, so the first Tab lands on navbar controls. `<main id="main-content">` has no `tabindex=-1`, so the skip link scrolls but does not move focus, and subsequent Tab resumes from the skip link position.
*Fix:* Move the skip link to be the first child of `<body>` (before Navbar) and add `tabIndex={-1}` to `<main id="main-content">`. *(A6)*

**M-020 · 🟠 Major · Color contrast** · `Ecosystem.tsx:18-22`, `Stats.tsx:39-45`, `Hero.tsx:105,115`, `globals.css:17` · Effort **S**
WCAG AA contrast failures across multiple elements: white-on-gold Ecosystem icon (~2.2:1, fails 1.4.11), `text-text-muted` (#6B7280) Stats label on `primary-50` (#F8EAF1) at ~4.15:1 (fails 1.4.3 for body text), and hero captions at `text-white/40-50` (~2.5–3:1, fails 1.4.3). Combined these threaten Lighthouse a11y ≥95.
*Fix:* Darken `text-muted` to clear 4.5:1 on tinted backgrounds (e.g. #555E68) or use `text-text`; raise hero captions to `white/70-80`; use a dark icon on gold or replace the gold tile with `primary`. *(A1, A3, A6)*

**M-035 · 🟡 Minor · TrustStrip / marquee** · `TrustStrip.tsx:10,18`, `globals.css:104` · Effort **S**
The TrustStrip marquee duplicates the item array (`[...items, ...items]`) for the seamless loop but the duplicated half is not `aria-hidden`, so screen readers announce every trust statement twice. There is also a redundant duplicate reduced-motion guard (both a `motion-reduce:` utility and a `globals.css .animate-marquee` nuke).
*Fix:* Mark the moving track `aria-hidden=true` and provide an sr-only `<ul>` of the 8 unique items; keep one reduced-motion guard (the `motion-reduce:` utility) and drop the `globals.css` duplicate. *(A4, A6)*

**M-041 · 🟡 Minor · Focus ring** · `Waitlist.tsx:115,141`, `Hero.tsx:118,125`, `globals.css:52-56` · Effort **S**
Waitlist inputs use `focus:outline-none` (not `focus-visible`) plus a translucent `white/50` ring, and because the `.focus:outline-none` rule outranks the global `:focus-visible` plum outline, keyboard users get no plum outline on these inputs. The global `:focus-visible` rule also sets `border-radius:4px`, mutating the element's corner radius during focus (shape jump) and clipping outlines on rounded controls.
*Fix:* Use `focus-visible:outline-none` so the global plum outline applies for keyboard; standardize all controls to the plum focus ring; remove `border-radius:4px` from `:focus-visible`. *(A1, A6)*

**M-047 · ⚪ Polish · Brand / schema polish** · `Navbar.tsx:55-62`, `layout.tsx:41-50,34,116-134`, `content/landing.ts:179` · Effort **S**
The logo button has a redundant accessible name (`aria-label` overrides the img `alt`); `metadata.keywords` is populated (Google ignores it, dead head weight); `metadataBase` is hard-coded `https://chinooz.com` with no env (wrong if the real host differs); the Organization JSON-LD has no `sameAs` social links despite the footer listing four socials.
*Fix:* Pick one accessible name for the logo; optionally remove `keywords`; drive `metadataBase` from `NEXT_PUBLIC_SITE_URL`; add `sameAs:[social URLs]` + logo width/height to the Organization node. *(A6, A8)*

### 5.7 SEO & Structured Data

**M-012 · 🟠 Major · Favicons / OG / robots / webmanifest** · `layout.tsx:63-70,77,91-96`, `opengraph-image.tsx:1`, `public/robots.txt:1`, `app/robots.ts:3`, `public/site.webmanifest:10-19` · Effort **M**
Favicons referenced in `metadata.icons` (`/favicon.ico`, `/favicon-16x16.png`, `/apple-touch-icon.png`) do not exist in `public/` and no `icon.tsx`/`apple-icon.tsx` routes generate them → 404 on every load. OG metadata references a non-existent `/og-image.png` while `app/opengraph-image.tsx` generates one via next/og (conflicting duplicate og:image). `public/robots.txt` shadows `app/robots.ts` (dead generated route). `site.webmanifest` uses `chinooz-logo.png` (a horizontal lockup) for both 192 and 512 icons → invalid PWA icon set.
*Fix:* Generate a real icon set (favicon.ico, 16/32, apple-touch, 192/512 maskable) or add `app/icon.tsx` + `app/apple-icon.tsx`; remove the manual `openGraph`/`twitter` images entries; delete `public/robots.txt` keeping `app/robots.ts`; generate proper square manifest icons. *(A1, A8)*

**M-013 · 🟠 Major · JSON-LD / structured data** · `layout.tsx:113-177`, `content/landing.ts:136-161,318-343` · Effort **S**
JSON-LD FAQPage lists only 3 of the 6 visible FAQ items (missing sell/outside-Kathmandu/rider high-intent queries) and is hard-coded English with no NE alternate, so NE FAQ is invisible to search. The WebSite schema declares a SearchAction targeting `/search` which does not exist (404). All schema is server-rendered statically with no locale access.
*Fix:* Generate FAQPage `mainEntity` from the same content source (all 6 items); emit a localized FAQPage/`inLanguage` for NE once server-side locale resolution exists; remove the SearchAction until `/search` is built. *(A3, A8, A9)*

### 5.8 Performance & Core Web Vitals

**M-014 · 🟠 Major · Server/client architecture / code-splitting** · `app/page.tsx:1-12`, `layout.tsx:118-121,193`, `lib/i18n/context.tsx:1` · Effort **L**
All 13 sections are `'use client'` (forced by the client-side i18n `useState` context + framer-motion) and statically imported with no `next/dynamic`, so the entire page's section JS (framer-motion ×13 + lucide + AnimatePresence) ships and hydrates upfront including below-fold sections. This inflates initial JS and TBT, making Lighthouse mobile ≥95 unlikely.
*Fix:* Adopt react-i18next with server-side locale resolution so section shells can be server components; dynamically import below-fold sections with `next/dynamic` (`ssr:true`) with sized skeletons; push `'use client'` to the smallest leaf components. *(A7, A12)*

**M-015 · 🟠 Major · Hero / LCP** · `Hero.tsx:1,65-75`, `layout.tsx:23-30` · Effort **M**
The LCP element (hero `h1`, `text-display-xl` Instrument Serif) is a framer-motion client component that mounts at `opacity:0`/`y:24` and only becomes visible after JS download + hydration + 0.2s delay + 0.8s animation. On mid-Android (4× CPU) this pushes LCP past the 2.0s Quality-Bar ceiling, and the `opacity:0` inline style hides the largest text from first paint.
*Fix:* Server-render the hero headline visibly (`initial opacity:1`, animate only `translateY`) or make Hero a server component animating non-LCP children via a small client island; drop the 0.2s delay; use a CSS keyframe gated by reduced-motion so LCP paints on first render. *(A4, A7)*

**M-016 · 🟠 Major · Hero / 60fps** · `Hero.tsx:25-39`, `Story.tsx:74-114`, `Download.tsx:65-130` · Effort **M**
Hero runs three simultaneous infinite framer-motion scale+opacity animations on large (600/400/300px) elements with heavy blur (120/100/80px) from page load (not scroll-gated). Animating `scale` on a heavily-blurred 600px layer forces the GPU to recomposite the blur every frame, three at once, forever, threatening the 60fps/Lighthouse≥95 bar on mid-Android and wasting battery.
*Fix:* Reduce to one ambient animation; animate opacity only on pre-blurred static layers (keep scale fixed) or use a static CSS radial-gradient; gate remaining motion behind `useInView`; honor `prefers-reduced-motion`. *(A4, A7)*

**M-030 · 🟡 Minor · Unused assets / image format** · `public/onboarding-{delivery,payment,shop}.png`, `public/chinooz-logo.png`, `next.config.js:5-7` · Effort **S**
Three large unoptimized PNGs (onboarding-delivery 587KB, onboarding-payment 466KB, onboarding-shop 417KB; ~1.47MB total) live in `public/` but are never referenced by any component, and `next.config` `remotePatterns` (picsum/unsplash) are unused. `chinooz-logo.png` is a 222KB raster served at small sizes where an SVG (<5KB) would be far lighter, and it is loaded 3× (Navbar priority, Footer, Download).
*Fix:* Delete the three onboarding PNGs or wire them through `next/image` in a real AppShowcase; replace `chinooz-logo.png` with an inline SVG logo component; remove unused `remotePatterns`; remove the `packages/ui-web` content scan from `tailwind.config`. *(A1, A3, A7, A12)*

### 5.9 Waitlist Conversion

**M-018 · 🟠 Major · Waitlist / PII logging** · `lib/waitlist/submit.ts:31`, `lib/analytics/index.ts:7-9` · Effort **S**
PII email is logged to the console in production via `console.info` in `submitWaitlist` with no `NODE_ENV` guard, leaking personally-identifying information on every signup and violating the no-console-noise Quality Bar.
*Fix:* Remove the `console.info` or gate it behind `NODE_ENV==='development'` and log only a redacted surrogate (email_domain) mirroring `trackWaitlistSignup`. *(A10, A12)*

**M-019 · 🟠 Major · Hero / Download CTAs** · `Hero.tsx:117-130`, `Download.tsx:31-56` · Effort **S**
App Store and Google Play buttons in Hero and Download are `<button>` elements with no `onClick`, no `href`, and no `disabled` state; they look interactive (hover/focus styles) but do nothing when clicked. This is a conversion dead-end and an a11y defect (focusable interactive control with no action).
*Fix:* Either scroll to `#waitlist` on click (consistent with pre-launch) or render as disabled with `aria-disabled` + reduced opacity and no hover affordance; link to real store URLs when available. *(A3, A10, A11)*

**M-027 · 🟡 Minor · Waitlist / states** · `Waitlist.tsx:27,75-95,137-146`, `submit.ts:18-21` · Effort **S**
Waitlist state coverage is incomplete: no distinct 'validating' state (email regex runs only server-side after entering loading), no reset/re-submit path after success, client validation only checks `trim` (invalid emails trigger a full 800ms loading round-trip), and the error message persists while the user edits the input (`onChange` does not clear error state).
*Fix:* Extract the regex into a shared validator run client-side on blur/submit; add an inline invalid state before loading; clear error on edit; add a 'Sign up another email' button in the success branch. *(A3, A10)*

**M-028 · 🟡 Minor · Analytics wiring** · `lib/analytics/index.ts:7-9,22`, `Waitlist.tsx:36`, `Navbar.tsx:90,154` · Effort **M**
Waitlist analytics is a no-op in production: `trackEvent` only `console.info` in development, so the `waitlist_signup` event is silently dropped in prod and no conversion funnel data reaches any provider. Separately `trackLanguageToggle` is defined but never called on locale toggle, so NE adoption is uninstrumented.
*Fix:* Wire the real provider call (`posthog.capture`/`segment.track`) in `trackEvent`; call `trackLanguageToggle(targetLocale)` in the toggle handlers; keep PII handling (email_domain only). *(A3, A9, A10)*

**M-029 · 🟡 Minor · Waitlist / boundary + anti-spam** · `submit.ts:16-33`, `Waitlist.tsx:32,97-176` · Effort **M**
The waitlist boundary is a client-side async function (`setTimeout` + `console`) rather than a Next Server Action/API route, so it will not migrate cleanly to a real Supabase/email backend without exposing service keys, and there is no anti-spam protection (no honeypot, captcha, rate-limit, or duplicate-email check).
*Fix:* Convert `submitWaitlist` to a Next Server Action (`'use server'`) or API route with a thin client wrapper; add a visually-hidden honeypot, a privacy-friendly captcha, server-side rate-limiting and a unique-email constraint. *(A10)*

**M-040 · 🟡 Minor · Waitlist / loading + success UX** · `Button.tsx:36-48`, `Waitlist.tsx:76-95,164,173`, `packages/ui-web/ShimmerWeb.tsx:1`, `context.tsx:25-32` · Effort **M**
The Button loading state uses a spinning border spinner (not the spec'd shimmer, and a `ShimmerWeb` component exists unused); the button lacks `aria-busy` so AT is not informed of the in-progress state; the inline error uses off-theme `red-300` instead of a plum error token; the privacy microcopy uses `text-white/40` (likely <4.5:1); the success celebration is minimal (no count-up/burst); and the locale submitted with the payload is volatile (non-persistent context).
*Fix:* Replace the spinner with `ShimmerWeb` gated by reduced-motion; add `aria-busy` to the button; define a plum error token and use it; raise privacy copy to `white/60-70`; add a reduced-motion-safe celebration; fix locale persistence so the payload locale is correct. *(A4, A6, A10)*

**M-042 · 🟡 Minor · Download / QR code** · `Download.tsx:62-131` · Effort **M**
The spec calls for a QR code in the Download section as a mobile-to-desktop conversion bridge; none exists. The visual is a decorative CSS phone mockup with floating badges only.
*Fix:* Add a QR code (`next/image` or an svg QR encoding the app/download URL) beside or below the store badges so desktop visitors can scan to get the app at launch. *(A10)*

### 5.10 Content & Craft

**M-023 · 🟡 Minor · Footer** · `Footer.tsx:48-49,74-75`, `content/landing.ts:180,362` · Effort **S**
Every footer link (12 column links + 4 social icons) points to `href="#"`, so activating any scrolls to top instead of routing anywhere, and the copyright year is stale ('© 2024' in 2026, both EN and NE). Dead links are misleading for AT/keyboard users and a finished-feel failure.
*Fix:* Wire footer links to real routes (or mark coming-soon with disabled styling) and social icons to real profile URLs; render the year dynamically (`new Date().getFullYear()`) in both locales. *(A1, A3, A6, A8, A11)*

**M-031 · 🟡 Minor · Story / illustration** · `Story.tsx:79,97,109` · Effort **S**
The Story section uses emoji (Nepal flag, credit card, scooter) as the primary iconography. The spec mandates Modern-Minimal illustration with NO cultural cliche; emoji render inconsistently across platforms (the Nepal flag emoji shows as 'NP' on Windows/older Android) and read as informal clipart / an AI-slop tell.
*Fix:* Replace the emoji with Lucide icons (Flag/MapPin, CreditCard, Bike/Truck) or a custom Modern-Minimal SVG mark consistent with the design system; remove the flag emoji to avoid cliche and cross-platform render failure. *(A3, A11)*

**M-038 · 🟡 Minor · Stats / Waitlist claims** · `content/landing.ts:37-38,123,219-220,305`, `Hero.tsx:59` · Effort **S**
The pre-launch page states '500+ Sellers Ready', '10K+ Products Listed' and '2,400+ people already waiting' as factual figures while the Hero badge says 'Launching in Kathmandu Valley' and Download says 'Coming Soon'. These are unverifiable aspirational numbers presented as social proof, eroding trust if a user notices the contradiction.
*Fix:* Reframe with honest 'joining' language ('500+ Sellers Joining', '10K+ Products Planned') or gate numbers behind a real count source; soften the waitlist count to 'Join the first 2,500 shoppers'. *(A11)*

**M-046 · ⚪ Polish · Decoration / repetition** · `Hero.tsx:25-39`, `Story.tsx:64-73`, `Payments.tsx:69-72`, `Waitlist.tsx:50-51`, `Download.tsx:110-115` · Effort **M**
The same decorative motif (blurred primary/gold circles + concentric rings) recurs across Hero, Story, Payments, Waitlist and Download, leaning on the same gradient-blob + ring recipe four-plus times. This reads as a generic AI-template pattern and undercuts the finished-not-wireframe bar; the hero blobs also run infinite scale/opacity animations.
*Fix:* Vary the visual language per section: keep the aurora in Hero, use real product imagery in Story/Download, a purpose-built payment diagram in Payments, and a cleaner solid/gradient in Waitlist; reduce/gate infinite blob animations. *(A11)*

### 5.11 Code Health & Repo Hygiene

**M-024 · 🟡 Minor · Lint config** · `eslint.config.js:1-46`, `.eslintrc.js:1-3`, `apps/landing-web/.eslintrc.json:1-3`, `packages/config/eslint-config/package.json:1-12` · Effort **M**
Three conflicting ESLint configs coexist: root `eslint.config.js` (flat, with a11y/security/TS rules) + a legacy `.eslintrc.js` that extends a non-existent `'@chinooz/config/eslint'` path + `apps/landing-web/.eslintrc.json` that extends only `next/core-web-vitals`. The landing app silently skips the shared a11y/security/no-explicit-any rules the Quality Bar depends on; the `eslint-config-chinooz` package is dead.
*Fix:* Delete `.eslintrc.js`; move landing onto the root flat config (add `next/core-web-vitals` via `eslint-config-next` for `apps/*`) or make landing extend the real preset; remove or wire in `eslint-config-chinooz`. *(A12)*

**M-025 · 🟡 Minor · Repo hygiene / build artifacts** · `.gitignore:1-8`, `apps/{buyer-web,seller-web,landing-web}/tsconfig.tsbuildinfo` · Effort **S**
TypeScript incremental build artifacts (`*.tsbuildinfo`) are committed to git (buyer-web, seller-web tracked) and not gitignored; the landing artifact is untracked but will be accidentally committed on the next `git add` since `.gitignore` has no `*.tsbuildinfo` entry. They churn on every build and pollute diffs.
*Fix:* Add `*.tsbuildinfo` to `.gitignore` and `git rm --cached` the two tracked artifacts. *(A12)*

**M-026 · 🟡 Minor · Env / config hygiene** · `.env.example:1`, `apps/landing-web/package.json`, `lib/analytics/index.ts:5-7`, `layout.tsx:34` · Effort **S**
Root `.env.example` is 0 bytes (empty) and there is no `apps/landing-web/.env.example`, while every other app ships one. The landing app references env-shaped concerns (analytics provider placeholder, hard-coded site URL); contributors get no signal about `NEXT_PUBLIC_*` vars.
*Fix:* Populate `.env.example` (or add `apps/landing-web/.env.example`) with `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ANALYTICS_ID` (placeholder); read `metadataBase` from env. *(A12)*

**M-043 · 🟡 Minor · Docs / dead code / duplication** · `README.md:1-40`, `lib/utils.ts:6-8`, `components/ui/Section.tsx:1-30`, `packages/ui-web/Section.tsx:1-12`, `next.config.js:39`, `postcss.config.js:1` · Effort **M**
README.md does not document `landing-web` (Structure tree and commands omit it; no `apps/landing-web/README.md`; port 3001 undocumented); `formatPrice` is exported from `lib/utils.ts` but never used; landing defines its own `components/ui/Section.tsx` while a shared `packages/ui-web/Section.tsx` already exists (divergent duplicate); `next.config.js` and `postcss.config.js` use CommonJS in a TS-first monorepo.
*Fix:* Add landing-web to the README (purpose, port 3001, env, scripts) or add `apps/landing-web/README.md`; remove `formatPrice` or move it to `@chinooz/utils`; consume `@chinooz/ui-web`'s Section or document the marketing-specific one; optionally rename configs to `.ts`. *(A12)*

### 5.12 Layout & Responsiveness

**M-036 · 🟡 Minor · Container / gutters / footer grid** · `Section.tsx:29`, `Hero.tsx:51`, `Navbar.tsx:51`, `Footer.tsx:22-25`, `tailwind-preset.js:20` · Effort **S**
Container gutters are inconsistent at lg+: `Section.tsx` uses `px-4 md:px-6 lg:px-8` but Hero/Navbar/Footer use `px-4 md:px-6` with no `lg:px-8`, causing an 8px content-edge stair-step at ≥1024px. The dual container max-width declarations (preset container `2xl:1280` + explicit `max-w-[1280px]`) are redundant, and the Footer mobile grid (`grid-cols-2` with brand `col-span-2`) leaves an orphan Support column.
*Fix:* Add `lg:px-8` to Hero/Navbar/Footer containers (or route them through Section); pick one container max-width mechanism; restructure the footer mobile grid so the Support column has a partner. *(A5)*

**M-037 · 🟡 Minor · Payments / orbiting badges** · `Payments.tsx:79,88-92,67` · Effort **S**
The three orbiting Payments badges are positioned with hardcoded half-width/half-height pixel offsets (`-32px`/`-16px`) instead of `transform` centering, so badges are not actually centered on their orbit points and any label wider than 64px shifts further off; the `w-72` visual box has no `overflow-hidden` so a wider label can bleed into the grid gap.
*Fix:* Position with `left`/`top calc(50% ± x)` and `transform: translate(-50%,-50%)` so badges center regardless of label width; add `overflow-hidden` or margin to the `w-72` wrapper. *(A5)*

---

## 6. Token & Brand-Discipline Violations + Locations

| Violation | Spec | Actual | Winning layer | Location |
|---|---|---|---|---|
| Radii off-spec | sm8/md12/lg16/xl24/2xl32 | sm4/md8/lg12/xl16/2xl20/3xl24 | Tailwind preset (utilities) | `packages/theme/radii.ts:2-9`, `tailwind-preset.js:79-87` |
| Radii CSS-var fork | (single source) | `--radius-*` 8/12/16/24/32 (dead for utilities) | dead — diverges silently | `globals.css:24-28` |
| Shadows not plum-tinted | soft plum-tinted elevation | neutral `rgba(0,0,0)` / `colors.black` | Tailwind preset | `packages/theme/shadows.ts:15-51`, `tailwind-preset.js:112-117` |
| Gradients hard-coded hex | tokens in `packages/theme` | literal `#8A1B57`/`#6E1545`/`#E0A93B` + non-token darks `#0a0010`/`#1a0020`/`#0f0015` | `tailwind.config` | `tailwind.config.ts:29-35` |
| `@chinooz/theme` never imported | single token source | TS token API is dead code for landing | — (grep `@chinooz/theme` across components/app/lib = 0) | all landing components |
| `globals.css` hand-forks tokens | derive from theme | `--color-*`, `--radius-*`, `--duration-*`, `--ease-main` literal | third divergent layer | `globals.css:6-36` |
| Gold flood (not sparing) | gold = sparing accent only | `bg-gold text-white` 48px icon tile + gold hover shadow on Sellers card | — | `Ecosystem.tsx:18-28`, `content/landing.ts:69` |
| Motion easing fork | `[0.2,0,0,1]` + cinematic token | three easings; `motion.ts` lacks both | — | `packages/theme/motion.ts:8-12`, `globals.css:31-35`, inline `Hero.tsx:65` |
| Display face flooded | Instrument Serif hero-only | `font-display` on every section heading + stats + NPR centerpiece; faux-bold everywhere | — | `Section.tsx:70`, `Stats.tsx:33`, `Payments.tsx:74` |
| Brand primary not centralized | single `#8A1B57` constant | hard-coded in `themeColor`, manifest, OG image, gradients | — | `layout.tsx:109`, `site.webmanifest`, `opengraph-image.tsx` |

---

## 7. Performance + Core Web Vitals Report

**Estimated Lighthouse mobile: Perf ~75–85 · A11y ~88–92 · SEO ~85–90 · Best-Practices ~80–88.** None reach the ≥95 Quality Bar; Perf and Best-Practices hard-fail.

**LCP (~2.0–2.8s, target <2.0s) — fail.** The LCP element is the hero `h1` (`text-display-xl` Instrument Serif), a `'use client'` framer-motion component mounting at `initial={{opacity:0, y:24}}` with `transition={{duration:0.8, delay:0.2}}` (`Hero.tsx:65-68`). framer-motion sets inline `opacity:0` on SSR, so the largest text is invisible until framer-motion (~50KB gzip) downloads + hydrates + 200ms delay + 800ms animation. On mid-Android (4× CPU throttle) LCP breaches 2.0s. Font preload is correct for the 400 variant, but the JS-hydration gate dominates.

**60fps — at risk.** `Hero.tsx:25-39` runs three simultaneous infinite `scale+opacity` animations on 600/400/300px elements with `blur-[120px]/[100px]/[80px]`. Animating `scale` on a heavily-blurred 600px layer forces GPU re-rasterization of the blur every frame (no compositor fast path for blur+scale), three at once, forever from page load (not scroll-gated). Story adds 3 infinite floats, Download 2 more. FAQ animates `height:auto` (layout property, reflow). The `shimmer` keyframe animates `backgroundPosition` (paint).

**CLS (<0.05) — pass on EN, at-risk on NE.** All `next/image` usages have explicit width/height (Navbar 120×36, Footer 120×36, Download 60×18); no `fill` without `sizes`, no raw `<img>`. FadeUp uses `y`-transform with space reserved; fixed navbar. EN-path CLS is compliant. **NE path at risk:** Noto Sans Devanagari `preload:false` (`layout.tsx:20`) + no body-level font switch → on NE toggle the system fallback renders Devanagari, then reflows to Noto metrics (FOUT + CLS bump) plus a locale FOUC.

**Initial JS — too heavy.** All 13 sections are `'use client'` and statically imported (`page.tsx:1-12`); `next/dynamic` is never used. framer-motion ×13 + lucide + AnimatePresence all ship and hydrate upfront including below-fold sections → high TBT. `experimental.optimizePackageImports:['framer-motion','lucide-react']` helps tree-shaking but not code-splitting.

**Assets — 1.47MB dead + 222KB raster logo.** Three onboarding PNGs (587/466/417KB) are unreferenced; `chinooz-logo.png` (222KB) is a raster served at 120×36/60×18 and loaded 3× where an inline SVG (<5KB) would be far lighter. `remotePatterns` for picsum/unsplash are unused.

**Worst offenders (rough order):**
1. Hero LCP opacity:0 + 0.2s delay + 0.8s anim on LCP text (`Hero.tsx:65-68`) — LCP.
2. 3 infinite blur+scale animations on 600/400/300px (`Hero.tsx:25-39`) — 60fps/GPU.
3. Unsplit 13-section client bundle (`page.tsx`) — TBT/JS.
4. favicon.ico + apple-touch-icon + favicon-16 + og-image 404s (`layout.tsx:92-94,65,77`) — Best-Practices.
5. 222KB raster logo ×3 loads (`chinooz-logo.png`) — weight.
6. Unused 1.47MB onboarding PNGs in `public/` — repo/install weight.
7. FAQ `height:auto` animation (`FAQ.tsx:64-71`) — reflow.
8. Noto Devanagari `preload:false` (`layout.tsx:20`) — NE CLS.

---

## 8. Accessibility Report (axe + Lighthouse reasoning)

**Estimated Lighthouse a11y ~88–92 (target ≥95) — at-risk.** Static audit; no runtime axe run available.

- **Skip link / focus order — Major (M-009).** Skip link is inside `<main>` after `<Navbar/>` (not first focusable); `<main>` lacks `tabindex=-1` so focus is not moved.
- **Mobile menu dialog — Major (M-008).** No `role=dialog`/`aria-modal`, no focus trap, no Escape, no body scroll lock, no focus return; Tab leaks to hidden desktop controls. White-on-white close button when opened at top of page.
- **Color contrast — Major (M-020, M-011).** White-on-gold ~2.2:1 (fails 1.4.11); `text-muted #6B7280` on `primary-50 #F8EAF1` ~4.15:1 (fails 1.4.3 body); hero captions `white/40-50` ~2.5–3:1 (fails 1.4.3).
- **Lang attribute — Major (M-003).** `<html lang="en">` hardcoded in SSR; NE announced with English AT voice until manual post-hydration toggle; resets on reload.
- **Focus ring — Minor (M-041).** `focus:outline-none` (not `focus-visible`) on Waitlist inputs outranks the global plum `:focus-visible` outline → no plum outline for keyboard users. Global `:focus-visible` sets `border-radius:4px`, mutating element shape during focus.
- **Marquee double-read — Minor (M-035).** Duplicated marquee half not `aria-hidden`; SR announces every trust statement twice.
- **Dead CTAs — Major (M-019).** App Store/Google Play `<button>`s are focusable with no action.
- **Accordion (FAQ).** `aria-expanded` present on the toggle; verify `aria-controls` + region semantics + Enter/Space (looks implemented; not flagged).
- **Heading hierarchy.** One `h1` (hero), `h2` per section — correct. No skipped levels detected.
- **Images.** Logo `Image` has `alt`; decorative mockups need alt audit (likely OK). OG image alt present in metadata.
- **Reduced motion — Major (M-004).** framer-motion animations not gated; only CSS keyframes are neutralized.

---

## 9. SEO + Structured-Data Checklist

| Item | Status | Note |
|---|---|---|
| `metadata` (title template + default, description) | ✅ | `layout.tsx:33-50` |
| OpenGraph card | ⚠️ | Manual `openGraph.images` → `/og-image.png` (404); conflicts with generated `opengraph-image.tsx` (M-012) |
| Twitter card | ⚠️ | Same `/og-image.png` 404 (M-012) |
| Generated OG image (next/og) | ✅ exists / ⚠️ English-only | `opengraph-image.tsx`; text not i18n (M-013) |
| `sitemap.ts` | ✅ (verify URLs) | Read `app/sitemap.ts`; confirm it lists `/` + alternates via `metadataBase` |
| `robots.ts` | ⚠️ duplicate | `public/robots.txt` shadows `app/robots.ts` (M-012) |
| JSON-LD Organization | ✅ / ⚠️ no `sameAs` | `layout.tsx:116-134`; missing social `sameAs` + logo dimensions (M-047) |
| JSON-LD WebSite | ⚠️ | SearchAction targets non-existent `/search` (404) (M-013) |
| JSON-LD FAQPage | ⚠️ | 3 of 6 items; English-only; not sourced from content (M-013) |
| Canonical | ✅ | `alternates.canonical` (per commit 23941a4) |
| hreflang (`alternates.languages`) | ⚠️ dead | `ne → ?lang=ne` never read; serves English HTML (M-003) |
| Favicons (`/favicon.ico`, 16, apple-touch) | ❌ | Referenced files do not exist in `public/` → 404 (M-012) |
| `app/icon.tsx` / `apple-icon.tsx` routes | ❌ | Not present |
| `site.webmanifest` | ⚠️ invalid | Uses `chinooz-logo.png` (horizontal lockup) for 192 + 512 icons (M-012) |
| PWA icon set (192/512/maskable) | ❌ | Missing |
| `metadataBase` | ⚠️ | Hard-coded `https://chinooz.com`, no env (M-047) |
| `metadata.keywords` | ⚪ | Populated but Google-ignored (M-047) |
| `<html lang>` | ⚠️ | Hardcoded `en` (M-003) |
| Security headers | ✅ | `next.config.js:11-24` (X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy) |

---

## 10. i18n Report

**Verdict: fundamentally forked from the spec (M-001, Critical).**

- **Architecture.** Landing uses `content/landing.ts` (local EN+NE object) + `lib/i18n/context.tsx` (`useState`), NOT `packages/i18n` (react-i18next). `@chinooz/i18n`, `react-i18next`, `i18next` are declared deps but never imported; `packages/i18n`'s `initReactI18next` is never called. Translations diverge from the shared `en.json`/`ne.json` used by buyer/seller/rider apps.
- **Persistence (M-003).** `useState` only — no localStorage/cookie/URL. `<html lang="en">` hardcoded in SSR; context mutates `document.lang` post-hydration only. On reload NE resets to EN. `?lang=ne` declared in hreflang but never read → dead param, false hreflang signal.
- **NE crawlability (M-003).** Locale is client-state; server always emits English SSR. Nepali content (`content/landing.ts:184-365` full Devanagari tree) is invisible to crawlers in initial HTML.
- **Hard-coded English (M-017).** Story/Payments/Download decorative labels, every `aria-label`, the skip link, and `submit.ts` success/error messages bypass the content object → NE users see/hear mixed-script English.
- **NE typography (M-006).** Body never switches font-family on locale; shared SectionHeader has no `font-devanagari` guard → NE section headlines render in Instrument Serif (no Devanagari glyphs) → system fallback. Noto `preload:false` → FOUT + CLS on toggle.
- **EN/NE key parity.** Shapes match (trust 8/8, stats 4/4, ecosystem 3/3, howItWorks 3/3, payments 3/3, faq 6/6) — but content is sourced from the fork, not shared files.
- **NPR formatting.** Stats use Devanagari numerals as display strings; `packages/utils/currency` not used; the spec's `NPR 1,000` is not represented as a real price anywhere.
- **Long-Nepali overflow (M-034).** `nav.waitlist`, `waitlist.count`, Stats `१०हजार+` risk wrap/clip at 360px.
- **Analytics (M-028).** `trackLanguageToggle` defined but never called on toggle → NE adoption uninstrumented.

---

## 11. Waitlist Conversion + Boundary Report

**Boundary (`lib/waitlist/submit.ts`):** clean typed mock — `WaitlistPayload{email, name?, locale?}` / `WaitlistResult{success, message?}`. Swappable, but **client-side** (`setTimeout` + `console`), so it won't migrate to Supabase without exposing keys (M-029).

- **PII logging (M-018, Major).** `console.info('[Waitlist] New signup:', payload.email)` unconditional in prod → PII leak + console noise. The sibling `analytics/index.ts:8` is correctly dev-gated; this one is not.
- **States (M-027, Minor).** `idle|loading|success|error` — no `validating`; client validation is `trim`-only (invalid emails trigger an 800ms round-trip); error persists on edit (`onChange` doesn't clear); no reset/re-submit after success. Input is preserved on error (good).
- **A11y (M-040).** Button lacks `aria-busy`; inline error uses off-theme `red-300`; privacy microcopy `text-white/40` (<4.5:1); spinner instead of spec'd shimmer (`ShimmerWeb` unused); success celebration minimal.
- **CTAs (M-019, Major).** App Store/Google Play `<button>`s in Hero + Download have no `onClick`/`href`/`disabled` — focusable dead controls, conversion dead-end.
- **QR code (M-042, Minor).** Spec calls for a QR in Download as a mobile↔desktop bridge; none exists.
- **Anti-spam (M-029).** No honeypot, captcha, rate-limit, or duplicate-email check.
- **Analytics (M-028).** `trackWaitlistSignup` is called (good) but `trackEvent` is dev-only → event dropped in prod; no conversion funnel data.
- **Conversion strengths.** Single email field, clear CTA, privacy reassurance ("No spam, ever"), social proof count, reachable via nav "Join Waitlist" anchor (once anchors are fixed). Boundary is isolated so Supabase can replace `submit.ts` body without touching UI.

---

## 12. Prioritized Remediation Roadmap

### A. Quick wins (S effort, high impact — do first)

**QW1 — SEO brand-integrity batch** *(M-012, M-013 partial, M-030 partial)*
Add `app/icon.tsx` + `app/apple-icon.tsx` (next/og `ImageResponse` from brand mark) → favicons; remove manual `openGraph.images` + `twitter.images` from `layout.tsx` (let `opengraph-image.tsx` own OG); delete `public/robots.txt` (keep `app/robots.ts`); remove WebSite `SearchAction` (targets non-existent `/search`).
Files: `app/icon.tsx`, `app/apple-icon.tsx`, `app/layout.tsx`, `public/robots.txt`.

**QW2 — Repo hygiene batch** *(M-018, M-025, M-026, M-044 partial, M-001 partial)*
Add `*.tsbuildinfo` to `.gitignore` + `git rm --cached` the two tracked artifacts; remove the unconditional `console.info` PII log in `submit.ts:31` (or dev-gate with redacted surrogate); populate empty `.env.example` with `NEXT_PUBLIC_SITE_URL` + `NEXT_PUBLIC_ANALYTICS_ID`; remove dead `react-i18next`/`i18next`/`@chinooz/i18n` deps (if not migrating now); drop unused Instrument Serif `style:['normal','italic']`.
Files: `.gitignore`, `lib/waitlist/submit.ts`, `.env.example`, `package.json`, `app/layout.tsx`.

**QW3 — Nav + scroll + skip-link a11y batch** *(M-007, M-009)*
Fix `navLinks` label/target mapping; render nav items as `<a href="#id">` (not `<button>`); add `scroll-padding-top:5rem` to `html` in `globals.css`; move skip link before `<Navbar/>` and add `tabIndex={-1}` to `<main>`; add `aria-label` to mobile language toggle; add the unused Download nav link.
Files: `Navbar.tsx`, `globals.css`, `app/page.tsx`, `app/layout.tsx`, `content/landing.ts`.

**QW4 — Dead-CTA + contrast + copyright + gold batch** *(M-019, M-020, M-023 partial, M-011)*
Add `disabled` + `aria-disabled` to App Store/Google Play buttons in Hero + Download; render copyright year dynamically; darken Stats label from `text-text-muted` to `text-text` on `primary-50` cards; raise Hero captions from `white/50`,`/40` to `/70`; change Ecosystem Sellers card color from `'gold'` to `'primary'` in `content/landing.ts` (fixes both the WCAG 1.4.11 contrast failure and the gold-flood violation).
Files: `Hero.tsx`, `Download.tsx`, `Footer.tsx`, `content/landing.ts`, `Stats.tsx`, `Ecosystem.tsx`.

**QW5 — Unused-assets + config-cleanup batch** *(M-030, M-043 partial)*
Delete the 3 unreferenced onboarding PNGs (~1.47MB) from `public/` (or defer to AppShowcase); remove unused `picsum`/`unsplash` `remotePatterns` from `next.config.js`; remove `'../../packages/ui-web/**'` from `tailwind.config` content (landing imports no ui-web components); remove dead `formatPrice` export from `lib/utils.ts`.
Files: `public/onboarding-*.png`, `next.config.js`, `tailwind.config.ts`, `lib/utils.ts`.

**QW6 — Form + focus + analytics micro-fix batch** *(M-027 partial, M-040 partial, M-041, M-032 partial, M-028 partial, M-033, M-035, M-047 partial)*
Clear error on email `onChange` in Waitlist; add `aria-busy` to Button loading; remove `border-radius:4px` from `:focus-visible`; remove permanent `willChange` from FadeUp; call `trackLanguageToggle` on locale toggle; fix HowItWorks connector line (`top-12` → `top-8`); fix Waitlist input focus (`focus:outline-none` → `focus-visible:outline-none`); mark TrustStrip duplicated marquee items `aria-hidden`; add Organization `sameAs` to JSON-LD.
Files: `Waitlist.tsx`, `Button.tsx`, `globals.css`, `FadeUp.tsx`, `Navbar.tsx`, `lib/i18n/context.tsx`, `HowItWorks.tsx`, `TrustStrip.tsx`, `layout.tsx`.

**QW7 — Dead-config + JSON-LD parity batch** *(M-021 partial, M-013)*
Remove the dead `count-up` animation entry from `tailwind.config.ts` (or add the `@keyframes count-up`); expand JSON-LD FAQPage `mainEntity` from 3 to all 6 FAQ items, sourced from `content/landing.ts` (not hardcoded English literals).
Files: `tailwind.config.ts`, `layout.tsx`, `content/landing.ts`.

**QW8 — Font-preload + gutter + logo-name batch** *(M-006 partial, M-036 partial, M-047)*
Set Noto Sans Devanagari `preload:true` for 400 (NE is first-class — removes FOUT/CLS on toggle); add `lg:px-8` to Hero/Navbar/Footer containers to match `Section.tsx`; pick one accessible name for the logo button.
Files: `layout.tsx`, `Hero.tsx`, `Navbar.tsx`, `Footer.tsx`.

### B. Major (M effort)

| # | Action | Files | Impact |
|---|---|---|---|
| MJ1 | Fix radii token source + kill the fork: update `radii.ts` to spec (8/12/16/24/32); regenerate preset `borderRadius` from `radii.ts` programmatically; wire Tailwind `borderRadius` to the `--radius-*` CSS vars or drop the redundant block; add `transitionDuration:{250,400}` to theme extend. | `radii.ts`, `tailwind-preset.js`, `tailwind.config.ts`, `globals.css` | Spec-compliant radii (cards 32px not 20px), single token source, duration classes resolve. |
| MJ2 | Re-base shadows on plum-tinted elevation: `shadows.ts` → `rgba(138,27,87,0.08-0.20)` scaled by level; regenerate preset `boxShadow`; add named glow tokens (`glow-plum`,`glow-gold`); replace arbitrary `shadow-[0_0_40px_rgba(138,27,87,0.4)]` in Hero/Ecosystem. | `shadows.ts`, `tailwind-preset.js`, `Hero.tsx`, `Ecosystem.tsx` | Himalayan Modern plum elevation everywhere, tokenized glows. |
| MJ3 | Source all tokens from `packages/theme`: define a gradients export; reference via CSS vars in `tailwind.config` `backgroundImage` (no literal hexes); generate `globals.css :root` from theme at build time; centralize `#8A1B57` in one constant imported into layout, manifest, OG image. | `theme/index.ts`, `tailwind-preset.js`, `tailwind.config.ts`, `globals.css`, `layout.tsx`, `opengraph-image.tsx` | Single source of truth, no three-layer fork. |
| MJ4 | Make reduced-motion global for framer-motion: wrap app in `<MotionConfig reducedMotion="user">` in `layout.tsx`; and/or import `useReducedMotion` in FadeUp/Hero/Story/Download/Button/FAQ/Waitlist — render final state + disable infinite loops when reduced; reuse `packages/ui-web/motion.ts` variants. | `layout.tsx`, `FadeUp.tsx`, `Hero.tsx`, `Story.tsx`, `Download.tsx`, `Button.tsx`, `FAQ.tsx`, `Waitlist.tsx` | Quality-Bar compliance, CPU/battery savings. |
| MJ5 | Fix LCP + 60fps: drop `initial opacity:0` on hero `h1` (SSR-visible, animate `translateY` only or a reduced-motion-gated CSS keyframe); remove the 0.2s delay; reduce Hero to 1–2 ambient blobs, animate opacity only (not scale) on pre-blurred static layers, lower blur (60–80px); gate remaining motion behind `useInView`. | `Hero.tsx` | LCP <2.0s, 60fps, no blur+scale re-raster. |
| MJ6 | Code-split below-fold: dynamically import Story→Footer with `next/dynamic` (`ssr:true`) + sized skeletons; keep Navbar/Hero/TrustStrip/Stats static. | `app/page.tsx` | ~150–200KB gzip deferred, lower TBT, path to ≥95. |
| MJ7 | Persistent locale + URL `?lang=ne` + SSR lang (without full migration): persist to localStorage + cookie; read `?lang=` on mount; read cookie server-side in `layout.tsx` and render `<html lang={locale}>`; pass as `defaultLocale` to `I18nProvider`. | `lib/i18n/context.tsx`, `layout.tsx`, `Navbar.tsx` | Persistent choice, SSR lang, deep links, NE crawlable, valid hreflang. |
| MJ8 | Numeric stats count-up + tabular figures: refactor Stats to `{value:number, suffix}`; reduced-motion-aware count-up (`useMotionValue`/`animate`); add `@keyframes count-up`; `tabular-nums` on numeric span; Devanagari digit mapping for NE. | `content/landing.ts`, `Stats.tsx`, `tailwind.config.ts` | Signature count-up, effective tabular figures. |
| MJ9 | Restrict Instrument Serif to hero + drop faux-bold + NE body font switch: remove `font-display` from Section/Stats/HowItWorks/Ecosystem/Payments/Story; drop `font-bold` from every `font-display` element; toggle `font-devanagari` on `<html>`/`<body>` when `locale==='ne'`. | `Section.tsx`, `Stats.tsx`, `HowItWorks.tsx`, `Ecosystem.tsx`, `Payments.tsx`, `Story.tsx`, `Hero.tsx`, `context.tsx`, `layout.tsx` | Display-face discipline, no faux-bold LCP cost, correct NE headings, max-2-families. |
| MJ10 | Mobile menu a11y: `role=dialog aria-modal aria-label`; on open lock body overflow, focus first link, trap Tab; on Escape close + return focus; `aria-hidden`/`inert` on page behind; force scrolled visual style when `mobileOpen`. | `Navbar.tsx` | WCAG 2.1.2/2.4.3, visible close, dialog semantics. |
| MJ11 | Fix i18n leaks: move all hardcoded English (Story/Payments/Download labels, all aria-labels, skip link, submit.ts messages) into `content/landing.ts` under EN+NE; source via `landingContent[locale]`; `submit.ts` returns error codes mapped in the component. | `Story.tsx`, `Payments.tsx`, `Download.tsx`, `Navbar.tsx`, `Waitlist.tsx`, `Footer.tsx`, `page.tsx`, `submit.ts`, `content/landing.ts` | Bilingual completeness, no mixed-script NE. |
| MJ12 | Centralize `lib/motion.ts` + tokenize easing/durations: re-export/adapt `packages/ui-web/motion.ts` reduced-aware variants; add cinematic 700ms + `easeMain [0.2,0,0,1]` to `motion.ts`; replace every inline `initial/animate/transition` with hardcoded ease/durations. | `lib/motion.ts`, `motion.ts`, `FadeUp.tsx`, `Hero.tsx`, `Navbar.tsx` | Single motion source, no easing drift. |
| MJ13 | Replace emoji with designed SVG/Lucide illustrations: Story flag/credit-card/scooter emoji → Lucide (MapPin/Flag, CreditCard, Bike/Truck) or custom Modern-Minimal SVG marks; remove the flag emoji (cliche + cross-platform render failure). | `Story.tsx` | No cliche, consistent iconography, no AI-slop tell. |
| MJ14 | Waitlist → server action + anti-spam + real analytics: `'use server'` on `submitWaitlist` (or API route) with thin client wrapper; visually-hidden honeypot; wire real provider in `trackEvent`; extract email regex into `lib/waitlist/validation.ts` shared by submit + Waitlist for client validation before loading. | `submit.ts`, `validation.ts`, `Waitlist.tsx`, `analytics/index.ts` | Server backend, anti-spam, prod conversion data, shared validation. |
| MJ15 | Consolidate ESLint config: delete broken legacy `.eslintrc.js`; move landing onto root flat `eslint.config.js` (add `eslint-config-next` for `apps/*`) or make `.eslintrc.json` extend the shared preset; remove/wire dead `eslint-config-chinooz`. | `.eslintrc.js`, `apps/landing-web/.eslintrc.json`, `eslint.config.js`, `packages/config/eslint-config` | Shared a11y/security/TS rules apply to landing. |
| MJ16 | Wire footer links + fix webmanifest PWA icons: point footer links/socials to real routes/URLs (or coming-soon disabled styling); generate proper square 192/512 PNG icons (+512 maskable) from the Chinooz mark; reference distinct files in `site.webmanifest`. | `Footer.tsx`, `content/landing.ts`, `site.webmanifest`, `public/` | No dead-end links, valid PWA installability. |

### C. Strategic (L effort)

| # | Action | Files | Impact |
|---|---|---|---|
| ST1 | Full `packages/i18n` + react-i18next migration: move all landing strings into `packages/i18n/locales/{en,ne}.json` under `landing.*`; replace `context.tsx` with `initI18n()` + `useTranslation`; delete `content/landing.ts`. Resolves the Critical M-001. | `packages/i18n/locales/*`, `packages/i18n/index.ts`, `context.tsx`, `content/landing.ts`, `package.json`, `sections/` | Spec compliance, shared translations, honest deps, no fork. |
| ST2 | Server-component boundary for i18n: Next middleware reads `?lang=`/cookie/Accept-Language → server-resolved locale; render `<html lang>`, JSON-LD (with `inLanguage`), and OG text from server; convert section shells to server components with small client islands for motion/interactive controls. | `middleware.ts`, `layout.tsx`, `opengraph-image.tsx`, `sections/` | SSR locale (crawlable NE), localized schema/OG, no FOUC, minimal client JS, LCP improvement. |
| ST3 | Add missing IA sections per brief: Categories/value-prop (L3), AppShowcase device gallery (L5) using the 3 onboarding PNGs via `next/image` in phone-bezel frames, Features bento with Nepal-first count-ups (L6); update Navbar links. | `sections/Categories.tsx`, `sections/AppShowcase.tsx`, `sections/Features.tsx`, `page.tsx`, `Navbar.tsx`, `Download.tsx` | Brief-compliant IA, real app showcase (uses the 1.47MB dead assets), count-up bento. |
| ST4 | Add missing motion signatures (parallax, magnetic buttons, sticky scroll storytelling): `useScroll`+`useTransform` parallax on Hero; magnetic-button wrapper for primary CTAs; convert HowItWorks/Story into a pinned scroll-storytelling sequence; centralize as hooks in `lib/motion.ts`. | `lib/motion.ts`, `Button.tsx`, `Hero.tsx`, `HowItWorks.tsx`, `Story.tsx` | World-class motion matching the spec signature list. |
| ST5 | Reach Lighthouse ≥95 on real mid-Android: combine MJ4/MJ5/MJ6 + replace 222KB `chinooz-logo.png` with an inline SVG logo; verify on real mid-Android / 4× CPU throttle. | `Hero.tsx`, `page.tsx`, `Navbar.tsx`, `Footer.tsx`, `Download.tsx`, `chinooz-logo.png` | Quality-Bar perf verified on real device. |
| ST6 | Replace mock waitlist with Supabase server action: full insert with server-side rate-limiting, unique-email constraint, email notification API; real analytics (posthog/segment) with PII-safe properties; privacy-friendly captcha (hCaptcha/Turnstile); `submitWaitlist` as a Server Action keeping the existing types as the contract. | `submit.ts`, `validation.ts`, `Waitlist.tsx`, `analytics/index.ts` | Real conversion backend, anti-spam, prod funnel, email lifecycle. |
| ST7 | Consolidate ESLint to a single flat config across the monorepo: extend root `eslint.config.js` to cover all apps via `eslint-config-next`; wire shared a11y/security/TS rules from `eslint-preset.js`; delete `.eslintrc.js`, `apps/landing-web/.eslintrc.json`, and dead `eslint-config-chinooz`. | `eslint.config.js`, `.eslintrc.js`, `apps/landing-web/.eslintrc.json`, `packages/config/` | Consistent linting across all apps, no broken/legacy configs. |
| ST8 | Full PWA icon set + manifest + README docs: complete icon set (favicon.ico, 16/32, apple-touch-180, android-chrome-192/512, 512-maskable, mstile-150); valid `site.webmanifest` with distinct icons + `purpose:'any maskable'`; document landing-web in root README (Structure + `pnpm --filter landing-web dev`, port 3001) or add `apps/landing-web/README.md`. | `public/`, `site.webmanifest`, `layout.tsx`, `README.md` | Installable PWA (Lighthouse PWA pass), contributor discoverability. |

### Cross-checks that shaped this roadmap

1. **tokens-vs-visual** — CONFIRMED: three competing radius layers; the wrong preset wins for Tailwind utilities; every `rounded-2xl` card renders 20px not 32px; `globals.css --radius-*` vars are dead for utilities. Same fork for shadows (neutral not plum) and gradients (literal hexes). → MJ1/MJ2/MJ3.
2. **motion-vs-perf-LCP** — CONFIRMED: LCP <2.0 and 60fps both threatened; reduced-motion is NOT global (CSS block covers keyframes only; zero `useReducedMotion`/`MotionConfig`; `packages/ui-web` reduced-aware variants unused). → MJ4/MJ5.
3. **a11y-vs-i18n** — CONFIRMED: SSR lang mismatch, dead `?lang=ne`, NE not crawlable, gold-on-white fails WCAG 1.4.11 (~2.2:1). → MJ7/QW4.
4. **fonts-vs-CLS** — CONFIRMED with nuance: EN-path CLS <0.05 (images have dimensions); NE-path at risk (Noto `preload:false` + no body font switch → FOUT/reflow + locale FOUC). → QW8/MJ9.
5. **content-vs-IA** — CONFIRMED: nav anchors broken (3 of 4 → `#ecosystem`); 3 brief-mandated sections missing; no `scroll-padding-top`. → QW3/ST3.
6. **SEO-vs-i18n** — CONFIRMED: hreflang param dead; JSON-LD FAQ 3 vs 6 and English-only; favicons + OG 404; robots duplicate; SearchAction 404. → QW1/QW7/MJ7/ST2.

### Conflict resolutions (synthesis)

- **Gold contrast severity:** A1 rated Polish (treated icon as decorative), A6 rated Major (WCAG 1.4.11). **Resolved → Major.** The icon tiles are the role-identifying visual anchor (buyer/seller/rider), so 1.4.11 applies; white-on-gold ~2.2:1 fails 3:1. Fix: Sellers card `gold` → `primary` (resolves both contrast and gold-flood).
- **LCP severity:** A2 rated Minor (preload matches 400 variant), A4/A7 rated Major (JS-hydration gate). **Resolved → Major.** The `h1` is `'use client'` framer-motion with `initial opacity:0` + 0.2s delay; largest text is invisible until framer-motion (~50KB) parses/executes. Faux-bold is a separate Minor.
- **CLS scope:** A7 said "compliant" (EN path), A2 flagged NE font-swap risk. **Both correct for their path** — EN fine, NE at risk from Noto `preload:false`. Fix: preload Noto 400 (QW8).
- **Favicon effort:** A8 said M (full hand-generated set), A1 said S (next/og file routes). **Resolved → S for the basic fix** (`app/icon.tsx` + `app/apple-icon.tsx`); full PWA icon set is a separate strategic item (ST8).

---

*End of report. Audit only — no code modified. Say "apply" to begin remediation (recommended order: QW1–QW8 → MJ1–MJ16 → ST1–ST8).*
