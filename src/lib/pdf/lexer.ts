import { PdfName, PdfRef, PdfString, PdfStream, type PdfDict, type PdfObject } from "./object";

const WS = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIM = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);

function isWhite(b: number): boolean {
  return WS.has(b);
}
function isDelim(b: number): boolean {
  return DELIM.has(b);
}
function isDigit(b: number): boolean {
  return b >= 0x30 && b <= 0x39;
}
function isRegular(b: number): boolean {
  return !isWhite(b) && !isDelim(b);
}

export interface IndirectObject {
  num: number;
  gen: number;
  obj: PdfObject;
}

// Resolves the /Length of a stream (which may be an indirect reference) to a
// concrete number, or undefined if it can't (we then scan for `endstream`).
export type LengthResolver = (value: PdfObject | undefined) => number | undefined;

/**
 * A cursor over PDF bytes that parses the eight basic object types. It is
 * deliberately tolerant: malformed-but-recoverable input falls back to scanning
 * rather than throwing, because real-world PDFs are frequently sloppy.
 */
export class Lexer {
  buf: Uint8Array;
  pos: number;

  constructor(buf: Uint8Array, pos = 0) {
    this.buf = buf;
    this.pos = pos;
  }

  private peek(off = 0): number {
    return this.buf[this.pos + off];
  }

  skipWhite(): void {
    const buf = this.buf;
    while (this.pos < buf.length) {
      const b = buf[this.pos];
      if (b === 0x25) {
        // comment: skip to end of line
        this.pos++;
        while (this.pos < buf.length && buf[this.pos] !== 0x0a && buf[this.pos] !== 0x0d)
          this.pos++;
      } else if (isWhite(b)) {
        this.pos++;
      } else {
        break;
      }
    }
  }

  /** Read a run of regular (non-delimiter, non-whitespace) characters. */
  private readRegular(): string {
    const start = this.pos;
    while (this.pos < this.buf.length && isRegular(this.buf[this.pos])) this.pos++;
    return latin1(this.buf, start, this.pos);
  }

  private readName(): PdfName {
    this.pos++; // consume '/'
    let out = "";
    const buf = this.buf;
    while (this.pos < buf.length && isRegular(buf[this.pos])) {
      let b = buf[this.pos];
      if (b === 0x23 && this.pos + 2 < buf.length) {
        const h = hexPair(buf[this.pos + 1], buf[this.pos + 2]);
        if (h >= 0) {
          b = h;
          this.pos += 2;
        }
      }
      out += String.fromCharCode(b);
      this.pos++;
    }
    return new PdfName(out);
  }

  private readLiteralString(): PdfString {
    this.pos++; // consume '('
    const buf = this.buf;
    const bytes: number[] = [];
    let depth = 1;
    while (this.pos < buf.length) {
      const b = buf[this.pos++];
      if (b === 0x5c) {
        // backslash escape
        const e = buf[this.pos++];
        switch (e) {
          case 0x6e:
            bytes.push(0x0a);
            break; // \n
          case 0x72:
            bytes.push(0x0d);
            break; // \r
          case 0x74:
            bytes.push(0x09);
            break; // \t
          case 0x62:
            bytes.push(0x08);
            break; // \b
          case 0x66:
            bytes.push(0x0c);
            break; // \f
          case 0x28:
            bytes.push(0x28);
            break; // \(
          case 0x29:
            bytes.push(0x29);
            break; // \)
          case 0x5c:
            bytes.push(0x5c);
            break; // backslash
          case 0x0d:
            if (buf[this.pos] === 0x0a) this.pos++;
            break; // line continuation
          case 0x0a:
            break; // line continuation
          default:
            if (e >= 0x30 && e <= 0x37) {
              // octal: up to 3 digits
              let oct = e - 0x30;
              for (let i = 0; i < 2 && buf[this.pos] >= 0x30 && buf[this.pos] <= 0x37; i++) {
                oct = oct * 8 + (buf[this.pos++] - 0x30);
              }
              bytes.push(oct & 0xff);
            } else {
              bytes.push(e);
            }
        }
      } else if (b === 0x28) {
        depth++;
        bytes.push(b);
      } else if (b === 0x29) {
        depth--;
        if (depth === 0) break;
        bytes.push(b);
      } else {
        bytes.push(b);
      }
    }
    return new PdfString(Uint8Array.from(bytes), false);
  }

