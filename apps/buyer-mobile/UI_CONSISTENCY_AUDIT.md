# Chinooz Buyer App — UI/UX Consistency Audit

**App audited:** `apps/buyer-mobile` (Expo Router + React Native, `react-native-reanimated` v4)
**Method:** Static, code-based review. Every finding below cites `file:line` evidence gathered directly from the source.
**Date:** 2026-06-30

> Scope requested: (1) **button design consistency**, (2) **animation & easing consistency**, (3) **screen/page transitions** — replace slide-left/right with **fade in/out + smooth easing**, and (4) **emojis / unprofessional elements**. This document covers all four.

---

## Severity legend

| Level | Meaning |
|-------|---------|
| 🔴 **P0 – High** | Directly contradicts a stated preference, or visibly unprofessional in a money/commerce flow. Fix first. |
| 🟠 **P1 – Medium** | Real inconsistency the user will feel; erodes polish but not blocking. |
| 🟡 **P2 – Low** | Cleanup / debt; fix opportunistically or via lint rule. |

---

## Executive summary

The app **already ships a proper design system** — `packages/theme` (motion, radii, colors, shadows) and `packages/ui` (a real `Button`, `IconButton`, and token-correct `FadeIn`/`SlideUp` animation primitives). **The core problem is that the screens almost never use it.** Instead, almost every screen hand-rolls its own buttons, animations, and even iconography. The result is exactly what you described: the same button looks and behaves differently from screen to screen.

The four headline findings:

