---
name: Efficient Compression
colors:
  surface: "#fbf8ff"
  surface-dim: "#dad9e3"
  surface-bright: "#fbf8ff"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f4f2fd"
  surface-container: "#eeedf7"
  surface-container-high: "#e8e7f1"
  surface-container-highest: "#e3e1ec"
  on-surface: "#1a1b22"
  on-surface-variant: "#464553"
  inverse-surface: "#2f3038"
  inverse-on-surface: "#f1effa"
  outline: "#777585"
  outline-variant: "#c7c4d6"
  surface-tint: "#4e4ec9"
  primary: "#4241bc"
  on-primary: "#ffffff"
  primary-container: "#5b5bd6"
  on-primary-container: "#edeaff"
  inverse-primary: "#c1c1ff"
  secondary: "#5654a8"
  on-secondary: "#ffffff"
  secondary-container: "#a7a5ff"
  on-secondary-container: "#393689"
  tertiary: "#804300"
  on-tertiary: "#ffffff"
  tertiary-container: "#a35700"
  on-tertiary-container: "#ffe8d9"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#e2dfff"
  primary-fixed-dim: "#c1c1ff"
  on-primary-fixed: "#0a006b"
  on-primary-fixed-variant: "#3533b0"
  secondary-fixed: "#e2dfff"
  secondary-fixed-dim: "#c3c0ff"
  on-secondary-fixed: "#100563"
  on-secondary-fixed-variant: "#3e3c8f"
  tertiary-fixed: "#ffdcc3"
  tertiary-fixed-dim: "#ffb77e"
  on-tertiary-fixed: "#2f1500"
  on-tertiary-fixed-variant: "#6e3900"
  background: "#fbf8ff"
  on-background: "#1a1b22"
  surface-variant: "#e3e1ec"
dark-colors:
  surface: "#12131a"
  surface-dim: "#12131a"
  surface-bright: "#373845"
  surface-container-lowest: "#0d0e15"
  surface-container-low: "#1a1b22"
  surface-container: "#1e1f27"
  surface-container-high: "#282931"
  surface-container-highest: "#33343c"
  on-surface: "#e4e1ec"
  on-surface-variant: "#c7c4d6"
  inverse-surface: "#e4e1ec"
  inverse-on-surface: "#2f3038"
  outline: "#918fa0"
  outline-variant: "#464553"
  surface-tint: "#c1c1ff"
  primary: "#c1c1ff"
  on-primary: "#1d1b92"
  primary-container: "#3533b0"
  on-primary-container: "#e2dfff"
  inverse-primary: "#4241bc"
  secondary: "#c3c0ff"
  on-secondary: "#241f82"
  secondary-container: "#3e3c8f"
  on-secondary-container: "#e2dfff"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  background: "#12131a"
  on-background: "#e4e1ec"
  surface-variant: "#464553"
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "600"
    lineHeight: "1.3"
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: "0"
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0"
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0"
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "600"
    lineHeight: "1"
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "500"
    lineHeight: "1"
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max-width: 640px
  section-gap: 2rem
  element-gap: 1rem
  padding-sm: 0.75rem
  padding-md: 1.5rem
  padding-lg: 2rem
---

## Brand & Style

The design system is centered on utility, clarity, and speed. It targets users who need to perform a singular, important task—reducing file size—without the distraction of unnecessary visual flair. The brand personality is efficient, reliable, and invisible.

The visual style is **Minimalist** with a focus on functional clarity. It utilizes a flat aesthetic characterized by ample whitespace, soft gray borders for structural definition, and subtle elevation to distinguish interactive surfaces. There are no gradients or decorative shadows; depth is communicated through thin outlines and slight tonal shifts.

## Colors

The palette is dominated by a purposeful **Indigo** (#5B5BD6) used exclusively for primary actions and brand presence. The interface relies on a grayscale spectrum to manage hierarchy.

The system supports both light and dark modes via `prefers-color-scheme`. In light mode, the background is pure white with light gray borders. In dark mode, the interface shifts to a deep charcoal/black palette, maintaining the same indigo primary color but adjusting the neutral values to ensure accessibility and reduce eye strain. High-contrast text is prioritized to ensure readability of file names and metadata.

## Typography

The design system utilizes **Inter** (System Sans-Serif) to maintain a utilitarian, technical feel that performs exceptionally well across all screen resolutions.

Type scale is used to create a clear information hierarchy:

- **Headlines** are bold and tight to anchor the page.
- **Body text** uses a generous line height to ensure legibility when reading instructions or file details.
- **Labels** are used for metadata (e.g., file sizes, compression percentages) and button text, often utilizing a slightly heavier weight for quick scanning.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy centered on the screen. The maximum width of the content area is strictly capped at **640px** to maintain focus and prevent the UI from feeling sparse on large monitors.

Vertical spacing is disciplined, using a 4px/8px baseline rhythm. On mobile, margins reduce to 16px, but the 640px container remains centered on tablet and desktop. The "Drop Zone" for files is the primary focal point and occupies the full width of the container.

## Elevation & Depth

This design system uses **Tonal Layers** and **Low-Contrast Outlines** instead of heavy shadows.

- **Level 0 (Background):** Pure white (light) or deep black (dark).
- **Level 1 (Cards/Containers):** Defined by a 1px border (#E4E4E7 in light) and a very subtle, diffused shadow (0px 1px 3px rgba(0,0,0,0.05)).
- **Level 2 (Active/Hover):** When a file is dragged over the tool or a card is hovered, the border color shifts to the primary Indigo and the background gains a faint indigo tint.

Depth is used to suggest "stacking" of files within the queue, using subtle 2px offsets to imply multiple pages or documents.

## Shapes

The shape language is modern and approachable without being overly playful. A **Rounded** (0.5rem) corner radius is applied to all main UI components like cards and input fields. Primary buttons use a slightly more pronounced rounding or pill-shape to distinguish them as the main call to action.

## Components

- **Buttons:** Primary buttons are solid Indigo with white text. Secondary buttons are ghost-style with a soft gray border.
- **Upload Drop-Zone:** A large, dashed-border container. Upon "hovering" a file, the border turns solid Indigo and the background becomes a 5% opacity Indigo.
- **File List Items:** Horizontal rows with a file icon, name, size, and a "remove" button. Separation is handled by thin horizontal rules.
- **Progress Bars:** Thin, 4px tall lines. The track is a light gray, and the filler is the primary Indigo. No animation except for the width transition.
- **Chips:** Used for "Ready" or "Compressed" status indicators. Small, low-contrast background with bold labels.
- **Input Fields:** Minimalist with a 1px border. Focus state is indicated by an Indigo border and a 2px outer glow (ring).
