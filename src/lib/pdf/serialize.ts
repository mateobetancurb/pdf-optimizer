import type { PdfDocument } from "./document";
import {
  PdfName,
  PdfRef,
  PdfString,
  PdfStream,
  isDict,
  type PdfDict,
  type PdfObject,
} from "./object";

// A write target. MemorySink keeps everything in RAM; a streaming sink (backed
// by the File System Access API) implements the same shape for huge files.
export interface Sink {
  write(chunk: Uint8Array): Promise<void> | void;
  bytesWritten: number;
}

export class MemorySink implements Sink {
  private chunks: Uint8Array[] = [];
  bytesWritten = 0;
  write(chunk: Uint8Array): void {
    this.chunks.push(chunk);
    this.bytesWritten += chunk.length;
  }
  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.bytesWritten);
    let p = 0;
    for (const c of this.chunks) {
      out.set(c, p);
      p += c.length;
    }
    return out;
  }
}

// We can override the bytes/dict the serializer writes for a given object number
// (used by the optimizer to swap in recompressed streams).
export type ObjectProvider = (num: number) => Promise<PdfObject>;

const HEADER = "%PDF-1.7\n%\xe2\xe3\xcf\xd3\n";

/**
 * Write `doc` to `sink` as a fresh, single-section file: every object emitted
 * uncompressed, followed by a classic xref table and trailer. Object streams in
 * the source are expanded into plain objects (the per-object savings come from
 * the optimizer recompressing stream bodies, not from packing).
 */
export async function serialize(
  doc: PdfDocument,
  sink: Sink,
  provide: ObjectProvider,
): Promise<void> {
  let pos = 0;
  const enc = (s: string) => {
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
    return bytes;
  };
  const put = async (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === "string" ? enc(chunk) : chunk;
    await sink.write(bytes);
    pos += bytes.length;
  };

  await put(HEADER);

  const nums = [...doc.xref.keys()].sort((a, b) => a - b);
  const maxNum = nums.length ? nums[nums.length - 1] : 0;
  const offsets = new Map<number, number>();

  for (const num of nums) {
    const obj = await provide(num);
    // Drop the original object-stream and xref-stream containers: their contents
    // are re-emitted as plain objects and a fresh xref, so the containers are
    // now dead weight.
    if (isDroppable(obj)) continue;
    if (obj === null && !doc.xref.has(num)) continue;
    offsets.set(num, pos);
    await put(`${num} 0 obj\n`);
    await writeValue(obj, put);
    await put("\nendobj\n");
  }

  const xrefPos = pos;
  await put("xref\n");
  await put(`0 ${maxNum + 1}\n`);
  for (let n = 0; n <= maxNum; n++) {
    const off = offsets.get(n);
    if (n === 0 || off === undefined) await put("0000000000 65535 f \n");
    else await put(`${pad10(off)} 00000 n \n`);
  }

  const trailer = buildTrailer(doc, maxNum + 1);
  await put("trailer\n");
  await writeValue(trailer, put);
  await put(`\nstartxref\n${xrefPos}\n%%EOF\n`);
}

function isDroppable(obj: PdfObject): boolean {
  if (!(obj instanceof PdfStream)) return false;
  const type = obj.dict.get("Type");
  return type instanceof PdfName && (type.name === "ObjStm" || type.name === "XRef");
}

function buildTrailer(doc: PdfDocument, size: number): PdfDict {
  const t: PdfDict = new Map();
  t.set("Size", size);
  const root = doc.trailer.get("Root");
  if (root) t.set("Root", root);
  const info = doc.trailer.get("Info");
  if (info) t.set("Info", info);
  const id = doc.trailer.get("ID");
  if (id) t.set("ID", id);
  return t;
}

type Put = (chunk: Uint8Array | string) => Promise<void>;

async function writeValue(obj: PdfObject, put: Put): Promise<void> {
  if (obj === null || obj === undefined) {
    await put("null");
  } else if (typeof obj === "boolean") {
    await put(obj ? "true" : "false");
  } else if (typeof obj === "number") {
    await put(formatNumber(obj));
  } else if (obj instanceof PdfName) {
    await put("/" + encodeName(obj.name));
  } else if (obj instanceof PdfRef) {
    await put(`${obj.num} ${obj.gen} R`);
  } else if (obj instanceof PdfString) {
    await put(encodeString(obj));
  } else if (Array.isArray(obj)) {
    await put("[");
    for (let i = 0; i < obj.length; i++) {
      if (i) await put(" ");
      await writeValue(obj[i], put);
    }
    await put("]");
  } else if (obj instanceof PdfStream) {
    obj.dict.set("Length", obj.raw.length);
    await writeDict(obj.dict, put);
    await put("\nstream\n");
    await put(obj.raw);
    await put("\nendstream");
  } else if (isDict(obj)) {
    await writeDict(obj, put);
  } else {
    await put("null");
  }
}

async function writeDict(dict: PdfDict, put: Put): Promise<void> {
  await put("<<");
  for (const [key, value] of dict) {
    await put("/" + encodeName(key) + " ");
    await writeValue(value, put);
  }
  await put(">>");
}

function encodeName(name: string): string {
  let out = "";
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if (c < 0x21 || c > 0x7e || "#()<>[]{}/%".indexOf(name[i]) >= 0) {
      out += "#" + c.toString(16).padStart(2, "0");
    } else {
      out += name[i];
    }
  }
  return out;
}

function encodeString(s: PdfString): string {
  if (s.hex) {
    let h = "<";
    for (const b of s.bytes) h += b.toString(16).padStart(2, "0");
    return h + ">";
  }
  let out = "(";
  for (const b of s.bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out += "\\" + String.fromCharCode(b);
    else if (b === 0x0d) out += "\\r";
    else out += String.fromCharCode(b);
  }
  return out + ")";
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  let s = n.toFixed(6);
  s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

function pad10(n: number): string {
  return String(n).padStart(10, "0");
}
