import type { DecodedImage, ImageRecoder, Quality, RecodedImage } from './optimize'

// Per-preset image targets. Without page-layout analysis we can't know an image's
// effective on-page dpi, so we approximate: cap the longest edge (assuming roughly
// full-page images, the common case for big/scanned PDFs) and pick a JPEG quality.
const PRESETS: Record<Quality, { maxEdge: number; quality: number }> = {
  screen: { maxEdge: 1000, quality: 0.5 },
  ebook: { maxEdge: 1600, quality: 0.72 },
  print: { maxEdge: 2500, quality: 0.82 },
}

// Guard against pathologically large bitmaps blowing up memory on huge PDFs.
const MAX_PIXELS = 40_000_000

/**
 * Browser-only image recoder (OffscreenCanvas / createImageBitmap). Decodes an
 * image, optionally downscales it, and re-encodes it as JPEG. Returns null to
 * leave the original untouched.
 */
export const recodeImage: ImageRecoder = async (
  img: DecodedImage,
  quality: Quality,
): Promise<RecodedImage | null> => {
  if (img.width * img.height > MAX_PIXELS) return null

  const bitmap = await toBitmap(img)
  if (!bitmap) return null

  const preset = PRESETS[quality]
  const scale = Math.min(1, preset.maxEdge / Math.max(img.width, img.height))
  const tw = Math.max(1, Math.round(img.width * scale))
  const th = Math.max(1, Math.round(img.height * scale))

  const canvas = new OffscreenCanvas(tw, th)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return null
  }
  ctx.drawImage(bitmap, 0, 0, tw, th)
  bitmap.close()

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: preset.quality })
  const jpeg = new Uint8Array(await blob.arrayBuffer())
  return { jpeg, width: tw, height: th }
}

async function toBitmap(img: DecodedImage): Promise<ImageBitmap | null> {
  if (img.jpeg) {
    try {
      return await createImageBitmap(new Blob([img.jpeg as BlobPart]))
    } catch {
      return null
    }
  }
  if (img.samples && img.components) {
    const { width, height, samples, components } = img
    const rgba = new Uint8ClampedArray(width * height * 4)
    if (components === 3) {
      for (let i = 0, j = 0; i < width * height; i++) {
        rgba[j++] = samples[i * 3]
        rgba[j++] = samples[i * 3 + 1]
        rgba[j++] = samples[i * 3 + 2]
        rgba[j++] = 255
      }
    } else {
      for (let i = 0, j = 0; i < width * height; i++) {
        const g = samples[i]
        rgba[j++] = g
        rgba[j++] = g
        rgba[j++] = g
        rgba[j++] = 255
      }
    }
    try {
      return await createImageBitmap(new ImageData(rgba, width, height))
    } catch {
      return null
    }
  }
  return null
}