  private readHexString(): PdfString {
    this.pos++; // consume '<'
    const buf = this.buf;
    const bytes: number[] = [];
    let hi = -1;
    while (this.pos < buf.length) {
      const b = buf[this.pos++];
      if (b === 0x3e) break; // '>'
      const v = hexVal(b);
      if (v < 0) continue; // skip whitespace inside hex string
      if (hi < 0) hi = v;
      else {
        bytes.push((hi << 4) | v);
        hi = -1;
      }
    }
    if (hi >= 0) bytes.push(hi << 4); // odd digit -> pad low nibble with 0
    return new PdfString(Uint8Array.from(bytes), true);
  }

  private readArray(): PdfObject[] {
    this.pos++; // consume '['
    const arr: PdfObject[] = [];
    for (;;) {
      this.skipWhite();
      if (this.pos >= this.buf.length || this.peek() === 0x5d) {
        this.pos++; // consume ']'
        break;
      }
      arr.push(this.parseValue());
    }
    return arr;
  }

  private readDict(): PdfDict {
    this.pos += 2; // consume '<<'
    const dict: PdfDict = new Map();
    for (;;) {
      this.skipWhite();
      if (this.peek() === 0x3e && this.peek(1) === 0x3e) {
        this.pos += 2; // consume '>>'
        break;
      }
      if (this.peek() !== 0x2f) {
        // malformed key; bail to avoid infinite loop
        if (this.pos >= this.buf.length) break;
        this.pos++;
        continue;
      }
      const key = this.readName().name;
      const value = this.parseValue();
      dict.set(key, value);
    }
    return dict;
  }

  /** Parse a single value object (the kind that can appear inside arrays/dicts). */
  parseValue(resolveLength?: LengthResolver): PdfObject {
    this.skipWhite();
    const b = this.peek();
    if (b === undefined) return null;
    if (b === 0x2f) return this.readName();
    if (b === 0x28) return this.readLiteralString();
    if (b === 0x5b) return this.readArray();
    if (b === 0x3c) {
      if (this.peek(1) === 0x3c) {
        const dict = this.readDict();
        // A dictionary directly followed by `stream` is a stream object.
        const save = this.pos;
        this.skipWhite();
        if (this.matchKeyword("stream")) {
          return this.readStreamBody(dict, resolveLength);
        }
        this.pos = save;
        return dict;
      }
      return this.readHexString();
    }
    if (isDigit(b) || b === 0x2b || b === 0x2d || b === 0x2e) {
      return this.parseNumberOrRef();
    }
    // keyword: true / false / null / R
    const word = this.readRegular();
    if (word === "true") return true;
    if (word === "false") return false;
    if (word === "null") return null;
    if (word === "R") return null; // stray R without operands
    return null;
  }

  private parseNumberOrRef(): PdfObject {
    const first = this.readNumberToken();
    if (first.isInt) {
      // Look ahead for `gen R` (an indirect reference).
      const save = this.pos;
      this.skipWhite();
      if (isDigit(this.peek())) {
        const second = this.readNumberToken();
        if (second.isInt) {
          this.skipWhite();
          const afterGen = this.pos;
          const word = this.readRegular();
          if (word === "R") return new PdfRef(first.value, second.value);
          this.pos = afterGen;
        }
      }
      this.pos = save;
    }
    return first.value;
  }

