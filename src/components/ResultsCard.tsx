import type { CompressOutcome } from '../lib/compressPdf'
import { useTranslation } from '../lib/i18n'

interface ResultsCardProps {
  outcome: CompressOutcome
  downloadUrl: string | null
  onReset: () => void
}

function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2) + 'MB'
}

export function ResultsCard({ outcome, downloadUrl, onReset }: ResultsCardProps) {
  const { t } = useTranslation()
  const savings = Math.max(0, Math.round((1 - outcome.compressedSize / outcome.originalSize) * 100))
  const savedImages = outcome.stats?.imagesRecoded ?? 0
  const savingsLabel = t('results.savings', { savings })
    + (savedImages > 0 ? t('results.imagesRecompressed', { count: savedImages }) : '')

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
        {outcome.usedOriginal ? t('results.alreadyOptimized') : t('results.complete')}
      </h3>

      <div className="bg-surface-container-highest p-4 rounded-lg inline-block">
        {outcome.usedOriginal ? (
          <p className="text-body-md text-on-surface-variant">
            {t('results.unchangedBody', { mb: mb(outcome.originalSize) })}
          </p>
        ) : (
          <>
            <p className="text-body-md text-on-surface-variant">
              {t('results.sizeComparison', {
                originalSize: mb(outcome.originalSize),
                compressedSize: mb(outcome.compressedSize),
              })}
            </p>
            <p className="text-label-md font-semibold text-on-secondary-container mt-1">
              {savingsLabel}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {outcome.mode === 'save' ? (
          <p className="text-body-sm text-on-surface-variant flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary">save</span>
            {t('results.savedTo', { fileName: outcome.fileName ?? '' })}
          </p>
        ) : (
          downloadUrl && (
            <a
              href={downloadUrl}
              download={outcome.fileName}
              className="w-full py-3 bg-secondary text-on-secondary rounded-lg text-label-md font-semibold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined">download</span>
              {t('results.download')}
            </a>
          )
        )}
        <button
          className="text-primary text-label-md font-semibold hover:underline decoration-2 underline-offset-4 transition-all"
          onClick={onReset}
        >
          {t('results.compressAnother')}
        </button>
      </div>
    </div>
  )
}
