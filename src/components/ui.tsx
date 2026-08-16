import { useCallback, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import type { Toast } from './useToasts'
import './ui.css'

/* ─────────────────────────────────────────────
   TagInput — type, press Enter, get a chip.
   Replaces "newline or comma separated, or JSON
   array" textareas, which asked users to hand-
   author JSON.
   ───────────────────────────────────────────── */

type TagInputProps = {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  id?: string
}

export function TagInput({ value, onChange, placeholder, id }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const commit = useCallback(
    (raw: string) => {
      // Accept a paste of comma/newline separated values in one go.
      const parts = raw
        .split(/[\n,]/)
        .map((p) => p.trim())
        .filter(Boolean)
      if (!parts.length) return
      const next = [...value]
      for (const part of parts) {
        if (!next.some((v) => v.toLowerCase() === part.toLowerCase())) next.push(part)
      }
      onChange(next)
      setDraft('')
    },
    [value, onChange],
  )

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index))

  return (
    <div className="tag-input" onClick={() => inputRef.current?.focus()}>
      {value.map((tag, i) => (
        <span className="tag-chip" key={`${tag}-${i}`}>
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeAt(i)
            }}
            aria-label={`Remove ${tag}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}

      <input
        id={id}
        ref={inputRef}
        className="tag-input-field"
        value={draft}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit(draft)
          } else if (e.key === 'Backspace' && !draft && value.length) {
            removeAt(value.length - 1)
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text')
          if (/[\n,]/.test(text)) {
            e.preventDefault()
            commit(text)
          }
        }}
        // Don't silently drop what the user typed when focus moves away.
        onBlur={() => commit(draft)}
      />

      {draft.trim() ? (
        <button type="button" className="tag-add" onClick={() => commit(draft)} aria-label="Add">
          <Plus size={13} />
        </button>
      ) : null}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Toasts — transient confirmation so actions
   don't complete silently.
   ───────────────────────────────────────────── */

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.tone === 'ok' ? <Check size={14} /> : <X size={14} />}
          <span>{t.text}</span>
          <button type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SaveBar — appears only when there is something
   to save, so the page isn't cluttered at rest.
   ───────────────────────────────────────────── */

export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  label = 'You have unsaved changes',
}: {
  dirty: boolean
  saving: boolean
  onSave: () => void
  onDiscard: () => void
  label?: string
}) {
  return (
    <div className={dirty ? 'save-bar is-open' : 'save-bar'} aria-hidden={!dirty}>
      <span className="save-bar-label">{label}</span>
      <div className="save-bar-actions">
        <button type="button" className="save-bar-ghost" onClick={onDiscard} disabled={saving}>
          Discard
        </button>
        <button type="button" className="save-bar-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
