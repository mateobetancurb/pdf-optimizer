import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { DropZone } from './components/DropZone'
import { FileInfo } from './components/FileInfo'
import { CompressionSettings, type Quality } from './components/CompressionSettings'
import { CompressButton } from './components/CompressButton'
import { ResultsCard } from './components/ResultsCard'

type AppState = 'idle' | 'fileSelected' | 'compressing' | 'done'

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState<Quality>('screen')
  const [isDark, setIsDark] = useState(false)
  const [compressedSize, setCompressedSize] = useState(0)

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

  function handleRemoveFile() {
    setFile(null)
    setAppState('idle')
  }

  function handleCompress() {
    setAppState('compressing')
    setTimeout(() => {
      const originalMB = file!.size / (1024 * 1024)
      setCompressedSize(originalMB * 0.37)
      setAppState('done')
    }, 2000)
  }

  function handleReset() {
    setFile(null)
    setQuality('screen')
    setCompressedSize(0)
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

          {appState === 'done' ? (
            <ResultsCard
              originalSize={file!.size / (1024 * 1024)}
              compressedSize={compressedSize}
              onReset={handleReset}
            />
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
