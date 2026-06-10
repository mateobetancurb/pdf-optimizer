import type { PdfDocument } from './document'
import { deflate } from './flate'
import { asArray, filterName } from './filters'
import {
  PdfName,
  PdfRef,
  PdfStream,
  isName,
  type PdfObject,
} from './object'

export type Quality = 'screen' | 'ebook' | 'print'

// A decoded image handed to the (browser-injected) recoder: either ready JPEG
// bytes (DCTDecode source) or raw 8-bit samples with a component count.
export interface DecodedImage {
  width: number
  height: number
  jpeg?: Uint8Array
  samples?: Uint8Array
  components?: number
}

export interface RecodedImage {
  jpeg: Uint8Array
  width: number
  height: number
}

// Implemented in image.ts (uses OffscreenCanvas, so browser-only). Returns null
// to leave the image untouched.
export type ImageRecoder = (img: DecodedImage, quality: Quality) => Promise<RecodedImage | null>

export interface OptimizeOptions {
  quality: Quality
  recodeImage?: ImageRecoder
  onProgress?: (done: number, total: number) => void
}

export interface OptimizeStats {
  imagesRecoded: number
  streamsDeflated: number
  bytesSavedImages: number
}

const MIN_DEFLATE = 48 // not worth compressing tiny streams

/**
 * Mutate `doc`'s objects in place: recompress uncompressed streams with deflate,
 * and (if a recoder is supplied) downsample/recompress images. Anything we don't
 * understand is left exactly as-is, so the document stays valid.
 */
export async function optimize(doc: PdfDocument, options: OptimizeOptions): Promise<OptimizeStats> {
  const stats: OptimizeStats = { imagesRecoded: 0, streamsDeflated: 0, bytesSavedImages: 0 }
  const nums = [...doc.xref.keys()]
  const maskTargets = await collectMaskTargets(doc, nums)

  let done = 0
  for (const num of nums) {
    const obj = await doc.getObject(num)
    if (obj instanceof PdfStream) {
      if (isImage(obj)) {
        if (options.recodeImage && !maskTargets.has(num)) {
          await tryRecodeImage(doc, obj, options.recodeImage, options.quality, stats)
        }
      } else if (!hasFilter(obj)) {
        await tryDeflate(obj, stats)
      }
    }
    options.onProgress?.(++done, nums.length)
  }
  return stats
}

function isImage(s: PdfStream): boolean {
  return isName(s.dict.get('Subtype'), 'Image')
}

function hasFilter(s: PdfStream): boolean {
  const f = s.dict.get('Filter') ?? s.dict.get('F')
  return f !== undefined && asArray(f).length > 0
}

async function tryDeflate(stream: PdfStream, stats: OptimizeStats): Promise<void> {
  if (stream.raw.length < MIN_DEFLATE) return
  const packed = await deflate(stream.raw)
  if (packed.length < stream.raw.length) {
    stream.raw = packed
    stream.dict.set('Filter', new PdfName('FlateDecode'))
    stream.dict.delete('DecodeParms')
    stream.dict.delete('DP')
    stats.streamsDeflated++
  }
}

async function tryRecodeImage(
  doc: PdfDocument,
  stream: PdfStream,
  recode: ImageRecoder,
  quality: Quality,
  stats: OptimizeStats,
): Promise<void> {
  const dict = stream.dict
  if (dict.get('ImageMask') === true) return
  if (dict.get('Decode') !== undefined) return // custom decode arrays can invert colours

  const width = numProp(dict, 'Width')
  const height = numProp(dict, 'Height')
  if (!width || !height) return

  const filters = asArray(dict.get('Filter') ?? dict.get('F')).map(filterName)
  const last = filters[filters.length - 1]

  let input: DecodedImage | null
  if (last === 'DCTDecode' || last === 'DCT') {
    // The raw bytes already are a JPEG (after any earlier filters, which are rare
    // here). Hand them straight to the decoder.
    input = { width, height, jpeg: stream.raw }
  } else if (last === 'FlateDecode' || last === 'Fl') {
    const bpc = numProp(dict, 'BitsPerComponent')
    if (bpc !== 8) return
    const components = await resolveComponents(doc, dict.get('ColorSpace'))
    if (components !== 1 && components !== 3) return
    const samples = await doc.decodeFlate(stream)
    if (samples.length < width * height * components) return
    input = { width, height, samples, components }
  } else {
    return // JPXDecode, JBIG2Decode, CCITTFaxDecode, etc. — leave untouched
  }

  const result = await recode(input, quality)
  if (!result || result.jpeg.length >= stream.raw.length) return

  stats.bytesSavedImages += stream.raw.length - result.jpeg.length
  stats.imagesRecoded++

  stream.raw = result.jpeg
  dict.set('Filter', new PdfName('DCTDecode'))
  dict.set('Width', result.width)
  dict.set('Height', result.height)
  dict.set('BitsPerComponent', 8)
  dict.set('ColorSpace', new PdfName('DeviceRGB'))
  dict.delete('DecodeParms')
  dict.delete('DP')
}

// Images referenced by another image's /SMask or /Mask carry transparency; we
// never lossily recode those (JPEG can't hold alpha and would band the mask).
async function collectMaskTargets(doc: PdfDocument, nums: number[]): Promise<Set<number>> {
  const targets = new Set<number>()
  for (const num of nums) {
    const obj = await doc.getObject(num)
    if (obj instanceof PdfStream && isImage(obj)) {
      for (const key of ['SMask', 'Mask']) {
        const ref = obj.dict.get(key)
        if (ref instanceof PdfRef) targets.add(ref.num)
      }
    }
  }
  return targets
}

async function resolveComponents(doc: PdfDocument, cs: PdfObject | undefined): Promise<number> {
  const resolved = cs instanceof PdfRef ? await doc.getObject(cs) : cs
  if (resolved instanceof PdfName) {
    if (resolved.name === 'DeviceRGB' || resolved.name === 'CalRGB') return 3
    if (resolved.name === 'DeviceGray' || resolved.name === 'CalGray') return 1
    if (resolved.name === 'DeviceCMYK') return 4
    return 0
  }
  if (Array.isArray(resolved) && resolved.length) {
    const head = resolved[0]
    if (isName(head, 'ICCBased')) {
      const stm = await doc.resolve(resolved[1])
      if (stm instanceof PdfStream) return numProp(stm.dict, 'N')
    }
    if (head instanceof PdfName) return resolveComponents(doc, head)
  }
  return 0
}

function numProp(dict: Map<string, PdfObject>, key: string): number {
  const v = dict.get(key)
  return typeof v === 'number' ? v : 0
}
