import { useTranslation } from '../lib/i18n'

interface CompressButtonProps {
  isCompressing: boolean
  isEnabled: boolean
  onCompress: () => void
}

export function CompressButton({ isCompressing, isEnabled, onCompress }: CompressButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      disabled={!isEnabled || isCompressing}
      onClick={onCompress}
      className={`w-full py-4 font-semibold text-label-md rounded-lg flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden relative ${
        isEnabled
          ? 'bg-primary text-on-primary hover:brightness-110'
          : 'bg-primary-container text-on-primary-container opacity-50 cursor-not-allowed'
      }`}
    >
      <span>{isCompressing ? t('compressButton.compressing') : t('compressButton.compress')}</span>
      {isCompressing && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-on-primary progress-fill"
          style={{ width: isCompressing ? '100%' : '0%' }}
        />
      )}
    </button>
  )
}
