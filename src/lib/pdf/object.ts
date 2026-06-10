// PDF object model. A PDF is a graph of these eight basic object types.
// We avoid TS-only runtime features (enums, parameter properties) so the same
// source runs under Node's type-stripping for tests and Vite for the browser.

export class PdfName {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

export class PdfRef {
  num: number;
  gen: number;
  constructor(num: number, gen: number) {
    this.num = num;
    this.gen = gen;
  }
  get key(): string {
    return `${this.num} ${this.gen}`;
  }
}

// A string object. `bytes` holds the decoded raw bytes; `hex` records the
// original delimiter so we can re-serialize hex strings (used by /ID etc.).
export class PdfString {
  bytes: Uint8Array;
  hex: boolean;
  constructor(bytes: Uint8Array, hex: boolean) {
    this.bytes = bytes;
    this.hex = hex;
  }
}

export type PdfDict = Map<string, PdfObject>;

// A stream object: its dictionary plus the *raw* (still-encoded) stream bytes.
// Decoding happens on demand so we never touch filters we don't need to.
export class PdfStream {
  dict: PdfDict;
  raw: Uint8Array;
  constructor(dict: PdfDict, raw: Uint8Array) {
    this.dict = dict;
    this.raw = raw;
  }
}

export type PdfObject =
  | null
  | boolean
  | number
  | PdfName
  | PdfString
  | PdfRef
  | PdfObject[]
  | PdfDict
  | PdfStream;

// --- small helpers -------------------------------------------------------

export function isDict(o: PdfObject | undefined): o is PdfDict {
  return o instanceof Map;
}

export function isName(o: PdfObject | undefined, name?: string): o is PdfName {
  return o instanceof PdfName && (name === undefined || o.name === name);
}

export function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.get(key);
}

/** Read a /Name value as a plain string, or undefined. */
export function nameValue(o: PdfObject | undefined): string | undefined {
  return o instanceof PdfName ? o.name : undefined;
}
