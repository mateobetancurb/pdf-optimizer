/// <reference lib="webworker" />
import { PdfDocument } from '../lib/pdf/document'
import { optimize, type Quality } from '../lib/pdf/optimize'
import { recodeImage } from '../lib/pdf/image'
import { MemorySink, serialize, type Sink } from '../lib/pdf/serialize'

interface CompressRequest {
  file: File
  quality: Quality
  // When present, the result is streamed straight to this on-disk file instead
  // of being returned in memory (used for very large PDFs).
  fileHandle?: FileSystemFileHandle
}

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = async (event: MessageEvent<CompressRequest>) => {
  const { file, quality, fileHandle } = event.data
  try {
    const buf = new Uint8Array(await file.arrayBuffer())
    const doc = await PdfDocument.parse(buf)
    if (doc.encrypted) {
      ctx.postMessage({ ok: false, error: 'ENCRYPTED' })
      return
    }

    const stats = await optimize(doc, {
      quality,
      recodeImage,
      onProgress: (done, total) => {
        if (done % 16 === 0 || done === total) ctx.postMessage({ progress: done / total })
      },
    })

    if (fileHandle) {
      const writable = await fileHandle.createWritable()
      const sink: Sink = {
        bytesWritten: 0,
        async write(chunk) {
          await writable.write(chunk as BufferSource)
          this.bytesWritten += chunk.length
        },
      }
      await serialize(doc, sink, (n) => doc.getObject(n))
      await writable.close()
      ctx.postMessage({
        ok: true,
        mode: 'save',
        originalSize: buf.length,
        compressedSize: sink.bytesWritten,
        stats,
      })
    } else {
      const sink = new MemorySink()
      await serialize(doc, sink, (n) => doc.getObject(n))
      let out = sink.toUint8Array()
      let usedOriginal = false
      // Never hand back something larger than the input.
      if (out.length >= buf.length) {
        out = buf
        usedOriginal = true
      }
      ctx.postMessage(
        {
          ok: true,
          mode: 'download',
          originalSize: buf.length,
          compressedSize: out.length,
          usedOriginal,
          stats,
          data: out.buffer,
        },
        [out.buffer],
      )
    }
  } catch (err) {
    ctx.postMessage({ ok: false, error: String(err) })
  }
}
