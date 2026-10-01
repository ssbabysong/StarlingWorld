import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { formatCoords, formatDate } from '../format'
import { continentZh, countryNameZh, searchPlaces, type SearchResult } from '../geo'
import type { CountryFeature, Place } from '../types'
import Icon from './Icon'
import Sheet from './Sheet'

export interface PlaceDraft {
  name: string
  date: string
  note: string
}

function SheetHeader({ title, sub, tag }: { title: string; sub?: ReactNode; tag?: string }) {
  return (
    <header className="sheet-head">
      <h2>
        {title}
        {tag && <span className="tag">{tag}</span>}
      </h2>
      {sub && <p>{sub}</p>}
    </header>
  )
}

/* ------------------------------------------------------------------ form */

function PlaceForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: PlaceDraft
  submitLabel: string
  onSubmit: (d: PlaceDraft) => void
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const set = (k: keyof PlaceDraft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    onSubmit({ ...draft, name: draft.name.trim(), note: draft.note.trim() })
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="group">
        <label className="field">
          <span>名称</span>
          <input value={draft.name} onChange={set('name')} placeholder="例如 京都" required />
        </label>
        <label className="field">
          <span>日期</span>
          <input type="date" value={draft.date} onChange={set('date')} />
        </label>
        <label className="field top">
          <span>备注</span>
          <textarea value={draft.note} onChange={set('note')} rows={3} placeholder="写点什么（可选）" />
        </label>
      </div>
      <div className="actions">
        {onCancel && (
          <button type="button" className="btn secondary" onClick={onCancel}>
            取消
          </button>
        )}
        <button type="submit" className="btn primary" disabled={!draft.name.trim()}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

/* ---------------------------------------------------------------- search */

export function SearchSheet({ onPick, onClose }: { onPick: (r: SearchResult) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const abortRef = useRef<AbortController | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStatus('loading')
    try {
      setResults(await searchPlaces(q, ctrl.signal))
      setStatus('idle')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setStatus('error')
    }
  }

  return (
    <Sheet modal tall onClose={onClose}>
      <SheetHeader title="添加地点" />
      <form className="search" onSubmit={submit}>
        <Icon name="search" size={17} />
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="城市、景点或地址"
          autoFocus
        />
        {status === 'loading' && <span className="spinner" />}
      </form>

      {status === 'error' && <p className="hint">搜索失败，请检查网络后重试</p>}
      {results && results.length === 0 && <p className="hint">没有找到相关地点</p>}

      {results && results.length > 0 && (
        <ul className="list">
          {results.map((r, i) => (
            <li key={i}>
              <button className="list-row" onClick={() => onPick(r)}>
                <span className="list-icon">
                  <Icon name="pin" size={16} />
                </span>
                <span className="list-text">
                  <b>{r.name}</b>
                  <small>{r.fullName}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!results && status !== 'error' && <p className="hint">也可以直接在地球上轻点任意位置添加。</p>}
    </Sheet>
  )
}

/* ------------------------------------------------------------- add place */

export function AddPlaceSheet({
  lat,
  lng,
  name,
  countryName,
  onSave,
  onClose,
}: {
  lat: number
  lng: number
  name?: string
  countryName: string
  onSave: (d: PlaceDraft) => void
  onClose: () => void
}) {
  return (
    <Sheet modal onClose={onClose}>
      <SheetHeader title={countryName} sub={formatCoords(lat, lng)} />
      <PlaceForm
        key={`${lat},${lng}`}
        initial={{ name: name ?? '', date: new Date().toISOString().slice(0, 10), note: '' }}
        submitLabel="保存"
        onSubmit={onSave}
      />
    </Sheet>
  )
}

/* --------------------------------------------------------------- country */

export function CountrySheet({
  country,
  isVisited,
  markedDirectly,
  places,
  onToggle,
  onAddHere,
  onOpenPlace,
  onClose,
}: {
  country: CountryFeature
  isVisited: boolean
  markedDirectly: boolean
  places: Place[]
  onToggle: () => void
  onAddHere: () => void
  onOpenPlace: (p: Place) => void
  onClose: () => void
}) {
  const lockedByPlaces = isVisited && !markedDirectly
  return (
    <Sheet onClose={onClose}>
      <SheetHeader
        title={countryNameZh(country)}
        tag={isVisited ? '去过' : undefined}
        sub={`${continentZh(country.properties.continent)} · ${country.properties.name}`}
      />

      <div className="actions">
        {!lockedByPlaces && (
          <button className={`btn ${isVisited ? 'secondary' : 'primary'}`} onClick={onToggle}>
            {isVisited ? '取消标记' : '标记为去过'}
          </button>
        )}
        <button className="btn secondary" onClick={onAddHere}>
          添加地点
        </button>
      </div>

      {places.length > 0 && (
        <>
          <p className="group-label">{places.length} 个地点</p>
          <ul className="list group">
            {places.map((p) => (
              <li key={p.id}>
                <button className="list-row" onClick={() => onOpenPlace(p)}>
                  <span className="dot" />
                  <span className="list-text">
                    <b>{p.name}</b>
                  </span>
                  <small className="list-meta">{p.date ? formatDate(p.date) : ''}</small>
                  <Icon name="chevron" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}

/* ----------------------------------------------------------------- place */

export function PlaceSheet({
  place,
  countryName,
  onUpdate,
  onDelete,
  onClose,
}: {
  place: Place
  countryName: string
  onUpdate: (d: PlaceDraft) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  return (
    <Sheet onClose={onClose} modal={editing}>
      <SheetHeader
        title={editing ? '编辑地点' : place.name}
        sub={[countryName, place.date && formatDate(place.date)].filter(Boolean).join(' · ')}
      />

      {editing ? (
        <PlaceForm
          initial={{ name: place.name, date: place.date ?? '', note: place.note ?? '' }}
          submitLabel="保存"
          onSubmit={(d) => {
            onUpdate(d)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {place.note && <p className="note">{place.note}</p>}
          <div className="actions">
            <button className="btn secondary" onClick={() => setEditing(true)}>
              编辑
            </button>
            <button
              className={`btn ${confirming ? 'danger' : 'secondary danger-text'}`}
              onClick={() => (confirming ? onDelete() : setConfirming(true))}
              onBlur={() => setConfirming(false)}
            >
              {confirming ? '确认删除' : '删除'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
