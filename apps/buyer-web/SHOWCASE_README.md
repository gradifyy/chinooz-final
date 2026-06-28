# Chinooz Showcase Landing Page

A premium, motion-polished marketing landing page for Chinooz — Nepal's fastest marketplace app.

## 🎯 Overview

The showcase page (`/showcase`) is a full-stack marketing site featuring:

- **App Showcase**: Interactive device gallery with embla carousel, feature callouts, and floating UI snippets
- **Bento Features Grid**: Responsive grid with cursor-aware tilt and hover micro-interactions
- **Built for Nepal**: Stats count-ups and Nepal-first messaging
- **Waitlist Signup**: Multi-field form with validation, loading/success states, and confetti celebration
- **App Download**: CTA with App Store/Google Play badges and QR code option
- **Social Proof**: Testimonials, trust stats, and verified badge
- **FAQ**: Accessible accordion with JSON-LD schema

## 🚀 Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Run development server
cd apps/buyer-web
npm run dev

# Visit http://localhost:3000/showcase
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🎨 Motion Language

All animations use a centralized motion system (`lib/motion.ts`) with:

- **Consistent tokens**: `fast` (0.2s), `normal` (0.4s), `slow` (0.6s), `slower` (0.8s)
- **Easing curves**: `easeOut`, `easeInOut`, `easeOutBack`, `easeOutQuart`
- **Reusable variants**: `reveal`, `stagger`, `fadeRise`, `scaleIn`, `parallax`
- **Premium touches**: Magnetic buttons, cursor-aware tilt, smooth scroll (Lenis), scroll progress indicator

### Reduced Motion

All animations respect `prefers-reduced-motion` preference. Users with this setting enabled see:
- Static layouts (no parallax/tilt)
- Instant transitions (no animations)
- Minimal fade-in for content reveal
- Disabled Lenis smooth scroll

## 📝 Internationalization (i18n)

Full support for English and Nepali:

- **Translations**: `packages/i18n/locales/en.json` and `ne.json`
- **Hook**: `useTranslation()` from `react-i18next`
- **Language toggle**: Available in header (if implemented)
- **Devanagari rendering**: Correctly configured for Nepali text

All new sections have complete EN + NE translations.

## 📋 Waitlist Integration

### Current Implementation

The waitlist uses a **mock backend** in `lib/waitlist-submit.ts`:

```typescript
export async function submitWaitlist(formData: WaitlistFormData): Promise<WaitlistResponse>
```

- Simulates 1.5-2.5s network latency
- 95% success rate (5% random failures for testing)
- Returns mock response with ID and timestamp

### Connecting a Real Backend

To plug in Supabase, Resend, Mailchimp, or your own API:

1. Update `lib/waitlist-submit.ts`:

```typescript
export async function submitWaitlist(formData: WaitlistFormData): Promise<WaitlistResponse> {
  const response = await fetch(process.env.NEXT_PUBLIC_WAITLIST_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WAITLIST_API_KEY}`,
    },
    body: JSON.stringify(formData),
  })

  if (!response.ok) {
    throw new Error('Waitlist submission failed')
  }

  return response.json()
}
```

2. Add environment variables to `.env.local`:

```env
NEXT_PUBLIC_WAITLIST_API_URL=https://api.chinooz.com/waitlist
WAITLIST_API_KEY=your-secret-key
```

3. Update `WaitlistSignup.tsx` if needed for additional fields or validation.

## 🎬 Component Structure

```
components/showcase/
├── AppShowcase.tsx           # Device gallery with carousel
├── BentoFeaturesGrid.tsx     # Responsive features grid
├── BuiltForNepal.tsx         # Nepal-first section with stats
├── WaitlistSignup.tsx        # Multi-field form + celebration
├── AppDownload.tsx           # App store badges + QR code
├── SocialProof.tsx           # Testimonials + trust stats
├── FAQ.tsx                   # Accessible accordion + schema
├── MagneticButton.tsx        # Cursor-aware button
├── TiltCard.tsx              # 3D tilt on hover
├── ScrollProgress.tsx        # Top progress bar
├── LenisScroll.tsx           # Smooth scroll provider
├── PhoneFrame.tsx            # Device frame wrapper
└── index.ts                  # Exports

