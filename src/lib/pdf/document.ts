import { inflate } from "./flate";
import { applyPredictor, asArray, filterName, readPredictorParams } from "./filters";
import { Lexer, lastIndexOf, latin1 } from "./lexer";
import { PdfRef, PdfStream, isDict, isName, type PdfDict, type PdfObject } from "./object";

type XrefEntry =
  | { type: 1; offset: number; gen: number }
  | { type: 2; stmNum: number; idx: number };

const STARTXREF = new Uint8Array([0x73, 0x74, 0x61, 0x72, 0x74, 0x78, 0x72, 0x65, 0x66]);

/**
 * A parsed PDF: the cross-reference map, the trailer, and lazy/cached access to
 * every indirect object. Handles classic xref tables, xref streams, hybrid
 * files, and object streams. Encrypted PDFs are detected and reported (we don't
 * implement decryption — those are copied through untouched by the caller).
 */
export class PdfDocument {
  buf: Uint8Array;
  xref = new Map<number, XrefEntry>();
  trailer: PdfDict = new Map();
  encrypted = false;

  private cache = new Map<number, PdfObject>();
  private objStmCache = new Map<number, Map<number, PdfObject>>();

  private constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  static async parse(buf: Uint8Array): Promise<PdfDocument> {
    const doc = new PdfDocument(buf);
    await doc.buildXref();
    doc.encrypted = doc.trailer.has("Encrypt");
    return doc;
  }

  // --- cross-reference construction --------------------------------------

  private async buildXref(): Promise<void> {
    const sx = lastIndexOf(this.buf, STARTXREF, this.buf.length);
    let offset = -1;
    if (sx >= 0) {
      const lx = new Lexer(this.buf, sx + STARTXREF.length);
      lx.skipWhite();
      offset = numAt(this.buf, lx.pos);
    }
    const visited = new Set<number>();
    let first = true;
    while (offset >= 0 && offset < this.buf.length && !visited.has(offset)) {
      visited.add(offset);
      const prev = await this.readXrefSection(offset, first);
      first = false;
      offset = prev;
    }
    // Fallback: if we found nothing usable, rebuild by scanning for `N G obj`.
    if (this.xref.size === 0 || !this.trailer.has("Root")) {
      this.rebuildByScan();
    }
  }

  /** Returns the /Prev offset to follow, or -1. `isNewest` sets the trailer. */
  private async readXrefSection(offset: number, isNewest: boolean): Promise<number> {
    const lx = new Lexer(this.buf, offset);
    lx.skipWhite();
    if (regionEquals(this.buf, lx.pos, "xref")) {
      return this.readClassicXref(lx, isNewest);
    }
    return this.readXrefStream(offset, isNewest);
  }

  private readClassicXref(lx: Lexer, isNewest: boolean): number {
    lx.pos += 4; // 'xref'
    for (;;) {
      lx.skipWhite();
      if (regionEquals(this.buf, lx.pos, "trailer")) {
        lx.pos += 7;
        const trailer = lx.parseValue();
        if (isDict(trailer)) {
          if (isNewest) this.trailer = trailer;
          // Hybrid-reference files keep extra entries in an xref stream.
          const xrefStm = trailer.get("XRefStm");
          if (typeof xrefStm === "number") this.readXrefStream(xrefStm, false);
          const prev = trailer.get("Prev");
          return typeof prev === "number" ? prev : -1;
        }
        return -1;
      }
      const start = readInt(lx);
      const count = readInt(lx);
      if (start < 0 || count < 0) return -1;
      for (let i = 0; i < count; i++) {
        lx.skipWhite();
        const off = readInt(lx);
        const gen = readInt(lx);
        lx.skipWhite();
        const type = this.buf[lx.pos];
        lx.pos++; // 'n' | 'f'
        const objNum = start + i;
        if (type === 0x6e /* n */ && !this.xref.has(objNum)) {
          this.xref.set(objNum, { type: 1, offset: off, gen });
        }
      }
    }
  }

  private async readXrefStream(offset: number, isNewest: boolean): Promise<number> {
    const lx = new Lexer(this.buf, offset);
    const { obj } = lx.parseIndirectObject((v) => this.resolveLengthSync(v));
    if (!(obj instanceof PdfStream)) return -1;
    const dict = obj.dict;
    if (isNewest) this.trailer = dict;

    const data = await this.decodeFlate(obj);
    const w = (dict.get("W") as number[]) || [];
    const [w0, w1, w2] = [w[0] | 0, w[1] | 0, w[2] | 0];
    const entryLen = w0 + w1 + w2;
    const size = numProp(dict, "Size", 0);
    const index = (dict.get("Index") as number[]) || [0, size];

    let p = 0;
    for (let s = 0; s + 1 < index.length; s += 2) {
      const start = index[s];
      const count = index[s + 1];
      for (let i = 0; i < count && p + entryLen <= data.length; i++) {
        const f0 = w0 === 0 ? 1 : readBE(data, p, w0);
        const f1 = readBE(data, p + w0, w1);
        const f2 = readBE(data, p + w0 + w1, w2);
        p += entryLen;
        const objNum = start + i;
        if (this.xref.has(objNum)) continue;
        if (f0 === 1) this.xref.set(objNum, { type: 1, offset: f1, gen: f2 });
        else if (f0 === 2) this.xref.set(objNum, { type: 2, stmNum: f1, idx: f2 });
      }
    }
    const prev = dict.get("Prev");
    return typeof prev === "number" ? prev : -1;
  }

