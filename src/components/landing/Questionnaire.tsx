import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Icon from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Squares } from './squares-background'
import EditableOption from './EditableOption'
import PhotoUpload from './PhotoUpload'
import DatePicker from './DatePicker'
import AiFillModal from './AiFillModal'
import { generatePdf, FormData } from './generatePdf'
import { brand, formSections, FormField, CaseItem, emptyCase } from './formConfig'

const inputCls =
  'w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors focus:border-[#FF5A00]'

export default function Questionnaire() {
  const initialData = useMemo<FormData>(() => {
    const d: FormData = {}
    formSections.forEach((s) =>
      s.fields.forEach((f) => {
        if (f.type === 'checkbox') d[f.id] = []
        else if (f.type === 'multi-text') d[f.id] = ['']
        else if (f.type === 'cases') d[f.id] = [emptyCase()]
        else if (f.type === 'photos') d[f.id] = []
        else d[f.id] = ''
      })
    )
    return d
  }, [])

  const [data, setData] = useState<FormData>(initialData)
  const [options, setOptions] = useState<Record<string, string[]>>(() => {
    const o: Record<string, string[]> = {}
    formSections.forEach((s) => s.fields.forEach((f) => f.options && (o[f.id] = [...f.options])))
    return o
  })
  const [activeSection, setActiveSection] = useState(0)

  const setValue = (id: string, value: FormData[string]) => setData((p) => ({ ...p, [id]: value }))

  const toggleOption = (field: FormField, opt: string) => {
    if (field.type === 'radio') {
      setValue(field.id, (data[field.id] as string) === opt ? '' : opt)
    } else {
      const arr = (data[field.id] as string[]) || []
      setValue(field.id, arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt])
    }
  }

  const renameOption = (field: FormField, oldVal: string, next: string) => {
    setOptions((p) => ({ ...p, [field.id]: p[field.id].map((o) => (o === oldVal ? next : o)) }))
    if (field.type === 'radio') {
      if (data[field.id] === oldVal) setValue(field.id, next)
    } else {
      const arr = data[field.id] as string[]
      if (arr.includes(oldVal)) setValue(field.id, arr.map((x) => (x === oldVal ? next : x)))
    }
  }

  const removeOption = (field: FormField, opt: string) => {
    setOptions((p) => ({ ...p, [field.id]: p[field.id].filter((o) => o !== opt) }))
    if (field.type === 'radio') {
      if (data[field.id] === opt) setValue(field.id, '')
    } else {
      setValue(field.id, (data[field.id] as string[]).filter((x) => x !== opt))
    }
  }

  const addOption = (field: FormField) => {
    const name = `Свой вариант ${(options[field.id]?.length || 0) + 1}`
    setOptions((p) => ({ ...p, [field.id]: [...(p[field.id] || []), name] }))
  }

  // Cases helpers
  const updateCase = (fieldId: string, idx: number, key: keyof CaseItem, val: string) => {
    const cases = [...(data[fieldId] as CaseItem[])]
    cases[idx] = { ...cases[idx], [key]: val }
    setValue(fieldId, cases)
  }
  const addCase = (fieldId: string) => setValue(fieldId, [...(data[fieldId] as CaseItem[]), emptyCase()])
  const removeCase = (fieldId: string, idx: number) =>
    setValue(fieldId, (data[fieldId] as CaseItem[]).filter((_, i) => i !== idx))

  const scrollTo = (idx: number) => {
    document.getElementById(`form-section-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(idx)
  }

  const applyAiData = (ai: Record<string, unknown>) => {
    setData((prev) => {
      const next = { ...prev }
      const str = (v: unknown) => (typeof v === 'string' ? v : '')
      const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])

      if (ai.name) next.name = str(ai.name)
      if (ai.city) next.city = str(ai.city)
      if (ai.telegram) next.telegram = str(ai.telegram)
      if (ai.email) next.email = str(ai.email)
      if (ai.site) next.site = arr(ai.site).length ? arr(ai.site) : [str(ai.site)]
      if (ai.tools) next.tools = str(ai.tools)
      if (ai.pitch) next.pitch = str(ai.pitch)
      if (ai.projectsCount) next.projectsCount = str(ai.projectsCount)
      if (ai.priceFrom) next.priceFrom = str(ai.priceFrom)
      if (arr(ai.type).length) next.type = str(ai.type)
      else if (ai.type) next.type = str(ai.type)
      if (arr(ai.categories).length) next.categories = arr(ai.categories)
      if (arr(ai.niches).length) next.niches = arr(ai.niches)
      if (arr(ai.pricingType).length) next.pricingType = arr(ai.pricingType)
      if (arr(ai.workFormat).length) next.workFormat = arr(ai.workFormat)
      // Кейсы
      if (Array.isArray(ai.cases) && (ai.cases as CaseItem[]).length > 0) {
        const aiCases = (ai.cases as CaseItem[]).map((c) => ({
          client: c.client || '',
          task: c.task || '',
          done: c.done || '',
          result: c.result || '',
          contact: c.contact || '',
        }))
        next.cases = aiCases
      }
      return next
    })
    // Добавляем новые опции в чекбоксы если их нет
    setOptions((prev) => {
      const next = { ...prev }
      const merge = (fieldId: string, vals: string[]) => {
        const existing = next[fieldId] || []
        const toAdd = vals.filter((v) => !existing.includes(v))
        if (toAdd.length) next[fieldId] = [...existing, ...toAdd]
      }
      if (Array.isArray(ai.categories)) merge('categories', ai.categories as string[])
      if (Array.isArray(ai.niches)) merge('niches', ai.niches as string[])
      if (Array.isArray(ai.pricingType)) merge('pricingType', ai.pricingType as string[])
      if (Array.isArray(ai.workFormat)) merge('workFormat', ai.workFormat as string[])
      return next
    })
    scrollTo(0)
  }

  const updateMultiText = (fieldId: string, idx: number, val: string) => {
    const arr = [...(data[fieldId] as string[])]
    arr[idx] = val
    setValue(fieldId, arr)
  }
  const addMultiText = (fieldId: string) => setValue(fieldId, [...(data[fieldId] as string[]), ''])
  const removeMultiText = (fieldId: string, idx: number) =>
    setValue(fieldId, (data[fieldId] as string[]).filter((_, i) => i !== idx))

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            className={inputCls}
            placeholder={field.placeholder || ''}
            value={(data[field.id] as string) || ''}
            onChange={(e) => setValue(field.id, e.target.value)}
          />
        )
      case 'multi-text':
        return (
          <div className="space-y-2">
            {(data[field.id] as string[]).map((val, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder={field.placeholder || ''}
                  value={val}
                  onChange={(e) => updateMultiText(field.id, idx, e.target.value)}
                />
                {(data[field.id] as string[]).length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMultiText(field.id, idx)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 text-neutral-500 transition-colors hover:border-red-400/50 hover:text-red-400"
                  >
                    <Icon name="X" size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addMultiText(field.id)}
              className="flex items-center gap-2 rounded-lg border border-dashed border-white/20 px-4 py-2 text-sm text-neutral-400 transition-colors hover:border-[#FF5A00] hover:text-[#FF5A00]"
            >
              <Icon name="Plus" size={16} /> Добавить ещё
            </button>
          </div>
        )
      case 'textarea':
        return (
          <textarea
            rows={4}
            className={inputCls + ' resize-none'}
            placeholder={field.placeholder || ''}
            value={(data[field.id] as string) || ''}
            onChange={(e) => setValue(field.id, e.target.value)}
          />
        )
      case 'radio':
      case 'checkbox':
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            {options[field.id]?.map((opt) => (
              <EditableOption
                key={opt}
                value={opt}
                isRadio={field.type === 'radio'}
                checked={
                  field.type === 'radio'
                    ? data[field.id] === opt
                    : (data[field.id] as string[])?.includes(opt)
                }
                readonly={field.noCustom}
                onToggle={() => toggleOption(field, opt)}
                onRename={(next) => renameOption(field, opt, next)}
                onRemove={() => removeOption(field, opt)}
              />
            ))}
            {!field.noCustom && (
              <button
                type="button"
                onClick={() => addOption(field)}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 px-3 py-2 text-sm text-neutral-400 transition-colors hover:border-[#FF5A00] hover:text-[#FF5A00]"
              >
                <Icon name="Plus" size={16} /> Добавить вариант
              </button>
            )}
          </div>
        )
      case 'date':
        return (
          <DatePicker
            value={(data[field.id] as string) || ''}
            onChange={(val) => setValue(field.id, val)}
          />
        )
      case 'cases':
        return (
          <div className="space-y-4">
            {(data[field.id] as CaseItem[]).map((c, i) => (
              <div key={i} className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#FF5A00]">
                    Кейс {i + 1} {i === 0 && <span className="text-neutral-500">(обязательно)</span>}
                  </span>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => removeCase(field.id, i)}
                      className="text-neutral-500 hover:text-red-400"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  )}
                </div>
                <div className="grid gap-2">
                  {(
                    [
                      ['client', 'Клиент / ниша'],
                      ['task', 'Задача'],
                      ['done', 'Что сделали'],
                      ['result', 'Результат в цифрах'],
                      ['contact', 'Контакт клиента для подтверждения'],
                    ] as [keyof CaseItem, string][]
                  ).map(([key, label]) => (
                    <input
                      key={key}
                      className={inputCls}
                      placeholder={label}
                      value={c[key]}
                      onChange={(e) => updateCase(field.id, i, key, e.target.value)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addCase(field.id)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 px-3 py-3 text-sm text-neutral-400 transition-colors hover:border-[#FF5A00] hover:text-[#FF5A00]"
            >
              <Icon name="Plus" size={16} /> Добавить кейс
            </button>
          </div>
        )
      case 'photos':
        return (
          <PhotoUpload
            urls={data[field.id] as string[]}
            onChange={(urls) => setValue(field.id, urls)}
          />
        )
    }
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-60">
        <Squares direction="diagonal" speed={0.4} squareSize={44} borderColor="#1f1f1f" hoverFillColor="#161616" />
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-white">Лидер <span className="text-[#FF5A00]">Франшиз</span></span>
            <span className="text-neutral-600">·</span>
            <span className="font-semibold text-white">Лидер <span className="text-[#FF5A00]">ИИ</span></span>
          </div>
          <Button
            onClick={() => generatePdf(data)}
            className="gap-2 bg-[#FF5A00] text-black hover:bg-[#ff7a33]"
          >
            <Icon name="Download" size={18} /> Скачать PDF
          </Button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl px-5 py-12">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#FF5A00]">{brand.eyebrow}</span>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            <h1 className="flex-1 text-3xl font-bold leading-tight tracking-tight md:text-5xl">{brand.heroTitle}</h1>
            <div className="pt-1">
              <AiFillModal onFill={applyAiData} />
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-neutral-400">{brand.heroSubtitle}</p>
        </motion.div>

        {/* Section nav */}
        <div className="mt-10 flex flex-wrap gap-1.5">
          {formSections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => scrollTo(i)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-medium transition-colors ${
                i === activeSection
                  ? 'border-[#FF5A00] bg-[#FF5A00]/15 text-[#FF5A00]'
                  : 'border-white/15 text-neutral-400 hover:border-white/40 hover:text-white'
              }`}
            >
              {s.number}. {s.title}
            </button>
          ))}
        </div>

        {/* Sections */}
        <div className="mt-12 space-y-16">
          {formSections.map((section, idx) => (
            <motion.section
              id={`form-section-${idx}`}
              key={section.id}
              className="scroll-mt-24"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
              onViewportEnter={() => setActiveSection(idx)}
            >
              <div className="mb-6 border-t border-[#FF5A00]/40 pt-5">
                <h2 className="text-xl font-bold text-[#FF5A00] md:text-2xl">
                  {section.number}. {section.title}
                </h2>
                {section.intro && <p className="mt-2 text-sm italic text-neutral-500">{section.intro}</p>}
              </div>

              <div className="space-y-7">
                {section.fields.map((field) => (
                  <div key={field.id}>
                    <label className="mb-2 block text-sm font-semibold text-white">
                      {field.label}
                      {field.required && <span className="ml-1 text-[#FF5A00]">*</span>}
                    </label>
                    {field.hint && <p className="mb-3 text-xs italic text-neutral-500">{field.hint}</p>}
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* Footer / submit */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h3 className="text-lg font-semibold text-white">Готовы отправить анкету?</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-400">
            Скачайте PDF и отправьте в Telegram или на почту — мы создадим вашу карточку в каталоге.
          </p>

          {/* Primary: download */}
          <Button
            onClick={() => generatePdf(data)}
            size="lg"
            className="mt-6 gap-2 bg-[#FF5A00] text-black hover:bg-[#ff7a33]"
          >
            <Icon name="Download" size={20} /> Скачать PDF
          </Button>

          {/* Send buttons */}
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={`https://t.me/${brand.footerTelegram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition-colors hover:border-[#FF5A00] hover:text-[#FF5A00]"
            >
              <Icon name="Send" size={18} />
              Написать в Telegram
              <span className="ml-1 text-neutral-500">{brand.footerTelegram}</span>
            </a>
            <a
              href={`mailto:${brand.footerEmail}?subject=${encodeURIComponent('Анкета ИИ-специалиста — каталог Лидер ИИ')}&body=${encodeURIComponent('Добрый день!\n\nОтправляю заполненную анкету специалиста для размещения в каталоге «Лидер ИИ» / «Лидер Франшиз».\n\nАнкета в приложении к письму (PDF).\n\nС уважением,')}`}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition-colors hover:border-[#FF5A00] hover:text-[#FF5A00]"
            >
              <Icon name="Mail" size={18} />
              Отправить на почту
              <span className="ml-1 text-neutral-500">{brand.footerEmail}</span>
            </a>
          </div>

          <p className="mt-6 text-xs text-neutral-600">{brand.footerNote}</p>
        </div>
      </div>
    </div>
  )
}