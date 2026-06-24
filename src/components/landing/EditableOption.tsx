import { useState } from 'react'
import Icon from '@/components/ui/icon'

interface EditableOptionProps {
  value: string
  checked: boolean
  isRadio?: boolean
  onToggle: () => void
  onRename: (next: string) => void
  onRemove: () => void
}

export default function EditableOption({ value, checked, isRadio, onToggle, onRename, onRemove }: EditableOptionProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== value) onRename(next)
    else setDraft(value)
  }

  return (
    <div
      className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
        checked ? 'border-[#FF5A00] bg-[#FF5A00]/10' : 'border-white/15 bg-white/[0.03] hover:border-white/30'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
          isRadio ? 'rounded-full' : 'rounded'
        } ${checked ? 'border-[#FF5A00] bg-[#FF5A00] text-black' : 'border-white/40 text-transparent'}`}
      >
        {isRadio ? (
          <span className={`h-2 w-2 rounded-full ${checked ? 'bg-black' : 'bg-transparent'}`} />
        ) : (
          <Icon name="Check" size={14} />
        )}
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="flex-1 bg-transparent text-sm text-white outline-none"
        />
      ) : (
        <span className="flex-1 cursor-pointer text-sm text-neutral-200" onClick={onToggle}>
          {value}
        </span>
      )}

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-neutral-500 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
        title="Переименовать"
      >
        <Icon name="Pencil" size={14} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="text-neutral-500 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
        title="Удалить"
      >
        <Icon name="X" size={14} />
      </button>
    </div>
  )
}