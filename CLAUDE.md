# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`).

- `pnpm dev` — start Vite dev server with HMR
- `pnpm build` — type-check (`tsc -b`) then production build
- `pnpm lint` — run ESLint over the repo
- `pnpm preview` — serve the production build locally

There is no test runner configured.

## Architecture

A single-page, client-only PDF compression UI. React 19 + TypeScript + Vite 8, styled with Tailwind CSS v4.

### State machine

`src/App.tsx` is the single source of truth. The whole UI is driven by one `AppState` value: `'idle' | 'fileSelected' | 'compressing' | 'done'`. App owns all state (selected `file`, `quality`, `compressedSize`, `isDark`) and passes data + callbacks down to presentational components in `src/components/`. The components are stateless and never lift their own state.

Dark mode is applied by toggling the `dark` class on `document.documentElement` in a `useEffect`; Tailwind's `dark:` variants key off it.

### Compression is mocked

`handleCompress` in `App.tsx` does **not** actually process a PDF. It runs a 2s `setTimeout` and computes a fake result (`originalSize * 0.37`). Real PDF compression has not been implemented — when adding it, replace this stub. The app is described as "100% private — processed in your browser," so any implementation should stay client-side.

### Design system → Tailwind theme

This is the most important thing to understand before touching styles.

- `DESIGN.md` is the canonical design spec (Material-style color roles, typography scale, spacing, radii). Its YAML frontmatter is the source of truth for the visual language.
- `src/index.css` translates that spec into a Tailwind v4 **CSS-first** `@theme` block (no `tailwind.config.js`). Each token becomes a CSS variable, e.g. `--color-on-surface`, `--font-size-headline-lg`, `--spacing-section-gap`.
- Those variables generate the custom utility classes used throughout the components: `text-on-surface`, `bg-surface-container-high`, `text-headline-lg`, `text-label-md`, `px-padding-md`, `space-y-section-gap`, etc.

When changing the look, edit the `@theme` tokens rather than hardcoding hex values or pixel sizes in components. Keep `DESIGN.md` and the `@theme` block in sync. A few base styles and one-off classes (`.drop-zone-active`, `.progress-fill`, Inter font) live in `@layer base` in `index.css`.

### Build specifics

`vite.config.ts` enables the **React Compiler** (via `@rolldown/plugin-babel` + `reactCompilerPreset`) and the Tailwind Vite plugin. The React Compiler auto-memoizes components, so manual `useMemo`/`useCallback` is generally unnecessary. Note it adds build/dev overhead.
