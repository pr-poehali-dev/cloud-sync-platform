import { useRef, useState, DragEvent } from 'react'
import Icon from '@/components/ui/icon'

const UPLOAD_URL = 'https://functions.poehali.dev/753eeee8-5067-4bee-942d-4f1ef52b12b8'

interface PhotoUploadProps {
  urls: string[]
  onChange: (urls: string[]) => void
}

export default function PhotoUpload({ urls, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true)
    const newUrls: string[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((res) => {
        reader.onload = (e) => res(e.target!.result as string)
        reader.readAsDataURL(file)
      })
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const json = await res.json()
      if (json.url) newUrls.push(json.url)
    }
    onChange([...urls, ...newUrls])
    setUploading(false)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
  }

  const remove = (url: string) => onChange(urls.filter((u) => u !== url))

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
          dragOver
            ? 'border-[#FF5A00] bg-[#FF5A00]/10'
            : 'border-white/20 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.04]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF5A00] border-t-transparent" />
            <span className="text-sm text-neutral-400">Загружаю...</span>
          </>
        ) : (
          <>
            <Icon name="ImagePlus" size={32} fallback="Upload" className="text-neutral-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-300">Перетащите фото или нажмите для выбора</p>
              <p className="mt-1 text-xs text-neutral-600">PNG, JPG, WEBP — любое количество</p>
            </div>
          </>
        )}
      </div>

      {/* Preview grid */}
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {urls.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
              >
                <Icon name="X" size={12} />
              </button>
            </div>
          ))}
          {/* Add more tile */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square flex items-center justify-center rounded-lg border-2 border-dashed border-white/15 text-neutral-600 transition-colors hover:border-[#FF5A00] hover:text-[#FF5A00]"
          >
            <Icon name="Plus" size={24} />
          </button>
        </div>
      )}
    </div>
  )
}
