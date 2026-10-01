import { useRef, useState, type FormEvent } from 'react'
import { searchPlaces, type SearchResult } from '../geo'

interface Props {
  onPick: (r: SearchResult) => void
}

export default function SearchBox({ onPick }: Props) {
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

  const pick = (r: SearchResult) => {
    onPick(r)
    setResults(null)
    setQuery('')
  }

  return (
    <div className="search">
      <form onSubmit={submit} className="search-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索城市、景点……"
          aria-label="搜索地点"
        />
        <button className="btn primary" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '…' : '搜索'}
        </button>
      </form>
      {status === 'error' && <p className="hint error">搜索失败，请检查网络后重试</p>}
      {results && (
        <ul className="search-results">
          {results.length === 0 && <li className="hint">没有找到结果</li>}
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => pick(r)}>
                <b>{r.name}</b>
                <span>{r.fullName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
