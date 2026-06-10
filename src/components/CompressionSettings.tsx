export type Quality = 'screen' | 'ebook' | 'print'

const descriptions: Record<Quality, string> = {
  screen: 'Lowest resolution (72 dpi). Ideal for email and screen viewing.',
  ebook: 'Medium resolution (150 dpi). Good for reading on digital devices.',
  print: 'High resolution (300 dpi). Best quality for physical printing.',
}

interface CompressionSettingsProps {
  quality: Quality
  onQualityChange: (q: Quality) => void
}

export function CompressionSettings({ quality, onQualityChange }: CompressionSettingsProps) {
  const options: Quality[] = ['screen', 'ebook', 'print']

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onQualityChange(opt)}
            className={`flex-1 py-2 px-4 rounded-full text-label-md border transition-all active:scale-95 capitalize ${
              quality === opt
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>
      <p className="text-body-sm text-on-surface-variant text-center px-4 italic">
        {descriptions[quality]}
      </p>
    </div>
  )
}