1. 🔴 **Transitions are the opposite of your stated preference.** 18 of ~24 screens are explicitly set to `slide_from_right`; only **one** screen (`onboarding`) uses `fade`. You said you avoid slide-left/right and prefer fade in/out — today the app is built almost entirely on slide. → [Finding 1](#finding-1--screen-transitions-slide-everywhere-not-fade-)
2. 🔴 **Buttons are completely hand-rolled and inconsistent.** The shared `@chinooz/ui` `Button` is imported **zero times**. There are **554** raw `TouchableOpacity`/`Pressable` instances across 65 files. Primary CTA heights span **44/46/48/50/52/54/56 px** (plus padding-only buttons with no fixed height), corner radius varies between `full`, `lg`, `md`, and a hardcoded `14`, and press feedback ranges across **7 different `activeOpacity` values** plus a few spring-scale presses. → [Finding 2](#finding-2--button-design-inconsistency-)
3. 🟠 **Animation timing & easing are ad-hoc.** The theme defines a clean duration scale (150/250/400/600/800) and bezier easing tokens, but the codebase hardcodes **~22 distinct duration values** and at least **5 different easing curves**, with only a handful of files using the tokens. → [Finding 3](#finding-3--animation--easing-inconsistency-)
4. 🔴 **Emojis are used as UI iconography in 32 files (72 occurrences)** — including payment-method icons (💵💚💜), the About-screen "logo" (🛍️), and error/empty states (😕) — even though a real Ionicons-based `Icon` component exists and is used in 36 files. This is the single biggest "unprofessional" signal. → [Finding 4](#finding-4--emojis--unprofessional-elements-)

> **Root cause for all four:** a strong token/component layer exists but is bypassed. The highest-leverage fix is not "tweak each screen" — it's **adopt the shared primitives and add a couple of lint guardrails** so drift can't return.

---

## Finding 1 — Screen transitions: slide everywhere, not fade 🔴

**Your preference:** *avoid slide-left / slide-right; prefer fade in / fade out with smooth easing.*

**Reality:** All navigation transitions are configured in a single file — `app/_layout.tsx`. Almost every screen is pinned to `slide_from_right`.

| Screen (`app/_layout.tsx`) | Configured transition | Matches your preference? |
|---|---|---|
| `onboarding` (L22) | `animation: 'fade'` | ✅ yes |
| `search` (L26–34) | `fullScreenModal` + `slide_from_bottom` | ➖ modal (defensible) |
| `phone-entry` (L23) | `slide_from_right` | ❌ |
| `seller/[id]` (L36) | `slide_from_right` | ❌ |
| `orders/index`, `orders/[id]` (L38–39) | `slide_from_right` | ❌ |
| `wishlist`, `addresses`, `payments`, `edit-profile` (L40–43) | `slide_from_right` | ❌ |
| `settings`, `language`, `notification-settings`, `appearance` (L44–47) | `slide_from_right` | ❌ |
| `help`, `contact`, `about`, `terms`, `privacy`, `feedback` (L48–53) | `slide_from_right` | ❌ |
| `splash` (L21), `(tabs)` (L24), `product/[id]` (L35), `cart` (L37, `presentation: 'card'`) | *no `animation` set* → platform default (slide-based push) | ❌ |

**Tally:** 18 screens explicitly `slide_from_right`, 1 `fade` (`onboarding`), 1 modal `slide_from_bottom` (`search`), 4 inheriting the slide-based platform default (`splash`, `(tabs)`, `product/[id]`, `cart`).

There is also a **secondary inconsistency**: some screens explicitly declare `slide_from_right` while others (`product/[id]`, `cart`, `(tabs)`, `splash`) declare nothing and inherit the default — so even the slide behavior isn't applied uniformly.

### Recommendation

Make **fade the app-wide default** in one place and delete the per-screen slide overrides:

```tsx
// app/_layout.tsx
<Stack
  screenOptions={{
    headerShown: false,
    animation: 'fade',          // global default — replaces slide_from_right
    animationDuration: 250,     // iOS; aligns with theme `duration.normal`
  }}
>
  <Stack.Screen name="splash" />
  <Stack.Screen name="onboarding" />          {/* no override needed now */}
  <Stack.Screen name="phone-entry" />         {/* drop slide_from_right */}
  {/* search can stay a modal, but consider `fade` instead of slide_from_bottom: */}
  <Stack.Screen name="search" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
  {/* …delete `animation: 'slide_from_right'` from every other screen… */}
</Stack>
```

**Important technical nuance (so the fix is accurate):** the native-stack `animation` prop is driven by the OS and accepts a fixed set of values (`fade`, `none`, `slide_from_*`, …). It does **not** accept a custom cubic-bezier curve, so you cannot feed it `easing.signature` directly. Two ways to get "fade with *smooth, branded* easing":

- **Option A (simplest, recommended):** set the stack `animation: 'fade'`. You get a clean platform crossfade with no horizontal motion. Good enough for 95% of screens and a one-line change.
- **Option B (full control):** set the stack `animation: 'none'` and let each screen's content fade itself in with the **already-existing** `FadeIn`/`FadeOut` Reanimated primitives, which *do* honor the bezier tokens (`packages/ui/Animate.tsx`). Many screens already wrap their content in `Animated.View entering={FadeIn…}` (e.g. `profile.tsx`, `payments.tsx`, `addresses.tsx`), so this is on-brand and gives you token-accurate easing.

Either way, the user-visible result is fade-in/fade-out instead of slide, which is what you asked for.

---

## Finding 2 — Button design inconsistency 🔴

### 2.1 The shared `Button` is never used

`packages/ui/Button.tsx` is a complete, well-built component: variants `primary | secondary | ghost | destructive`, sizes `sm(44) | md(44) | lg(52)`, `borderRadius: radii.lg`, a consistent spring press (`scale → 0.96`, `damping 15`, `stiffness 400`), reduced-motion support, and loading state.

**It is imported 0 times in `buyer-mobile`.** A search for `@chinooz/ui` imports shows screens only pull `useReducedMotion`, `SafeImage`, `EmptyState`, `ProductCard`, `Skeleton`, `QuantityStepper`, `OrderStatusTimeline`, `Avatar`, `CartSummary`, `Screen`, `SegmentedControl`, and `BottomSheet` — **never `Button` or `IconButton`.**

Consequently there are **554 raw `TouchableOpacity`/`Pressable` instances across 65 files** (e.g. `inbox.tsx` 39, `search.tsx` 38, `addresses.tsx` 32, `profile.tsx` 25, `payments.tsx` 22). Every button is bespoke.

### 2.2 Primary CTAs: same role, different spec on every screen

These are all the app's *primary call-to-action* button, yet no two share a spec:

| Screen / file:line | Height | Radius | Font weight | Press feedback | Shadow |
|---|---|---|---|---|---|
| `phone-entry.tsx` `styles.cta` (~L228) | **56** | **`radii.full`** | 700 | `activeOpacity 0.85` | heavy plum |
| `otp.tsx` (L416) / `onboarding.tsx` (L345) | **56** | — | 700 | `activeOpacity 0.85` | — |
| `cart.tsx` checkout (L298) | **48** | `radii.lg` | 700 | `activeOpacity 0.85` | bar shadow |
| `checkout.tsx` footer (L218) & empty (L140) | **none (padding `spacing[3]`)** | `radii.lg` | 700 | `activeOpacity 0.85` | none |
| `product/[id].tsx` Add-to-Cart/Buy-Now (L444–484) | **none (`paddingVertical: 13`)** | `radii.lg` | 700 | mixed (see 2.3) | none |
| `EmptyCart.tsx` `ctaButton` | **none (padding `spacing[3.5]`)** | `radii.lg` | 700 | **spring scale 0.97** | plum shadow |
| `addresses.tsx` `saveBtn` (L363) | **50** | `radii.lg` | — | `activeOpacity 0.7` | — |
| `payments.tsx` `connectBtn` (L300) | **52** | `radii.lg` | — | `activeOpacity 0.85` | — |
| `profile.tsx` `signInCta` (L397) | **48** | `radii.lg` | — | `activeOpacity 0.85` | — |
| `orders/index.tsx` `shopCta` (L501) | **48** | `radii.lg` | — | `activeOpacity 0.85` | — |
| `feedback.tsx` `submitBtn` (L131) | **48** | **`radii.md`** | **600** | `activeOpacity 0.85` | — |
| `edit-profile.tsx` `saveBtn` (L159) | **48** | **`radii.md`** | — | `activeOpacity 0.85` | — |
| `deals.tsx` `cta` (L498) | **48** | **hardcoded `14`** | 700 | `activeOpacity 0.9` | — |
| `about.tsx` `reportBtn` (L78) / `contact.tsx` `cardBtn` (L87) | **44** | `radii.md` | — | `activeOpacity 0.7` | — |

**Heights:** 44, 46, 48, 50, 52, 54, 56, plus padding-only (no fixed height). **Radii:** `full`, `lg`, `md`, and a raw `14`. **Weights:** 600 vs 700. None of these match the design-system `Button` (44/52, `radii.lg`, weight 600).

### 2.3 Inconsistency *within a single button row*

`product/[id].tsx` (L444–484) renders the two most important commerce buttons side by side:

- **Add to Cart** — an `AnimatedTouchable` with a spring press animation (`btnAnimStyle`).
- **Buy Now** — a plain `TouchableOpacity` with **no press animation at all**.

Same row, same visual size, but one springs on press and the other doesn't. Both also use the magic number `paddingVertical: 13` (off the spacing scale).

### 2.4 Press-feedback values are all over the map

A scan of `activeOpacity` shows **7 distinct values** in use — `0.7, 0.8, 0.85, 0.9, 0.92, 0.95, 1` — frequently for similar elements (e.g. `search.tsx` uses `0.7` for 19 controls; `deals.tsx` mixes `0.92`, `0.9`, `0.85`, `0.8`). A handful of buttons instead use a Reanimated spring scale press (`EmptyCart`, `product` add-to-cart, `HomeProductCard`), so the "feel" of pressing a button is not predictable.

### 2.5 Hardcoded corner radii bypass the token scale

Radii tokens are `sm:8, md:12, lg:16, xl:24, 2xl:32, 3xl:40, full:9999` (`packages/theme/tokens.js`). Yet hardcoded `borderRadius` values appear throughout — `3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 84` — many of which (11, 13, 14, 20, 22) don't even map to a token. Examples: `deals.tsx` (L446–460: `7/5/6/11/4`), `profile.tsx` (L350–378: `20/22/14/10/16`), `VariantSelector.tsx` (L302–333: `15/11/13`), `seller/[id].tsx` (L243/262: `24/18`).

### Recommendation

1. **Adopt `@chinooz/ui` `Button` / `IconButton`** for every primary, secondary, and icon action. Extend the component with any missing variant (e.g. a `pill`/`full`-radius variant for the auth screens) rather than re-implementing.
2. Establish **one CTA spec**: height `52` (lg) for full-width primary CTAs, `44` for inline/secondary, `radii.lg`, weight `600`, single spring press (`0.96 / damping 15 / stiffness 400`).
3. **Ban hardcoded `borderRadius` numbers** — always reference `radii.*`.
4. Add an ESLint guard (see [Cross-cutting](#cross-cutting--the-system-exists-its-just-bypassed)) so new raw-`TouchableOpacity` buttons and numeric radii are flagged in review.

---

## Finding 3 — Animation & easing inconsistency 🟠

The motion system in `packages/theme/motion.ts` is well-designed:

```ts
duration = { fast:150, normal:250, slow:400, slower:600, cinematic:800 }
easing   = { signature:[0.2,0,0,1], easeOut:[0.16,1,0.3,1],
             easeInOut:[0.65,0,0.35,1], spring:[0.34,1.56,0.64,1] }
```

But most animation code ignores it.

### 3.1 Durations: ~22 distinct hardcoded values vs 5 tokens

Hardcoded `duration:` values found across the app: **50, 90, 100, 150, 160, 200, 220, 250, 260, 300, 320, 400, 500, 520, 700, 800, 1200, 1500, 1600, 2400, 2600, 3600**. A few representative offenders:

- `app/(tabs)/_layout.tsx` — `220` (L113), `160` (L116), `150` (L152), `1500` (L194–195).
- `components/HomeProductCard.tsx` — `1600` (L82), `260` (L105), `320` (L110), `520` (L121).
- `components/HeroCarousel.tsx` — `2600`, `2400`, `3600`, `1500`, `700` (L203–211).
- `app/onboarding.tsx` — a one-off magic constant `FADE_DURATION = 520` (L36).
- Shake animations duplicated with `duration: 50` in both `phone-entry.tsx` (L58–62) and `otp.tsx` (L54–58).

**Good examples that already use tokens** (the pattern to standardize on): `payments.tsx`, `addresses.tsx`, `profile.tsx` (`FadeIn.duration(duration.normal)`), `product/[id].tsx` (L99 `duration.slow`), `CustomRefreshControl.tsx` (L45 `duration.fast`).

### 3.2 Easing: at least 5 different curves, tokens rarely used

- `Easing.out(Easing.cubic)` — the de-facto majority (e.g. `HomeProductCard`, `Snackbar`, `OfflineBanner`, `checkout` L125).
- `Easing.inOut(Easing.ease)` — ambient loops (`HeroCarousel`, `location` L75–76, tab glow).
- `Easing.in(Easing.cubic)` — exits (`Snackbar` L38, `OfflineBanner` L38).
- `Easing.inOut(Easing.quad)` — `onboarding.tsx` (L77) only.
- `Easing.linear` — progress/spinners (`CustomRefreshControl` L49, `HeroCarousel` L54).
- **Token-based easing** (`Easing.bezier(...easing.easeOut|spring)`) appears in only two places: `components/SectionReveal.tsx` (L54/61) and `app/search.tsx` (L68/72/77).

So the theme's signature easing curves are essentially unused, while raw `Easing.*` presets are sprinkled everywhere.

### 3.3 Spring physics: no shared config

Press/scale springs use many different parameter sets:

- Scale targets: `0.95`, `0.96`, `0.97`, `0.98`.
- `damping`: `8, 9, 10, 12, 15, 18, 20`. `stiffness`: `120, 200, 300, 350, 400, 500`. `mass`: `0.5, 0.8, 1`.
- The design-system `Button` uses `0.96 / 15 / 400`; `Animate.ScaleIn` uses `20 / 300 / 0.8`; the tab bar uses `9 / 400`; the inbox bubble uses `15 / 300`.

Only `components/ImageGallery.tsx` does the right thing — it defines a single `SPRING_CONFIG` const and reuses it (L165–183). That pattern should be promoted to the theme.

### Recommendation

1. Export **named spring presets** from `packages/theme/motion.ts` (e.g. `springs.press = { damping:15, stiffness:400 }`, `springs.bounce`, `springs.gentle`) and import them instead of inline literals.
2. Replace hardcoded `duration:` literals with `duration.*` tokens; delete one-off constants like `FADE_DURATION`.
3. Standardize entrance reveals on the existing `FadeIn`/`SlideUp`/`AnimatedList` primitives (which already use the tokens) instead of re-deriving `FadeInDown.duration(260)`-style values per screen.
4. Standardize on `easing.easeOut` for enters and `easing.easeInOut` for loops; reserve `Easing.linear` for genuinely linear motion (progress bars, spinners).

---

## Finding 4 — Emojis & unprofessional elements 🔴

A real icon system exists — `components/Icon.tsx` (Ionicons wrapper, typed `IconName`) — and is used in **36 files / 143 usages**. Despite that, **72 lines across 32 files render raw emoji as UI**. Mixing the two is both inconsistent and, in a commerce/payments context, reads as unprofessional. Emoji also render differently across OS/version, don't respect theme colors, and don't scale with the type system.

### 4.1 Worst offenders (fix first)

| Location | Emoji | Why it hurts |
|---|---|---|
| `app/checkout.tsx:347` | 💵 💚 💜 (payment-method icons) | Emoji as **payment iconography** on the checkout screen — the least appropriate place. |
| `app/about.tsx:24` | 🛍️ (used as the app "logo") | A brand mark should never be an emoji. |
| `app/(tabs)/deals.tsx:135,175,402,372` | 🔥 ⚡ ⚠️ | Looks like a consumer chat, not a marketplace. |
| `app/orders/[id].tsx:376,501` | 🔒 🚚 | Order-tracking status rendered as emoji. |
| `app/checkout.tsx:189`, `cart.tsx:144/173`, `FilterSheet.tsx:172/191/202`, `feedback.tsx:55`, `otp.tsx:195`, `AddressStep.tsx:185`, `DeliveryStep.tsx:136`, `ReturnRequestSheet.tsx:145`, `ReviewStep.tsx:240`, `OrderConfirmation.tsx:104` | ✓ | Checkmarks should be `Icon name="checkmark"`, not a glyph. |
| `app/category/[id].tsx:259`, `InvoiceView.tsx:48` | ✕ | Close/clear should be `Icon name="close"`. |

### 4.2 Repeated emoji error/empty states

The "confused face" 😕 is the empty/error icon in at least five screens — `wishlist.tsx:245`, `product/[id].tsx:231`, `orders/[id].tsx:434`, `profile.tsx:211`, `CategoryResults.tsx:137` — alongside 📭 (`product:244`, `CategoryResults:164`), 🔍 (`CategoryResults:193`), and 📦 used as a product image placeholder (`cart.tsx:178`, `EmptyCart.tsx:95`, `ImageGallery.tsx:61`, `ReviewStep.tsx:146`, `CategoryResults.tsx:262`). The `@chinooz/ui` `EmptyState` component is already imported in several of these files but is being passed an emoji as its `icon`.

### 4.3 Star ratings & hearts as glyphs

`★`/`☆` are hardcoded for ratings in `ProductInfo.tsx` (L54/111), `HomeProductCard.tsx` (L199), `WriteReviewSheet.tsx` (L176), `ReviewsSection.tsx` (L22), `FilterSheet.tsx` (L151), `deals.tsx` (L113), `CategoryResults.tsx` (L268) — even though `@chinooz/ui` ships a `Rating`/`StarRating` component. Wishlist hearts `♥`/`♡` are glyphs too (`wishlist.tsx:119/253`).

### 4.4 Other glyph icons

💬/✉️/📞 contact methods (`contact.tsx:20/29/38`), 📷 photo (`feedback.tsx:95`, `WriteReviewSheet.tsx:236`, `ReviewsSection.tsx:216`), 👍 helpful (`ReviewsSection.tsx:273`), 📄/🧾 receipts (`OrderConfirmation.tsx:211/212`), 🏪 store (`seller/[id].tsx:174`), 🔧 filter / ↕ sort (`category/[id].tsx:221/236`).

### 4.5 Debatable (your call)

`app/language.tsx:16–17` uses 🇬🇧 / 🇳🇵 flags for English/Nepali. Flags-as-language is a common pattern but is widely discouraged (a flag denotes a country, not a language) and the flag emoji notably **fails to render on many Android builds**. Consider a text toggle ("EN" / "ने") or the Ionicons globe.

### Recommendation

1. Replace every UI emoji with the existing `Icon` component (Ionicons has direct equivalents: `checkmark`, `close`, `lock-closed`, `car`/`bicycle`, `cash-outline`, `cube-outline`, `chatbubble`, `mail`, `call`, `flame`, `flash`, `warning`, `search`, `storefront`, `options`/`funnel`, `swap-vertical`).
2. Route all rating stars through `@chinooz/ui` `Rating`, all empty/error states through `EmptyState` with an `Icon`, and product image fallbacks through `SafeImage`'s placeholder.
3. Replace the 🛍️ About "logo" and 💵💚💜 payment icons with real brand/payment-provider assets (eSewa/Khalti have official marks).
4. Add a lint rule banning emoji in JSX text (see below) so this can't regress.

---

## Cross-cutting — the system exists, it's just bypassed

The encouraging part: you don't need to *invent* a design language — you need to *enforce* the one already in `packages/theme` + `packages/ui`. Two guardrails stop the drift from returning:

```js
// .eslintrc — illustrative
rules: {
  // 1) No emoji in source (catches Finding 4)
  'no-restricted-syntax': [
    'warn',
    { selector: "Literal[value=/[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2190}-\\u{21FF}\\u{2B00}-\\u{2BFF}]/u]",
      message: 'Use the <Icon> component instead of emoji.' },
  ],
  // 2) Nudge toward the shared Button (catches Finding 2)
  //    e.g. a custom rule / restricted-import that flags new TouchableOpacity
  //    used as a primary button outside packages/ui.
}
```

Plus: prefer `duration.*`, `easing.*`, `radii.*`, and named spring presets over numeric literals — a `no-magic-numbers`-style rule scoped to style objects helps here.

---

## Prioritized action plan

| # | Action | Finding | Effort | Priority |
|---|---|---|---|---|
| 1 | Set `animation: 'fade'` as the global `Stack` default in `app/_layout.tsx`; delete the ~18 `slide_from_right` overrides | 1 | **XS** (one file) | 🔴 P0 |
| 2 | Replace emoji on the **checkout/payments** and **About logo** with `Icon`/real assets | 4 | S | 🔴 P0 |
| 3 | Migrate empty/error states (😕/📭/📦) to `EmptyState` + `Icon` | 4 | S | 🔴 P0 |
| 4 | Adopt `@chinooz/ui` `Button`/`IconButton` for all primary & secondary CTAs; define one CTA spec | 2 | M–L | 🔴 P0 |
| 5 | Replace remaining emoji (stars→`Rating`, checks/close→`Icon`, etc.) | 4 | M | 🟠 P1 |
| 6 | Export spring presets + replace hardcoded `duration`/`easing` with tokens | 3 | M | 🟠 P1 |
| 7 | Replace hardcoded `borderRadius` numbers with `radii.*` | 2 | S | 🟡 P2 |
| 8 | Add ESLint guards (no-emoji, no raw-CTA, no magic radii/durations) | all | S | 🟡 P2 |

**Suggested first PR (highest impact, lowest risk):** Action 1 alone converts the entire app from slide to fade in a single file — it directly delivers your top request and is trivially reversible.

---

## Appendix — how the evidence was gathered

- Navigation/transitions: read `app/_layout.tsx` and `app/(tabs)/_layout.tsx` directly.
- Buttons: `grep` for `@chinooz/ui` imports (Button = 0 hits), `TouchableOpacity|Pressable` (554 across 65 files), plus full reads of `checkout.tsx`, `cart.tsx`, `EmptyCart.tsx`, `phone-entry.tsx`, `feedback.tsx`, `product/[id].tsx`, and `grep` of `height:`, `borderRadius:`, `activeOpacity=` style values.
- Animation/easing: `grep` of `duration:\s*\d+`, `Easing\.`, `withSpring(` across the app; cross-checked against `packages/theme/motion.ts`.
- Emojis: unicode-range `ripgrep` across all `.ts/.tsx` (72 lines / 32 files), cross-checked against `components/Icon.tsx` usage (36 files / 143 usages).
- Tokens: read `packages/theme/{motion,radii,colors,shadows,typography}.ts` and `tokens.js`, and `packages/ui/{Button,IconButton,Animate,AnimatedList,Screen}.tsx`.
