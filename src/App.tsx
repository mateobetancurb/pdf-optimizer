import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { DropZone } from './components/DropZone'
import { FileInfo } from './components/FileInfo'
import { CompressionSettings, type Quality } from './components/CompressionSettings'
import { CompressButton } from './components/CompressButton'
import { ResultsCard } from './components/ResultsCard'
import { compressPdf, CancelledError, type CompressOutcome } from './lib/compressPdf'

type AppState = 'idle' | 'fileSelected' | 'compressing' | 'done'

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState<Quality>('screen')
  const [isDark, setIsDark] = useState(false)
  const [outcome, setOutcome] = useState<CompressOutcome | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  function handleFileSelect(f: File) {
    if (f.type !== 'application/pdf') {
      alert('Please select a PDF file.')
      return
    }
    setFile(f)
    setAppState('fileSelected')
  }

  function clearResult() {
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setOutcome(null)
  }

  function handleRemoveFile() {
    setFile(null)
    clearResult()
    setAppState('idle')
  }

  async function handleCompress() {
    if (!file) return
    setAppState('compressing')
    try {
      const result = await compressPdf(file, quality)
      setOutcome(result)
      if (result.mode === 'download' && result.blob) {
        const blob = result.blob
        setDownloadUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
      }
      setAppState('done')
    } catch (err) {
      if (err instanceof CancelledError) {
        setAppState('fileSelected')
        return
      }
      console.error(err)
      const message =
        (err as Error).message === 'ENCRYPTED'
          ? 'This PDF is password-protected/encrypted, which is not supported.'
          : 'Could not compress this PDF. It may be corrupted or use an unsupported format.'
      alert(message)
      setAppState('fileSelected')
    }
  }

  function handleReset() {
    setFile(null)
    setQuality('screen')
    clearResult()
    setAppState('idle')
  }

  const fileSizeLabel = file ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : ''

  return (
    <div className="min-h-screen flex flex-col bg-surface dark:bg-background text-on-surface transition-colors duration-300">
      <Header isDark={isDark} onToggleDark={() => setIsDark((d) => !d)} />

      <main className="flex-1 flex flex-col items-center pt-24 pb-8 px-padding-md">
        <div className="w-full max-w-[640px] space-y-section-gap">
          <div className="text-center space-y-2">
            <h1 className="font-bold text-headline-lg text-on-surface">Compress PDF</h1>
            <p className="text-body-md text-on-surface-variant">
              Reduce file size while preserving quality. 100% private — processed in your browser.
            </p>
          </div>

          {appState === 'done' && outcome ? (
            <ResultsCard outcome={outcome} downloadUrl={downloadUrl} onReset={handleReset} />
          ) : (
            <div className="space-y-4">
              {appState === 'idle' ? (
                <DropZone onFileSelect={handleFileSelect} />
              ) : (
                <FileInfo
                  fileName={file!.name}
                  fileSize={fileSizeLabel}
                  onRemove={handleRemoveFile}
                />
              )}

              {appState !== 'idle' && (
                <CompressionSettings quality={quality} onQualityChange={setQuality} />
              )}

              <CompressButton
                isEnabled={appState === 'fileSelected'}
                isCompressing={appState === 'compressing'}
                onCompress={handleCompress}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
