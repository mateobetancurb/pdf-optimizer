# PDF Optimizer

A client-side PDF compression tool built with React 19, TypeScript, and Vite. No uploads — everything runs in the browser.

## Features

- **Three quality presets** — Screen (smallest), Ebook, Print (highest quality)
- **Lossless + lossy compression** — deflates uncompressed streams; downsamples and JPEG-recompresses images
- **Large file support** — files ≥250 MB stream directly to disk via the File System Access API (Chrome/Edge)
- **Dark mode** — toggleable, persisted via Tailwind's `dark:` variants
- **Internationalization** — English and Spanish
- **Privacy-first** — nothing leaves your device; compression runs in a Web Worker

## Getting Started

```bash
pnpm install
pnpm dev
```

Other commands:

```bash
pnpm build          # type-check then production build
pnpm preview        # serve the production build locally
pnpm lint           # run oxlint
pnpm format         # format with oxfmt
pnpm format:check   # check formatting without writing
```

## Architecture

Single-page, client-only. `src/App.tsx` owns all state via a simple machine: `idle → fileSelected → compressing → done`. Presentational components in `src/components/` receive data and callbacks; they hold no state of their own.

### Compression engine (`src/lib/pdf/`)

Hand-written PDF parser and optimizer — no third-party PDF libraries.

| File | Role |
|---|---|
| `object.ts` | PDF object model (names, refs, strings, dicts, streams) |
| `lexer.ts` | Tolerant tokenizer/parser |
| `document.ts` | xref tables + streams, `/Prev` chains, lazy cached `getObject` |
| `filters.ts` / `flate.ts` | FlateDecode via native `CompressionStream` + PNG/TIFF predictors |
| `optimize.ts` | Lossless deflation + lossy image recompression |
| `image.ts` | Browser image recoder (OffscreenCanvas → JPEG) |
| `serialize.ts` | Rewrites objects with a fresh classic xref |

Quality presets map to image targets:

| Preset | Max edge | JPEG quality |
|---|---|---|
| Screen | 1000 px | 0.50 |
| Ebook | 1600 px | 0.72 |
| Print | 2500 px | 0.82 |

**Known limitations:** input is fully read into memory (~1.5–2 GB practical ceiling); encrypted PDFs are unsupported.

### Styling

Design tokens live in `DESIGN.md` (canonical spec) and are translated into a Tailwind v4 `@theme` block in `src/index.css`. Edit tokens there rather than hardcoding values in components.

## Tech Stack

- React 19 (with React Compiler for auto-memoization)
- TypeScript
- Vite 8
- Tailwind CSS v4
- oxlint + oxfmt
