import { useRef } from 'react'

interface DropZoneProps {
  onFileSelect: (file: File) => void
}

export function DropZone({ onFileSelect }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.currentTarget.classList.add('drop-zone-active')
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.currentTarget.classList.remove('drop-zone-active')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.currentTarget.classList.remove('drop-zone-active')
    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }

  return (
    <div
      className="border-2 border-dashed border-outline-variant rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-surface-container-low transition-all duration-200"
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-primary text-5xl">upload_file</span>
        <p className="font-semibold text-on-surface text-body-md">Drop your PDF here</p>
        <p className="text-on-surface-variant text-body-sm">
          or <span className="text-primary font-medium">choose file</span> from your device
        </p>
      </div>
    </div>
  )
}
