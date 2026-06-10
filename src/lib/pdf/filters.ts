import { isDict, isName, type PdfObject } from "./object";

// PNG/TIFF predictors used by /FlateDecode and /LZWDecode via /DecodeParms.
// Required to read xref streams (almost always Predictor 12) and many Flate
// images.

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export interface PredictorParams {
  predictor: number;
  colors: number;
  bitsPerComponent: number;
  columns: number;
}

export function readPredictorParams(parms: PdfObject | undefined): PredictorParams {
  const p = isDict(parms) ? parms : undefined;
  const num = (k: string, d: number) => {
    const v = p?.get(k);
    return typeof v === "number" ? v : d;
  };
  return {
    predictor: num("Predictor", 1),
    colors: num("Colors", 1),
    bitsPerComponent: num("BitsPerComponent", 8),
    columns: num("Columns", 1),
  };
}

export function applyPredictor(data: Uint8Array, params: PredictorParams): Uint8Array {
  const { predictor, colors, bitsPerComponent, columns } = params;
  if (predictor <= 1) return data;

  const bpp = Math.max(1, Math.ceil((colors * bitsPerComponent) / 8));
  const rowBytes = Math.ceil((colors * bitsPerComponent * columns) / 8);

  // TIFF predictor 2 (horizontal differencing) — implemented for 8-bit samples.
  if (predictor === 2) {
    if (bitsPerComponent !== 8) return data;
    const out = data.slice();
    const rows = Math.floor(out.length / rowBytes);
    for (let r = 0; r < rows; r++) {
      const base = r * rowBytes;
      for (let i = colors; i < rowBytes; i++)
        out[base + i] = (out[base + i] + out[base + i - colors]) & 0xff;
    }
    return out;
  }

  // PNG predictors (10–15): each row is prefixed by a filter-type byte.
  const rows = Math.floor(data.length / (rowBytes + 1));
  const out = new Uint8Array(rows * rowBytes);
  let prev = new Uint8Array(rowBytes);
  let src = 0;
  for (let r = 0; r < rows; r++) {
    const ft = data[src++];
    const dst = r * rowBytes;
    for (let i = 0; i < rowBytes; i++) {
      const raw = data[src++];
      const a = i >= bpp ? out[dst + i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let x: number;
      switch (ft) {
        case 1:
          x = raw + a;
          break;
        case 2:
          x = raw + b;
          break;
        case 3:
          x = raw + ((a + b) >> 1);
          break;
        case 4:
          x = raw + paeth(a, b, c);
          break;
        default:
          x = raw;
      }
      out[dst + i] = x & 0xff;
    }
    prev = out.subarray(dst, dst + rowBytes);
  }
  return out;
}

/** Read /Filter or /DecodeParms (which may be a single value) as an array. */
export function asArray(o: PdfObject | undefined): PdfObject[] {
  if (o === undefined || o === null) return [];
  return Array.isArray(o) ? o : [o];
}

export function filterName(o: PdfObject | undefined): string | undefined {
  return isName(o) ? o.name : undefined;
}
