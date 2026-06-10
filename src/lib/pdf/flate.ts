// PDF /FlateDecode is a zlib (RFC 1950) stream, which is exactly what the
// browser-native CompressionStream/DecompressionStream('deflate') speak. No
// third-party code — these are Web Platform APIs (also present in Node 18+).

async function runStream(
  data: Uint8Array,
  transform: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const pair = transform as unknown as ReadableWritablePair<Uint8Array, Uint8Array>
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(pair)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

/**
 * Decompress a FlateDecode stream. Tries zlib-wrapped first (the spec-correct
 * form) and falls back to raw DEFLATE, which some non-conformant producers emit.
 */
export async function inflate(data: Uint8Array): Promise<Uint8Array> {
  try {
    return await runStream(data, new DecompressionStream('deflate'))
  } catch {
    return await runStream(data, new DecompressionStream('deflate-raw'))
  }
}

/** Compress bytes into a zlib (RFC 1950) stream suitable for /FlateDecode. */
export async function deflate(data: Uint8Array): Promise<Uint8Array> {
  return runStream(data, new CompressionStream('deflate'))
}
