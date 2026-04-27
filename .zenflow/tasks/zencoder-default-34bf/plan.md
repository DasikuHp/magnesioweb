# MSI Sport Scrollytelling Landing Page

## Implementation Plan

### [x] Step 1: Project Setup
- Initialized Next.js 14 App Router project with TypeScript, Tailwind CSS, and Framer Motion
- Created `.gitignore`, `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.mjs`
- Installed all dependencies

### [x] Step 2: Asset Pipeline
- Copied 140 frame sequence from `old-assets/ezgif-frame-*.jpg` → `public/sequence/frame_N.jpg` (0-indexed)
- Copied product images to `public/images/` (bottles, packs, lifestyle photos)

### [x] Step 3: Core Implementation
- `app/globals.css` — Tailwind base, Inter font, custom dark minimal scrollbar
- `app/layout.tsx` — Root layout with metadata
- `components/ScrollytellingCanvas.tsx` — Scroll-linked canvas animation with:
  - 140-frame preloader with animated progress bar loading screen
  - useScroll + useSpring (stiffness:100, damping:30) for buttery interpolation
  - Canvas draw with devicePixelRatio support and "contain" fit scaling
  - 4 scrollytelling beats with useTransform opacity/y motion:
    - Beat A (0–20%): "MAGNESIO" centered hero
    - Beat B (25–45%): "3× más rápida" left-aligned
    - Beat C (50–70%): "Músculos. Huesos. Mente." right-aligned
    - Beat D (75–95%): "14,90€" centered CTA
  - "Scroll para explorar" hint that fades at 10% progress
  - Proper cleanup (RAF cancellation, listener removal)
- `app/page.tsx` — Full page with:
  - Fixed nav bar (blur backdrop)
  - ScrollytellingCanvas (dynamic import, no SSR)
  - Products section (3 products with real images)
  - Packs section (1/4/6 units pricing)
  - Benefits section with lifestyle photography
  - Lifestyle grid
  - Newsletter band
  - Footer

### [x] Step 4: Build Verification
- `npm run build` — ✅ compiled clean
- `npx tsc --noEmit` — ✅ zero TypeScript errors
- Dev server running at http://localhost:3000
