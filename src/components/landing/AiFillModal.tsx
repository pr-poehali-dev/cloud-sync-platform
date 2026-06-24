import { useState } from 'react'
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
  'Анализирую контент...',
  'Извлекаю данные...',
  'Заполняю анкету...',
]

export default function AiFillModal({ onFill }: AiFillModalProps) {
  const [open, setOpen] = useState(false)
  const [urls, setUrls] = useState('')
  const [stage, setStage] = useState<Stage>('input')
  const [step, setStep] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const close = () => {
    setOpen(false)
    setTimeout(() => { setStage('input'); setUrls(''); setStep(0) }, 300)
  }

  const run = async () => {
    const list = urls.split('\n').map(s => s.trim()).filter(Boolean)
    if (!list.length) return

    setStage('loading')
    setStep(0)

    // Анимируем шаги пока идёт запрос
    const ticker = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 1800)

    try {
      const res = await fetch(`${AI_URL}/ai-fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: list }),
      })
      const data = await res.json()
      clearInterval(ticker)

      if (!res.ok || data.error) throw new Error(data.error || 'Ошибка сервера')

      setStage('done')
      setTimeout(() => {
        onFill(data)
        close()
      }, 1200)
    } catch (e: unknown) {
      clearInterval(ticker)
      setErrorMsg(e instanceof Error ? e.message : 'Неизвестная ошибка')
      setStage('error')
    }
  }

  return (
    <>
      {/* Trigger button */}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />

            <motion.div
              className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 shadow-2xl"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              {/* Close */}
              <button onClick={close} className="absolute right-4 top-4 text-neutral-600 hover:text-white">
                <Icon name="X" size={20} />
              </button>

              {/* Header */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-lg">
                  ✦
                </div>
                <div>
                  <h2 className="font-bold text-white">Автозаполнение AI</h2>
                  <p className="text-xs text-neutral-500">Вставьте ссылки — AI заполнит анкету за вас</p>
                </div>
              </div>

              {/* Stage: input */}
              {stage === 'input' && (
                <>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Ссылки на ваши профили или сайт
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors focus:border-violet-500 resize-none"
                    rows={5}
                    placeholder={`https://t.me/username\nhttps://yoursite.ru\nhttps://hh.ru/resume/...\nhttps://avito.ru/...`}
                    value={urls}
                    onChange={e => setUrls(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-neutral-600">
                    Подойдёт Telegram, сайт, HH.ru, Авито, Notion, Tilda — любые публичные страницы
                  </p>
                  <Button
                    onClick={run}
                    disabled={!urls.trim()}
                    className="mt-4 w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40"
                  >
                    <Icon name="Sparkles" size={18} /> Заполнить анкету
                  </Button>
                </>
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
                      <motion.p
                        key={step}
                        className="text-sm font-medium text-violet-300"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                      >
                        {STEPS[step]}
                      </motion.p>
                    </AnimatePresence>
                    <p className="mt-1 text-xs text-neutral-600">Обычно занимает 10–20 секунд</p>
                  </div>
                  <div className="flex gap-1.5">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 w-8 rounded-full transition-colors duration-700 ${i <= step ? 'bg-violet-500' : 'bg-white/10'}`}
                      />
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
                  <Button onClick={() => setStage('input')} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    Попробовать снова
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
