import { useState } from 'react'
import Icon from '@/components/ui/icon'

interface DatePickerProps {
  value: string
  onChange: (val: string) => void
}

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const selected = value ? new Date(value) : null

  const firstDay = new Date(view.year, view.month, 1)
  // Monday-based offset
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const select = (day: number) => {
    const d = new Date(view.year, view.month, day)
    onChange(d.toISOString().split('T')[0])
    setOpen(false)
  }

  const prev = () => {
    setView((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  }
  const next = () => {
    setView((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })
  }

  const isSelected = (day: number) =>
    selected &&
    selected.getFullYear() === view.year &&
    selected.getMonth() === view.month &&
    selected.getDate() === day

  const isToday = (day: number) =>
    today.getFullYear() === view.year &&
    today.getMonth() === view.month &&
    today.getDate() === day

  const displayValue = selected
    ? selected.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
          open ? 'border-[#FF5A00]' : 'border-white/15 hover:border-white/30'
        } bg-white/[0.03] text-left`}
      >
        <span className={displayValue ? 'text-white' : 'text-neutral-600'}>
          {displayValue || 'Выберите дату'}
        </span>
        <Icon name="CalendarDays" size={18} className="shrink-0 text-neutral-500" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/15 bg-[#111] p-4 shadow-2xl">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={prev} className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white">
              <Icon name="ChevronLeft" size={18} />
            </button>
            <span className="text-sm font-semibold text-white">
              {MONTHS[view.month]} {view.year}
            </span>
            <button type="button" onClick={next} className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white">
              <Icon name="ChevronRight" size={18} />
            </button>
          </div>

          {/* Day names */}
          <div className="mb-2 grid grid-cols-7 text-center">
            {DAYS.map((d) => (
              <span key={d} className="py-1 text-xs font-medium text-neutral-600">{d}</span>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {cells.map((day, i) => {
              if (!day) return <span key={i} />
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(day)}
                  className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors ${
                    isSelected(day)
                      ? 'bg-[#FF5A00] font-bold text-black'
                      : isToday(day)
                      ? 'border border-[#FF5A00]/50 text-[#FF5A00]'
                      : 'text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-3 border-t border-white/10 pt-3 text-center">
            <button
              type="button"
              onClick={() => {
                onChange(today.toISOString().split('T')[0])
                setOpen(false)
              }}
              className="text-xs text-neutral-500 hover:text-[#FF5A00]"
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