  private readNumberToken(): { value: number; isInt: boolean } {
    const start = this.pos;
    const buf = this.buf;
    let isInt = true;
    if (buf[this.pos] === 0x2b || buf[this.pos] === 0x2d) this.pos++;
    while (this.pos < buf.length) {
      const b = buf[this.pos];
      if (isDigit(b)) this.pos++;
      else if (b === 0x2e) {
        isInt = false;
        this.pos++;
      } else break;
    }
    const value = parseFloat(latin1(buf, start, this.pos)) || 0;
    return { value, isInt };
  }

  private matchKeyword(kw: string): boolean {
    for (let i = 0; i < kw.length; i++) {
      if (this.buf[this.pos + i] !== kw.charCodeAt(i)) return false;
    }
    this.pos += kw.length;
    return true;
  }

  private readStreamBody(dict: PdfDict, resolveLength?: LengthResolver): PdfStream {
    // After the `stream` keyword: CRLF or LF (a lone CR is also tolerated).
    if (this.buf[this.pos] === 0x0d) this.pos++;
    if (this.buf[this.pos] === 0x0a) this.pos++;
    const start = this.pos;

    let end = -1;
    const declared = resolveLength
      ? resolveLength(dict.get("Length"))
      : asNumber(dict.get("Length"));
    if (declared !== undefined && declared >= 0 && start + declared <= this.buf.length) {
      // Trust /Length only if `endstream` actually follows it.
      const p = start + declared;
      let q = p;
      while (q < this.buf.length && isWhite(this.buf[q])) q++;
      if (this.regionEquals(q, "endstream")) {
        end = p;
        this.pos = q + "endstream".length;
      }
    }
    if (end < 0) {
      // Fallback: scan for the `endstream` keyword.
      const idx = indexOf(this.buf, ENDSTREAM, start);
      if (idx < 0) {
        end = this.buf.length;
        this.pos = this.buf.length;
      } else {
        let e = idx;
        // back up over the EOL that precedes endstream
        if (this.buf[e - 1] === 0x0a) e--;
        if (this.buf[e - 1] === 0x0d) e--;
        end = e;
        this.pos = idx + ENDSTREAM.length;
      }
    }
    return new PdfStream(dict, this.buf.subarray(start, end));
  }

  private regionEquals(at: number, kw: string): boolean {
    for (let i = 0; i < kw.length; i++) {
      if (this.buf[at + i] !== kw.charCodeAt(i)) return false;
    }
    return true;
  }

  /** Parse `num gen obj <value> endobj` starting at the current position. */
  parseIndirectObject(resolveLength?: LengthResolver): IndirectObject {
    this.skipWhite();
    const num = this.readNumberToken().value;
    this.skipWhite();
    const gen = this.readNumberToken().value;
    this.skipWhite();
    this.matchKeyword("obj");
    const obj = this.parseValue(resolveLength);
    this.skipWhite();
    this.matchKeyword("endobj");
    return { num, gen, obj };
  }
}

// --- byte utilities ------------------------------------------------------

const ENDSTREAM = new Uint8Array([0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]);

export function latin1(buf: Uint8Array, start: number, end: number): string {
  let s = "";
  for (let i = start; i < end; i++) s += String.fromCharCode(buf[i]);
  return s;
}

function hexVal(b: number): number {
  if (b >= 0x30 && b <= 0x39) return b - 0x30;
  if (b >= 0x41 && b <= 0x46) return b - 0x41 + 10;
  if (b >= 0x61 && b <= 0x66) return b - 0x61 + 10;
  return -1;
}

function hexPair(a: number, b: number): number {
  const h = hexVal(a);
  const l = hexVal(b);
  return h < 0 || l < 0 ? -1 : (h << 4) | l;
}

function asNumber(o: PdfObject | undefined): number | undefined {
  return typeof o === "number" ? o : undefined;
}

export function indexOf(haystack: Uint8Array, needle: Uint8Array, from: number): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export function lastIndexOf(haystack: Uint8Array, needle: Uint8Array, from: number): number {
  outer: for (let i = Math.min(from, haystack.length - needle.length); i >= 0; i--) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}
