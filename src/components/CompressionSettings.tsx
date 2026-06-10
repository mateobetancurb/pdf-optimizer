export type Quality = 'screen' | 'ebook' | 'print'

const levels: { value: Quality; title: string; detail: string }[] = [
  { value: 'screen', title: 'Smallest file', detail: 'Max compression · 72 dpi · email & on-screen' },
  { value: 'ebook', title: 'Balanced', detail: 'Good quality · 150 dpi · reading on devices' },
  { value: 'print', title: 'Best quality', detail: 'Light compression · 300 dpi · printing' },
]

interface CompressionSettingsProps {
  quality: Quality
  onQualityChange: (q: Quality) => void
}

export function CompressionSettings({ quality, onQualityChange }: CompressionSettingsProps) {
  return (
    <div className="space-y-3">
      <p className="text-label-md font-semibold text-on-surface">Compression level</p>

      <div role="radiogroup" aria-label="Compression level" className="space-y-2">
        {levels.map((level) => {
          const isSelected = quality === level.value
          return (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onQualityChange(level.value)}
              className={`w-full flex items-center gap-3 text-left py-3 px-4 rounded-xl border transition-all active:scale-[0.99] ${
                isSelected
                  ? 'border-primary bg-surface-container-high'
                  : 'border-outline hover:bg-surface-container-high'
              }`}
            >
              <span
                className={`material-symbols-outlined ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}
                style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
              <span className="flex flex-col">
                <span className={`text-label-md font-semibold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                  {level.title}
                </span>
                <span className="text-body-sm text-on-surface-variant">{level.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
