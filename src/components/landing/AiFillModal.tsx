import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/components/ui/icon'
import { Button } from '@/components/ui/button'

const AI_URL = 'https://functions.poehali.dev/753eeee8-5067-4bee-942d-4f1ef52b12b8'

interface AiFillModalProps {
  onFill: (data: Record<string, unknown>) => void
}

type Stage = 'input' | 'loading' | 'done' | 'error'

const STEPS = [
  'Загружаю страницы...',
  'Читаю документы...',
  'Извлекаю данные...',
  'Заполняю анкету...',
]

interface AttachedFile {
  name: string
  b64: string
  type: string
}

export default function AiFillModal({ onFill }: AiFillModalProps) {
  const [open, setOpen] = useState(false)
  const [urls, setUrls] = useState('')
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [stage, setStage] = useState<Stage>('input')
  const [step, setStep] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const close = () => {
    setOpen(false)
    setTimeout(() => { setStage('input'); setUrls(''); setFiles([]); setStep(0) }, 300)
  }

  const readFile = (file: File): Promise<AttachedFile> =>
    new Promise((res) => {
      const reader = new FileReader()
      reader.onload = (e) => res({ name: file.name, b64: (e.target!.result as string).split(',')[1], type: file.type })
      reader.readAsDataURL(file)
    })

  const addFiles = async (fileList: FileList | File[]) => {
    const allowed = Array.from(fileList).filter((f) =>
      ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(f.type)
    )
    const read = await Promise.all(allowed.map(readFile))
    setFiles((prev) => [...prev, ...read])
  }

  const removeFile = (name: string) => setFiles((prev) => prev.filter((f) => f.name !== name))

  const canRun = urls.trim() || files.length > 0

  const run = async () => {
    if (!canRun) return
    setStage('loading')
    setStep(0)
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2000)

    try {
      const list = urls.split('\n').map((s) => s.trim()).filter(Boolean)
      const res = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai-fill', urls: list, files }),
      })
      const data = await res.json()
      clearInterval(ticker)
      if (!res.ok || data.error) throw new Error(data.error || 'Ошибка сервера')
      setStage('done')
      setTimeout(() => { onFill(data); close() }, 1200)
    } catch (e: unknown) {
      clearInterval(ticker)
      setErrorMsg(e instanceof Error ? e.message : 'Неизвестная ошибка')
      setStage('error')
    }
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="group relative flex items-center gap-2 overflow-hidden rounded-full border border-violet-500/60 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 px-4 py-2 text-sm font-semibold text-violet-300 transition-all hover:border-violet-400 hover:from-violet-600/30 hover:to-fuchsia-600/30 hover:text-white"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
        </span>
        ✦ Заполнить с помощью AI
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />

            <motion.div
              className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 shadow-2xl"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <button onClick={close} className="absolute right-4 top-4 text-neutral-600 hover:text-white">
                <Icon name="X" size={20} />
              </button>

              {/* Header */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-lg">✦</div>
                <div>
                  <h2 className="font-bold text-white">Автозаполнение AI</h2>
                  <p className="text-xs text-neutral-500">Ссылки или документы — AI заполнит анкету за вас</p>
                </div>
              </div>

              {/* Stage: input */}
              {stage === 'input' && (
                <div className="space-y-4">
                  {/* URLs */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-300">
                      Ссылки на профили или сайт
                    </label>
                    <textarea
                      className="w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors focus:border-violet-500"
                      rows={3}
                      placeholder={'https://t.me/username\nhttps://yoursite.ru\nhttps://hh.ru/resume/...'}
                      value={urls}
                      onChange={(e) => setUrls(e.target.value)}
                    />
                  </div>

                  {/* File drop zone */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-300">
                      Или прикрепите документы
                    </label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
                      onClick={() => fileRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed py-5 transition-colors ${
                        dragOver ? 'border-violet-500 bg-violet-500/10' : 'border-white/15 hover:border-violet-500/50 hover:bg-white/[0.02]'
                      }`}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={(e) => e.target.files && addFiles(e.target.files)}
                      />
                      <Icon name="FileUp" size={24} className="text-neutral-500" fallback="Upload" />
                      <p className="text-sm text-neutral-400">Перетащите или нажмите для выбора</p>
                      <p className="text-xs text-neutral-600">PDF, DOC, DOCX, TXT</p>
                    </div>

                    {/* Attached files list */}
                    {files.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {files.map((f) => (
                          <div key={f.name} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                            <Icon name="FileText" size={16} className="shrink-0 text-violet-400" />
                            <span className="flex-1 truncate text-xs text-neutral-300">{f.name}</span>
                            <button type="button" onClick={() => removeFile(f.name)} className="text-neutral-600 hover:text-red-400">
                              <Icon name="X" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-neutral-600">
                    Telegram, сайт, HH.ru, Авито, Notion, Tilda — любые публичные страницы
                  </p>

                  <Button
                    onClick={run}
                    disabled={!canRun}
                    className="w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40"
                  >
                    <Icon name="Sparkles" size={18} /> Заполнить анкету
                  </Button>
                </div>
              )}

              {/* Stage: loading */}
              {stage === 'loading' && (
                <div className="flex flex-col items-center gap-5 py-6">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-violet-500" />
                    <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-fuchsia-400 [animation-direction:reverse]" />
                    <span className="text-xl">✦</span>
                  </div>
                  <div className="text-center">
                    <AnimatePresence mode="wait">
                      <motion.p key={step} className="text-sm font-medium text-violet-300"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                        {STEPS[step]}
                      </motion.p>
                    </AnimatePresence>
                    <p className="mt-1 text-xs text-neutral-600">Обычно занимает 10–30 секунд</p>
                  </div>
                  <div className="flex gap-1.5">
                    {STEPS.map((_, i) => (
                      <div key={i} className={`h-1 w-8 rounded-full transition-colors duration-700 ${i <= step ? 'bg-violet-500' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>
              )}

              {/* Stage: done */}
              {stage === 'done' && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                    <Icon name="CheckCircle" size={32} />
                  </div>
                  <p className="font-semibold text-white">Анкета заполнена!</p>
                  <p className="text-sm text-neutral-500">Проверьте данные и при необходимости отредактируйте</p>
                </div>
              )}

              {/* Stage: error */}
              {stage === 'error' && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                    <Icon name="AlertCircle" size={32} />
                  </div>
                  <p className="font-semibold text-white">Что-то пошло не так</p>
                  <p className="text-center text-sm text-neutral-500">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => setStage('input')}
                    className="rounded-xl border border-white/20 bg-transparent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Попробовать снова
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}