import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { formatMonthDay } from '../format'
import { continentZh, countryNameZh } from '../geo'
import { parseData } from '../storage'
import type { CountryFeature, Place, TravelData } from '../types'
import Stamp from './Stamp'

const CONTINENT_ORDER = ['Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica']

/* --------------------------------------------------------------- journal */

export function JournalScreen({
  places,
  countryName,
  onOpen,
}: {
  places: Place[]
  countryName: (code?: string) => string
  onOpen: (p: Place) => void
}) {
  const years = useMemo(() => {
    const sorted = [...places].sort(
      (a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.createdAt - a.createdAt,
    )
    const groups = new Map<string, Place[]>()
    for (const p of sorted) {
      const y = p.date?.slice(0, 4) ?? '某年某月'
      groups.set(y, [...(groups.get(y) ?? []), p])
    }
    return [...groups.entries()]
  }, [places])

  return (
    <div className="page lined">
      <header className="page-head">
        <h1>旅行手账</h1>
        {places.length > 0 && <p>写下了 {places.length} 个地方</p>}
      </header>

      {places.length === 0 ? (
        <div className="page-empty">
          <p>第一页还是空的。</p>
          <small>回到地球，轻点一个你去过的地方，把它写进来。</small>
        </div>
      ) : (
        years.map(([year, list]) => (
          <section key={year} className="entry-year">
            <h2>
              {year}
              <small>{list.length} 篇</small>
            </h2>
            {list.map((p) => (
              <button key={p.id} className="entry" onClick={() => onOpen(p)}>
                <span className="entry-date">{formatMonthDay(p.date) || '—'}</span>
                <span className="entry-body">
                  <b>{p.name}</b>
                  <small>{countryName(p.countryCode)}</small>
                  {p.note && <span className="entry-note">{p.note}</span>}
                </span>
              </button>
            ))}
          </section>
        ))
      )}
    </div>
  )
}

/* -------------------------------------------------------------- passport */

export function PassportScreen({
  data,
  countries,
  visited,
  onOpenCountry,
  onExport,
  onImport,
}: {
  data: TravelData
  countries: CountryFeature[]
  visited: Set<string>
  onOpenCountry: (c: CountryFeature) => void
  onExport: () => void
  onImport: (d: TravelData) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<TravelData | null>(null)
  const [importError, setImportError] = useState(false)

  const firstYear = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of data.places) {
      const y = p.date?.slice(0, 4)
      if (!p.countryCode || !y) continue
      const prev = m.get(p.countryCode)
      if (!prev || y < prev) m.set(p.countryCode, y)
    }
    return m
  }, [data.places])

  const stamps = useMemo(
    () =>
      countries
        .filter((c) => visited.has(c.properties.code))
        .sort(
          (a, b) =>
            (firstYear.get(a.properties.code) ?? '9999').localeCompare(firstYear.get(b.properties.code) ?? '9999') ||
            countryNameZh(a).localeCompare(countryNameZh(b), 'zh-CN'),
        ),
    [countries, visited, firstYear],
  )

  const byContinent = useMemo(
    () =>
      CONTINENT_ORDER.map((key) => {
        const all = countries.filter((c) => c.properties.continent === key)
        return { key, name: continentZh(key), total: all.length, seen: all.filter((c) => visited.has(c.properties.code)).length }
      }),
    [countries, visited],
  )

  const continentsVisited = byContinent.filter((c) => c.seen > 0).length
  const percent = countries.length ? (visited.size / countries.length) * 100 : 0

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = parseData(JSON.parse(await file.text()))
      if (!parsed) throw new Error('invalid')
      setImportError(false)
      setPending(parsed)
    } catch {
      setImportError(true)
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>我的护照</h1>
        <p>
          盖了 <b>{visited.size}</b> 枚印章，走过 <b>{continentsVisited}</b> 个大洲，看过世界的{' '}
          <b>{percent < 10 ? percent.toFixed(1) : Math.round(percent)}%</b>
        </p>
      </header>

      {stamps.length === 0 ? (
        <div className="page-empty">
          <div className="stamp-slot" />
          <p>还没有印章。</p>
          <small>在地球上轻点一个国家，给它盖上第一枚章。</small>
        </div>
      ) : (
        <div className="stamp-grid">
          {stamps.map((c) => (
            <button key={c.properties.code} className="stamp-cell" onClick={() => onOpenCountry(c)}>
              <Stamp
                code={c.properties.code}
                name={countryNameZh(c)}
                english={c.properties.name}
                year={firstYear.get(c.properties.code)}
              />
            </button>
          ))}
        </div>
      )}

      <section className="page-section">
        <h2>各大洲</h2>
        {byContinent.map((c) => (
          <div key={c.key} className="continent">
            <span>{c.name}</span>
            <span className="continent-line">
              <i style={{ width: `${c.total ? (c.seen / c.total) * 100 : 0}%` }} />
            </span>
            <span className="continent-num">
              {c.seen}/{c.total}
            </span>
          </div>
        ))}
      </section>

      <section className="page-section">
        <h2>备份</h2>
        <div className="page-links">
          <button onClick={onExport}>导出备份</button>
          <button onClick={() => fileRef.current?.click()}>从备份恢复</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pickFile} />
        {importError && <p className="page-note error">这个文件不是 StarlingWorld 的备份。</p>}
        {pending && (
          <div className="page-confirm">
            <p>
              备份里有 {pending.places.length} 个地点、{pending.countries.length} 枚印章。恢复后会替换现在的内容。
            </p>
            <div className="actions">
              <button className="btn secondary" onClick={() => setPending(null)}>
                取消
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  onImport(pending)
                  setPending(null)
                }}
              >
                恢复
              </button>
            </div>
          </div>
        )}
        <p className="page-note">所有内容只保存在这台设备上。</p>
      </section>
    </div>
  )
}
