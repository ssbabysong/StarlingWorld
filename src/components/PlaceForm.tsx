import { useState, type FormEvent } from 'react'

export interface PlaceDraft {
  name: string
  date: string
  note: string
}

interface Props {
  initial: PlaceDraft
  submitLabel: string
  onSubmit: (draft: PlaceDraft) => void
  onCancel: () => void
}

export default function PlaceForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState(initial)
  const set = (k: keyof PlaceDraft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    onSubmit({ ...draft, name: draft.name.trim(), note: draft.note.trim() })
  }

  return (
    <form className="place-form" onSubmit={submit}>
      <label>
        名称
        <input value={draft.name} onChange={set('name')} placeholder="例如：京都 · 清水寺" autoFocus required />
      </label>
      <label>
        日期
        <input type="date" value={draft.date} onChange={set('date')} />
      </label>
      <label>
        备注
        <textarea value={draft.note} onChange={set('note')} rows={3} placeholder="和谁一起、印象最深的事……" />
      </label>
      <div className="row">
        <button type="submit" className="btn primary">
          {submitLabel}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
