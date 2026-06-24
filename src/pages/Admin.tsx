import { useState, useEffect } from 'react'
import { FormData } from '@/components/landing/generatePdf'
import { CaseItem } from '@/components/landing/formConfig'
import Icon from '@/components/ui/icon'

const BACKEND_URL = 'https://functions.poehali.dev/753eeee8-5067-4bee-942d-4f1ef52b12b8'
const ADMIN_TOKEN = 'leader-ai-admin-2024'

interface Submission {
  id: number
  created_at: string
  name: string
  city: string
  telegram: string
  email: string
  type: string
  data: FormData
}

export default function Admin() {
  const [token, setToken] = useState('')
  const [authed, setAuthed] = useState(false)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Submission | null>(null)
  const [error, setError] = useState('')

  const login = () => {
    if (token === ADMIN_TOKEN) { setAuthed(true); load(token) }
    else setError('Неверный пароль')
  }

  const load = async (t: string) => {
    setLoading(true)
    try {
      const res = await fetch(BACKEND_URL, { headers: { 'X-Admin-Token': t } })
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setSubmissions(json.submissions || [])
    } catch (e) {
      setError('Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="mb-6 flex items-center gap-3">
            <Icon name="Settings" size={24} className="text-[#FF5A00]" />
            <h1 className="text-lg font-bold text-white">Панель администратора</h1>
          </div>
          <input
            type="password"
            className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-[#FF5A00] mb-3"
            placeholder="Пароль"
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
          <button
            onClick={login}
            className="w-full rounded-lg bg-[#FF5A00] py-3 text-sm font-semibold text-black hover:bg-[#ff7a33] transition-colors"
          >
            Войти
          </button>
        </div>
      </div>
    )
  }

  if (selected) {
    const d = selected.data
    const photos = Array.isArray(d.portfolioPhotos) ? (d.portfolioPhotos as string[]).filter(Boolean) : []
    const cases = Array.isArray(d.cases) ? (d.cases as CaseItem[]) : []

    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white"><div className="max-w-3xl mx-auto p-6">
        <button onClick={() => setSelected(null)} className="mb-6 flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
          <Icon name="ArrowLeft" size={16} /> Назад к списку
        </button>

        <div className="flex items-start gap-4 mb-6">
          {typeof d.photo === 'string' && d.photo && (
            <img src={d.photo} className="w-16 h-16 rounded-full object-cover border-2 border-[#FF5A00]" />
          )}
          <div>
            <h1 className="text-xl font-bold">{selected.name || '—'}</h1>
            <p className="text-sm text-neutral-400">{[selected.type, selected.city].filter(Boolean).join(' · ')}</p>
            <p className="text-xs text-neutral-600 mt-1">{new Date(selected.created_at).toLocaleString('ru')}</p>
          </div>
        </div>

        {[
          ['Telegram', selected.telegram],
          ['Email', selected.email],
          ['Сайт', Array.isArray(d.site) ? (d.site as string[]).join(', ') : d.site],
          ['Категории', Array.isArray(d.categories) ? (d.categories as string[]).join(', ') : ''],
          ['Ниши', Array.isArray(d.niches) ? (d.niches as string[]).join(', ') : ''],
          ['Инструменты', d.tools],
          ['Описание', d.pitch],
          ['Проектов', d.projectsCount],
          ['Стоимость', Array.isArray(d.pricingType) ? (d.pricingType as string[]).join(', ') : ''],
          ['Цена от', d.priceFrom],
          ['Формат', Array.isArray(d.workFormat) ? (d.workFormat as string[]).join(', ') : ''],
          ['Сроки', d.terms],
          ['Портфолио', d.portfolio],
          ['Отзывы', d.reviews],
        ].map(([label, val]) => val ? (
          <div key={label as string} className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">{label}</div>
            <div className="text-sm text-white">{val as string}</div>
          </div>
        ) : null)}

        {cases.filter(c => c.task || c.done).length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">Кейсы</div>
            {cases.filter(c => c.task || c.done).map((c, i) => (
              <div key={i} className="mb-3 rounded-lg border-l-2 border-[#FF5A00] bg-white/[0.03] pl-4 pr-3 py-3">
                <div className="font-semibold text-sm text-[#FF5A00] mb-1">Кейс {i + 1}{c.client ? ` — ${c.client}` : ''}</div>
                {c.task && <div className="text-xs text-neutral-300 mb-1"><span className="text-neutral-500">Задача: </span>{c.task}</div>}
                {c.done && <div className="text-xs text-neutral-300 mb-1"><span className="text-neutral-500">Что сделали: </span>{c.done}</div>}
                {c.result && <div className="text-xs text-neutral-300"><span className="text-neutral-500">Результат: </span>{c.result}</div>}
              </div>
            ))}
          </div>
        )}

        {photos.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">Фото из портфолио</div>
            <div className="flex flex-wrap gap-2">
              {photos.map((url, i) => (
                <img key={i} src={url} className="w-28 h-20 object-cover rounded-lg border border-white/10" />
              ))}
            </div>
          </div>
        )}
      </div></div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon name="Settings" size={22} className="text-[#FF5A00]" />
          <h1 className="text-xl font-bold">Анкеты специалистов</h1>
          <span className="rounded-full bg-[#FF5A00]/20 px-2.5 py-0.5 text-xs font-semibold text-[#FF5A00]">{submissions.length}</span>
        </div>
        <button onClick={() => load(ADMIN_TOKEN)} className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors">
          <Icon name="RefreshCw" size={14} /> Обновить
        </button>
      </div>

      {loading && <div className="text-sm text-neutral-500">Загрузка...</div>}

      {!loading && submissions.length === 0 && (
        <div className="text-sm text-neutral-500 text-center py-16">Анкет пока нет</div>
      )}

      <div className="space-y-2">
        {submissions.map(s => (
          <button
            key={s.id}
            onClick={() => setSelected(s)}
            className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 hover:border-[#FF5A00]/50 hover:bg-white/[0.05] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FF5A00]/20 flex items-center justify-center text-xs font-bold text-[#FF5A00]">
                  {(s.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">{s.name || '—'}</div>
                  <div className="text-xs text-neutral-500">{[s.type, s.city].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-400">{s.telegram || s.email}</div>
                <div className="text-xs text-neutral-600">{new Date(s.created_at).toLocaleDateString('ru')}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      </div>
    </div>
  )
}