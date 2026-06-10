interface ResultsCardProps {
  originalSize: number
  compressedSize: number
  onReset: () => void
}

export function ResultsCard({ originalSize, compressedSize, onReset }: ResultsCardProps) {
  const savings = Math.round((1 - compressedSize / originalSize) * 100)

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
      <h3 className="font-semibold text-headline-md text-on-surface">Compression Complete!</h3>
      <div className="bg-surface-container-highest p-4 rounded-lg inline-block">
        <p className="text-body-md text-on-surface-variant">
          Original: <span className="font-bold">{originalSize.toFixed(2)}MB</span>
          {' → '}
          Compressed: <span className="font-bold text-primary">{compressedSize.toFixed(2)}MB</span>
        </p>
        <p className="text-label-md font-semibold text-on-secondary-container mt-1">Saved {savings}%</p>
      </div>
      <div className="flex flex-col gap-3">
        <button className="w-full py-3 bg-secondary text-on-secondary rounded-lg text-label-md font-semibold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined">download</span>
          Download compressed file
        </button>
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