lib/
├── motion.ts                 # Centralized motion variants & tokens
└── waitlist-submit.ts        # Waitlist form logic (mock/real)
```

## 🔍 SEO & Metadata

- **Title & Description**: Optimized for search engines
- **Open Graph**: Social media sharing with preview image
- **Twitter Card**: Custom Twitter preview
- **JSON-LD Schema**: Organization + WebSite + FAQ structured data
- **Sitemap**: `public/sitemap.xml`
- **Robots.txt**: `public/robots.txt`
- **Canonical URL**: Set in metadata

## ♿ Accessibility

- **ARIA labels**: All interactive elements labeled
- **Keyboard navigation**: Full keyboard support (Tab, Enter, Escape)
- **Focus management**: Visible focus rings on all interactive elements
- **Screen reader friendly**: Semantic HTML, proper heading hierarchy
- **Color contrast**: AA+ WCAG compliance
- **Reduced motion**: Complete fallback for all animations
- **Form validation**: Inline error messages with `aria-invalid` and `aria-describedby`

## 📊 Performance

- **Images**: Optimized with `next/image`, AVIF/WebP formats, correct sizes
- **Fonts**: System fonts (no external font requests)
- **Code splitting**: Dynamic imports for below-fold sections
- **Bundle**: Lenis (~8KB), Framer Motion (~40KB) lazy-loaded
- **Lighthouse targets**: ≥95 across Performance, Accessibility, SEO, Best Practices

## 🌍 Responsive Design

Tested at breakpoints:
- **360px**: Mobile
- **768px**: Tablet
- **1024px**: Small desktop
- **1280px**: Desktop
- **1440px**: Large desktop

All sections reflow cleanly with Tailwind CSS responsive utilities.

## 🛠️ Configuration

### Tailwind CSS

Showcase components use custom Tailwind utilities defined in `app/globals.css`:

```css
@layer utilities {
  .showcase-reveal { /* ... */ }
  .showcase-parallax { /* ... */ }
  /* etc. */
}
```

### Next.js Config

Image optimization configured in `next.config.js`:

```javascript
images: {
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  formats: ['image/webp', 'image/avif'],
}
```

## 📚 Dependencies

- **framer-motion**: Animation library
- **react-i18next**: Internationalization
- **lenis**: Smooth scroll
- **embla-carousel-react**: Carousel component
- **next/image**: Image optimization

## 🚢 Deployment

1. **Build**: `npm run build`
2. **Test**: `npm run start` (locally)
3. **Deploy**: Push to your hosting (Vercel, AWS, etc.)

The showcase page is production-ready and optimized for performance and SEO.

## 📝 Notes

- **Placeholder content**: Testimonials, stats, and images are placeholders — replace with real data
- **Feature flags**: Use `NEXT_PUBLIC_ENABLE_MOTION` and `NEXT_PUBLIC_ENABLE_SMOOTH_SCROLL` to toggle features
- **No secrets**: All environment variables are public (`NEXT_PUBLIC_*`) or server-only (never exposed to client)

## 🤝 Contributing

When adding new sections:

1. Create motion variants in `lib/motion.ts` if needed
2. Use `useTranslation()` for all text (add keys to `packages/i18n/locales/*.json`)
3. Test with `prefers-reduced-motion` enabled
4. Ensure ARIA labels and semantic HTML
5. Optimize images with `next/image`
6. Add TypeScript types for all props

## 📞 Support

For questions or issues, reach out to the Chinooz team at hello@chinooz.com.

---

**Built with ❤️ for Nepal** 🇳🇵
