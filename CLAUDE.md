# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`).

- `pnpm dev` — start Vite dev server with HMR
- `pnpm build` — type-check (`tsc -b`) then production build
- `pnpm lint` — run oxlint over the repo
- `pnpm format` — format with oxfmt
- `pnpm format:check` — check formatting without writing
- `pnpm preview` — serve the production build locally

There is no test runner configured.

## Architecture

A single-page, client-only PDF compression UI. React 19 + TypeScript + Vite 8, styled with Tailwind CSS v4.

### State machine

`src/App.tsx` is the single source of truth. The whole UI is driven by one `AppState` value: `'idle' | 'fileSelected' | 'compressing' | 'done'`. App owns all state (selected `file`, `quality`, `compressedSize`, `isDark`) and passes data + callbacks down to presentational components in `src/components/`. The components are stateless and never lift their own state.

Dark mode is applied by toggling the `dark` class on `document.documentElement` in a `useEffect`; Tailwind's `dark:` variants key off it.

### Compression (real, client-side, hand-written — no dependencies)

`handleCompress` in `App.tsx` calls `compressPdf(file, quality)` (`src/lib/compressPdf.ts`), which runs a **from-scratch PDF parser/optimizer in a Web Worker** (`src/workers/compress.worker.ts`). No third-party libraries — only browser-native Web APIs (`CompressionStream`, `OffscreenCanvas`, `createImageBitmap`, File System Access). Nothing is uploaded.

The engine lives in `src/lib/pdf/`:

- `object.ts` — PDF object model (names, refs, strings, dicts, streams).
- `lexer.ts` — tolerant tokenizer/parser for the eight object types.
- `document.ts` — xref (classic tables **and** xref streams), `/Prev` chains, hybrid files, object streams; lazy, cached `getObject`. Detects `/Encrypt` and refuses (encrypted PDFs are unsupported).
- `filters.ts` / `flate.ts` — FlateDecode via native `CompressionStream('deflate')` + PNG/TIFF predictors.
- `optimize.ts` — **lossless**: deflate uncompressed streams; **lossy**: downsample + JPEG-recompress images. Skips `/SMask`/`/Mask` targets to preserve transparency, and copies through anything it doesn't understand (JBIG2, CCITT, JPX, Indexed, …).
- `image.ts` — browser-only image recoder (OffscreenCanvas → JPEG) injected into `optimize`; per-preset max edge + JPEG quality.
- `serialize.ts` — rewrites every object uncompressed with a fresh classic xref; drops the old ObjStm/XRef containers.

Quality presets map to image targets in `image.ts`: `screen` (1000px / q0.5), `ebook` (1600px / q0.72), `print` (2500px / q0.82).

Two output modes (`compressPdf.ts`): files ≥250MB stream straight to disk via the File System Access API (Chrome/Edge only); smaller files come back as a Blob for download. In download mode the worker never returns a file larger than the input (`usedOriginal`). `ResultsCard` renders both modes.

**Known limitations (v1):** input is read fully into memory (practical ceiling ~1.5–2GB; a windowed Blob-slice source is the future upgrade for multi-GB); encrypted PDFs unsupported; image downsampling caps pixel dimensions rather than computing true on-page dpi.

### Design system → Tailwind theme

This is the most important thing to understand before touching styles.

- `DESIGN.md` is the canonical design spec (Material-style color roles, typography scale, spacing, radii). Its YAML frontmatter is the source of truth for the visual language.
- `src/index.css` translates that spec into a Tailwind v4 **CSS-first** `@theme` block (no `tailwind.config.js`). Each token becomes a CSS variable, e.g. `--color-on-surface`, `--font-size-headline-lg`, `--spacing-section-gap`.
- Those variables generate the custom utility classes used throughout the components: `text-on-surface`, `bg-surface-container-high`, `text-headline-lg`, `text-label-md`, `px-padding-md`, `space-y-section-gap`, etc.

When changing the look, edit the `@theme` tokens rather than hardcoding hex values or pixel sizes in components. Keep `DESIGN.md` and the `@theme` block in sync. A few base styles and one-off classes (`.drop-zone-active`, `.progress-fill`, Inter font) live in `@layer base` in `index.css`.

### Build specifics

`vite.config.ts` enables the **React Compiler** (via `@rolldown/plugin-babel` + `reactCompilerPreset`) and the Tailwind Vite plugin. The React Compiler auto-memoizes components, so manual `useMemo`/`useCallback` is generally unnecessary. Note it adds build/dev overhead.
