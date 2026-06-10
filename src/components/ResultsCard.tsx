import type { CompressOutcome } from '../lib/compressPdf'

interface ResultsCardProps {
  outcome: CompressOutcome
  downloadUrl: string | null
  onReset: () => void
}

function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2) + 'MB'
}

export function ResultsCard({ outcome, downloadUrl, onReset }: ResultsCardProps) {
  const savings = Math.max(0, Math.round((1 - outcome.compressedSize / outcome.originalSize) * 100))
  const savedImages = outcome.stats?.imagesRecoded ?? 0

  return (
    <div className="bg-surface-container-low border border-outline-variant p-padding-md rounded-xl text-center space-y-4 shadow-sm">
      <div className="flex justify-center">
        <span
          className="material-symbols-outlined text-primary text-5xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
      </div>

      <h3 className="font-semibold text-headline-md text-on-surface">
        {outcome.usedOriginal ? 'Already optimized' : 'Compression complete!'}
      </h3>

      <div className="bg-surface-container-highest p-4 rounded-lg inline-block">
        {outcome.usedOriginal ? (
          <p className="text-body-md text-on-surface-variant">
            This PDF was already as small as we can make it — your original was kept unchanged
            ({mb(outcome.originalSize)}).
          </p>
        ) : (
          <>
            <p className="text-body-md text-on-surface-variant">
              Original: <span className="font-bold">{mb(outcome.originalSize)}</span>
              {' → '}
              Compressed: <span className="font-bold text-primary">{mb(outcome.compressedSize)}</span>
            </p>
            <p className="text-label-md font-semibold text-on-secondary-container mt-1">
              Saved {savings}%{savedImages > 0 ? ` · ${savedImages} images recompressed` : ''}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {outcome.mode === 'save' ? (
          <p className="text-body-sm text-on-surface-variant flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary">save</span>
            Saved to <span className="font-semibold">{outcome.fileName}</span>
          </p>
        ) : (
          downloadUrl && (
            <a
              href={downloadUrl}
              download={outcome.fileName}
              className="w-full py-3 bg-secondary text-on-secondary rounded-lg text-label-md font-semibold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined">download</span>
              Download compressed file
            </a>
          )
        )}
        <button
          className="text-primary text-label-md font-semibold hover:underline decoration-2 underline-offset-4 transition-all"
          onClick={onReset}
        >
          Compress another file
        </button>
      </div>
    </div>
  )
}