  // Last-resort recovery: scan the whole file for `N G obj` headers.
  private rebuildByScan(): void {
    const buf = this.buf;
    const re = /(\d+)\s+(\d+)\s+obj/g;
    const text = latin1(buf, 0, buf.length);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const num = parseInt(m[1], 10);
      this.xref.set(num, { type: 1, offset: m.index, gen: parseInt(m[2], 10) });
    }
    if (!this.trailer.has("Root")) {
      // find a /Root in any trailer-like dict
      const tIdx = text.lastIndexOf("trailer");
      if (tIdx >= 0) {
        const lx = new Lexer(buf, tIdx + 7);
        const t = lx.parseValue();
        if (isDict(t)) this.trailer = t;
      }
    }
  }

  // --- object access ------------------------------------------------------

  async getObject(ref: PdfRef | number): Promise<PdfObject> {
    const num = ref instanceof PdfRef ? ref.num : ref;
    if (this.cache.has(num)) return this.cache.get(num)!;
    const entry = this.xref.get(num);
    if (!entry) return null;
    let obj: PdfObject;
    if (entry.type === 1) {
      const lx = new Lexer(this.buf, entry.offset);
      obj = lx.parseIndirectObject((v) => this.resolveLengthSync(v)).obj;
    } else {
      const objects = await this.loadObjStm(entry.stmNum);
      obj = objects.get(entry.idx) ?? null;
    }
    this.cache.set(num, obj);
    return obj;
  }

  /** Resolve a value, following one indirect reference if present. */
  async resolve(o: PdfObject): Promise<PdfObject> {
    return o instanceof PdfRef ? this.getObject(o) : o;
  }

  private async loadObjStm(stmNum: number): Promise<Map<number, PdfObject>> {
    const cached = this.objStmCache.get(stmNum);
    if (cached) return cached;
    const result = new Map<number, PdfObject>();
    this.objStmCache.set(stmNum, result); // set early to break cycles
    const stm = await this.getObject(stmNum);
    if (stm instanceof PdfStream) {
      const data = await this.decodeFlate(stm);
      const n = numProp(stm.dict, "N", 0);
      const first = numProp(stm.dict, "First", 0);
      const head = new Lexer(data, 0);
      const offsets: number[] = [];
      for (let i = 0; i < n; i++) {
        readInt(head); // object number (we index by position)
        offsets.push(readInt(head));
      }
      for (let i = 0; i < n; i++) {
        const body = new Lexer(data, first + offsets[i]);
        result.set(i, body.parseValue());
      }
    }
    return result;
  }

  /** Synchronously resolve a stream's /Length (number or simple type-1 ref). */
  private resolveLengthSync(value: PdfObject | undefined): number | undefined {
    if (typeof value === "number") return value;
    if (value instanceof PdfRef) {
      const e = this.xref.get(value.num);
      if (e && e.type === 1) {
        const lx = new Lexer(this.buf, e.offset);
        const o = lx.parseIndirectObject().obj;
        if (typeof o === "number") return o;
      }
    }
    return undefined;
  }

  /** Decode a stream whose (first) filter is FlateDecode, applying predictors. */
  async decodeFlate(stream: PdfStream): Promise<Uint8Array> {
    const filters = asArray(stream.dict.get("Filter") ?? stream.dict.get("F"));
    const parms = asArray(stream.dict.get("DecodeParms") ?? stream.dict.get("DP"));
    let data = stream.raw;
    for (let i = 0; i < filters.length; i++) {
      const name = filterName(filters[i]);
      if (name === "FlateDecode" || name === "Fl") {
        data = await inflate(data);
        data = applyPredictor(data, readPredictorParams(parms[i]));
      } else {
        break; // stop at the first filter we don't handle here
      }
    }
    return data;
  }

  // --- convenience --------------------------------------------------------

  get root(): PdfRef | undefined {
    const r = this.trailer.get("Root");
    return r instanceof PdfRef ? r : undefined;
  }
}

// --- byte helpers --------------------------------------------------------

function regionEquals(buf: Uint8Array, at: number, kw: string): boolean {
  for (let i = 0; i < kw.length; i++) if (buf[at + i] !== kw.charCodeAt(i)) return false;
  return true;
}

function numAt(buf: Uint8Array, pos: number): number {
  let s = "";
  while (pos < buf.length && buf[pos] >= 0x30 && buf[pos] <= 0x39)
    s += String.fromCharCode(buf[pos++]);
  return s ? parseInt(s, 10) : -1;
}

function readInt(lx: Lexer): number {
  lx.skipWhite();
  const v = lx.parseValue();
  return typeof v === "number" ? v : -1;
}

function readBE(data: Uint8Array, off: number, len: number): number {
  let v = 0;
  for (let i = 0; i < len; i++) v = v * 256 + data[off + i];
  return v;
}

function numProp(dict: PdfDict, key: string, def: number): number {
  const v = dict.get(key);
  return typeof v === "number" ? v : def;
}

export { isDict, isName };
