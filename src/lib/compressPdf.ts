import type { Quality } from "./pdf/optimize";
import type { OptimizeStats } from "./pdf/optimize";

export type { Quality };

export interface CompressOutcome {
  mode: "download" | "save";
  originalSize: number; // bytes
  compressedSize: number; // bytes
  usedOriginal: boolean; // true when the input was already optimal (kept as-is)
  fileName: string;
  blob?: Blob; // present only for 'download' mode
  stats?: OptimizeStats;
}

export class CancelledError extends Error {}

// Above this size we stream the result straight to disk (if the browser can),
// so we never hold input + output in memory at once.
const LARGE_FILE = 250 * 1024 * 1024;

function supportsSaveToDisk(): boolean {
  return (
    typeof (globalThis as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker ===
    "function"
  );
}

/**
 * Compress a PDF fully in the browser (no network, no third-party code). Large
 * files are written straight to a user-chosen file via the File System Access
 * API; smaller ones are returned as a Blob for download.
 */
export async function compressPdf(
  file: File,
  quality: Quality,
  onProgress?: (fraction: number) => void,
): Promise<CompressOutcome> {
  const outName = file.name.replace(/\.pdf$/i, "") + "-compressed.pdf";

  // Must run while we still have the click's user activation, before the worker.
  let fileHandle: FileSystemFileHandle | undefined;
  if (supportsSaveToDisk() && file.size >= LARGE_FILE) {
    try {
      const picker = (
        globalThis as unknown as {
          showSaveFilePicker: (o: unknown) => Promise<FileSystemFileHandle>;
        }
      ).showSaveFilePicker;
      fileHandle = await picker({
        suggestedName: outName,
        types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
      });
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") throw new CancelledError();
      throw err;
    }
  }

  const worker = new Worker(new URL("../workers/compress.worker.ts", import.meta.url), {
    type: "module",
  });

  return new Promise<CompressOutcome>((resolve, reject) => {
    worker.onmessage = (event) => {
      const msg = event.data;
      if (typeof msg.progress === "number") {
        onProgress?.(msg.progress);
        return;
      }
      worker.terminate();
      if (!msg.ok) {
        reject(new Error(msg.error === "ENCRYPTED" ? "ENCRYPTED" : msg.error));
        return;
      }
      if (msg.mode === "save") {
        resolve({
          mode: "save",
          originalSize: msg.originalSize,
          compressedSize: msg.compressedSize,
          usedOriginal: false,
          fileName: fileHandle!.name,
          stats: msg.stats,
        });
      } else {
        resolve({
          mode: "download",
          originalSize: msg.originalSize,
          compressedSize: msg.compressedSize,
          usedOriginal: msg.usedOriginal,
          fileName: outName,
          blob: new Blob([msg.data], { type: "application/pdf" }),
          stats: msg.stats,
        });
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Compression worker failed"));
    };
    worker.postMessage({ file, quality, fileHandle });
  });
}
