# NTG Lounge — Design System

> Dark-only, neon-glass / aurora aesthetic. Tailwind v4 (CSS-first config).
> Single token source: `src/app/globals.css`. Fonts wired in `src/app/layout.tsx`.

---

## Foundations

**Theme:** dark only (`color-scheme: dark`, no light mode). Base surface is near-black navy; body text is off-white at 92% opacity.

### Color tokens (`@theme`)

| Token | Hex | Role |
|---|---|---|
| `--color-ink` | `#070b14` | page background (also `themeColor`) |
| `--color-ink-soft` | `#0b1120` | raised / secondary surface |
| `--color-brand` | `#5eead4` | teal — primary accent |
| `--color-bio` | `#22d3ee` | cyan |
| `--color-violet` | `#7c3aed` | violet |
| `--color-iris` | `#a855f7` | purple |
| `--color-magenta` | `#d946ef` | magenta |
| `--color-gold` | `#f6c177` | gold (premium / CTA highlight) |

Use as Tailwind classes (`text-brand`, `bg-ink`) or raw `var(--color-brand)`.

### Surfaces & strokes (convention, not tokens)

Glass surfaces are translucent white over the ink background:

- Surface fills: `bg-white/[0.025]` → `bg-white/[0.045]` → `bg-white/[0.05]`
- Borders: `border-white/[0.07]`, hover `border-white/15`
- Text ramp: `text-white` → `/70` → `/60` → `/45` → `/40`

### Typography

- **Display:** Space Grotesk → `font-display` (headings, titles, numbers)
- **Body:** Inter → `font-sans` (default on `body`)
- Both loaded via `next/font/google`, exposed as CSS vars (`--font-space-grotesk`, `--font-inter`).
- **Eyebrow / label pattern** (very common): `text-[10px]/[11px] font-medium uppercase tracking-[0.2em–0.32em] text-white/40`

### Radii

- Cards: `rounded-[1.35rem]`, `rounded-2xl` / `rounded-3xl`
- Pills / badges / scrollbar: `rounded-full` (`999px`)

---

## Utilities (custom `@utility`)

| Class | What it does |
|---|---|
| `glass` | frosted card: blur(16px)+saturate, teal border, layered inner/outer glow shadows |
| `glass-strong` | heavier frost (blur 22px), iris glow, deep drop shadow — modals / prominent panels |
| `cta` | primary button gradient (iris → indigo → cyan) on dark text, with neon glow shadow |
| `text-gradient-brand` | teal → sky → violet → fuchsia clipped text |
| `text-gradient-iris` | violet → purple → magenta clipped text |
| `text-gradient-gold` | gold → cream → lilac clipped text (premium) |
| `text-outline` | hollow stroked text |
| `shine-border` / `shine-border-inner` | animated conic-gradient border (8s rotate via `--angle` `@property`) |
| `aurora` | drifting radial-mesh backdrop (violet / magenta / cyan / teal, 28s) |

---

## Motion

Keyframes / classes:

- `animate-marquee` (32s) & `animate-marquee-slow` (60s), with `.marquee-pause:hover` to pause
- `float-soft` (6s vertical bob)
- `spin-slow` (40s) / `spin-slower` (80s reverse)
- `auroraDrift`, `shineAngle`

**All motion respects `prefers-reduced-motion`** — animations & transitions are cut to ~0.

---

## Global décor

- Fixed ambient radial glow behind everything (`body::before`).
- `.noise` film-grain overlay (SVG turbulence, `mix-blend-overlay`).
- Custom violet → teal scrollbar; purple `::selection`.
- Custom cursor (`CustomCursor`), route progress bar (`RouteProgressBar`).

---

## Component conventions

- **Cards** (`PathCard`): `group` + `rounded-[1.35rem]` + faint white surface; hover lightens border/bg; accent-colored blur glow on hover via `color-mix`; accent passed as prop, defaults to `--color-brand`.
- **Badges** (`StatusBadge`): `rounded-full` pill, `ring-1 ring-inset`, uppercase `tracking-[0.2em]`; semantic color map — live = red + ping dot, open = emerald, upcoming = cyan, hosted = dark red. Note: status badges use raw Tailwind palette colors, **not** the brand tokens.
- **Accessibility:** skip-link, `sr-only` / `focus:not-sr-only`, focus outline uses `--color-brand`.

---

## Gaps / notes

- No separate spacing, shadow, or type-size token scale — those live as repeated Tailwind utilities.
- Ad-hoc surface values (`white/[0.0xx]`) are repeated across components; consider a tokens layer if they start drifting.
