import { useRef, useState, type FormEvent } from 'react'
import { continentZh, countryNameZh, searchPlaces, type SearchResult } from '../geo'
import type { CountryFeature, Place } from '../types'
import { formatCoords, formatDate } from '../format'
import Icon from './Icon'
import Sheet from './Sheet'

export interface PlaceDraft {
  name: string
  date: string
  note: string
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
      <label className="field">
        <span>名称</span>
        <input value={draft.name} onChange={set('name')} placeholder="例如：京都 · 清水寺" required />
      </label>
      <label className="field">
        <span>到访日期</span>
        <input type="date" value={draft.date} onChange={set('date')} />
      </label>
      <label className="field">
        <span>随笔</span>
        <textarea value={draft.note} onChange={set('note')} rows={3} placeholder="和谁一起、印象最深的瞬间……" />
      </label>
      <div className="actions">
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            取消
          </button>
        )}
        <button type="submit" className="btn gold" disabled={!draft.name.trim()}>
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
      <p className="eyebrow">New Footprint</p>
      <h2 className="sheet-title">记录新地点</h2>
      <form className="search" onSubmit={submit}>
        <Icon name="search" size={18} />
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索城市、景点、街道"
          autoFocus
        />
        {status === 'loading' && <span className="spinner" />}
      </form>

      {status === 'error' && <p className="muted center">搜索失败，请检查网络后重试</p>}

      {results && results.length === 0 && <p className="muted center">没有找到相关地点</p>}

      {results && results.length > 0 && (
        <ul className="rows">
          {results.map((r, i) => (
            <li key={i}>
              <button className="row" onClick={() => onPick(r)}>
                <span className="row-icon">
                  <Icon name="pin" size={18} />
                </span>
                <span className="row-text">
                  <b>{r.name}</b>
                  <small>{r.fullName}</small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!results && (
        <div className="tip-card">
          <Icon name="globe" size={22} />
          <p>
            也可以关闭此页，直接在地球上<b>轻触任意位置</b>来记录地点；
            <br />
            轻触国家可将其<b>点亮</b>。
          </p>
        </div>
      )}
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
      <p className="eyebrow">{formatCoords(lat, lng)}</p>
      <h2 className="sheet-title">{countryName}</h2>
      <PlaceForm
        key={`${lat},${lng}`}
        initial={{ name: name ?? '', date: new Date().toISOString().slice(0, 10), note: '' }}
        submitLabel="保存足迹"
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
      <p className="eyebrow">
        {continentZh(country.properties.continent)} · {country.properties.name}
      </p>
      <h2 className="sheet-title">
        {countryNameZh(country)}
        {isVisited && <span className="badge">已点亮</span>}
      </h2>

      <div className="actions">
        {!lockedByPlaces && (
          <button className={`btn ${isVisited ? 'ghost' : 'gold'}`} onClick={onToggle}>
            <Icon name={isVisited ? 'close' : 'check'} size={18} />
            {isVisited ? '取消点亮' : '点亮这个国家'}
          </button>
        )}
        <button className="btn ghost" onClick={onAddHere}>
          <Icon name="pin" size={18} />
          在此记录地点
        </button>
      </div>

      {places.length > 0 && (
        <>
          <p className="section-label">在这里的足迹 · {places.length}</p>
          <ul className="rows">
            {places.map((p) => (
              <li key={p.id}>
                <button className="row" onClick={() => onOpenPlace(p)}>
                  <span className="row-dot" />
                  <span className="row-text">
                    <b>{p.name}</b>
                    <small>{formatDate(p.date) || '未填写日期'}</small>
                  </span>
                  <Icon name="chevron" size={16} />
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
      <p className="eyebrow">
        {countryName}
        {place.date && ` · ${formatDate(place.date)}`}
      </p>
      <h2 className="sheet-title">{place.name}</h2>

      {editing ? (
        <PlaceForm
          initial={{ name: place.name, date: place.date ?? '', note: place.note ?? '' }}
          submitLabel="保存修改"
          onSubmit={(d) => {
            onUpdate(d)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {place.note && <blockquote className="note">{place.note}</blockquote>}
          <p className="coords">{formatCoords(place.lat, place.lng)}</p>
          <div className="actions">
            <button className="btn ghost" onClick={() => setEditing(true)}>
              <Icon name="edit" size={18} />
              编辑
            </button>
            <button
              className={`btn ${confirming ? 'danger-solid' : 'ghost danger'}`}
              onClick={() => (confirming ? onDelete() : setConfirming(true))}
              onBlur={() => setConfirming(false)}
            >
              <Icon name="trash" size={18} />
              {confirming ? '确认删除' : '删除'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
