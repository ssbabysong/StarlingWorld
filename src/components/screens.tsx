import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { formatMonthDay } from '../format'
import { continentZh, countryNameZh } from '../geo'
import { parseData } from '../storage'
import type { CountryFeature, Place, TravelData } from '../types'
import Icon from './Icon'

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
      const y = p.date?.slice(0, 4) ?? '未注明日期'
      groups.set(y, [...(groups.get(y) ?? []), p])
    }
    return [...groups.entries()]
  }, [places])

  const countryCount = new Set(places.map((p) => p.countryCode).filter(Boolean)).size

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>足迹</h1>
        {places.length > 0 && (
          <p>
            {places.length} 个地点，{countryCount} 个国家和地区
          </p>
        )}
      </header>

      {places.length === 0 ? (
        <div className="empty">
          <Icon name="pin" size={28} />
          <p>还没有地点</p>
          <small>在地球上轻点，或用搜索添加你去过的地方</small>
        </div>
      ) : (
        years.map(([year, list]) => (
          <section key={year} className="year">
            <h2 className="group-label">
              {year}
              <span>{list.length}</span>
            </h2>
            <ul className="list group">
              {list.map((p) => (
                <li key={p.id}>
                  <button className="list-row journal-row" onClick={() => onOpen(p)}>
                    <span className="journal-date">{formatMonthDay(p.date) || '—'}</span>
                    <span className="list-text">
                      <b>{p.name}</b>
                      <small>{countryName(p.countryCode)}</small>
                      {p.note && <em>{p.note}</em>}
                    </span>
                    <Icon name="chevron" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- stats */

export function StatsScreen({
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

  const byContinent = useMemo(() => {
    return CONTINENT_ORDER.map((key) => {
      const all = countries.filter((c) => c.properties.continent === key)
      const seen = all
        .filter((c) => visited.has(c.properties.code))
        .sort((a, b) => countryNameZh(a).localeCompare(countryNameZh(b), 'zh-CN'))
      return { key, name: continentZh(key), total: all.length, seen }
    })
  }, [countries, visited])

  const continentsVisited = byContinent.filter((c) => c.seen.length > 0).length
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
    <div className="screen">
      <header className="screen-head">
        <h1>世界</h1>
      </header>

      <section className="card hero">
        <p className="hero-label">已探索的国家和地区</p>
        <p className="hero-value">
          <span className="num">{percent < 10 ? percent.toFixed(1) : Math.round(percent)}</span>
          <span className="unit">%</span>
        </p>
        <div className="meter">
          <i style={{ width: `${Math.max(percent, percent > 0 ? 1.5 : 0)}%` }} />
        </div>
        <div className="hero-stats">
          <div>
            <span className="num">{visited.size}</span>
            <small>国家和地区</small>
          </div>
          <div>
            <span className="num">
              {continentsVisited}
              <span className="of">/7</span>
            </span>
            <small>大洲</small>
          </div>
          <div>
            <span className="num">{data.places.length}</span>
            <small>地点</small>
          </div>
        </div>
      </section>

      <p className="group-label">各大洲</p>
      <ul className="list group">
        {byContinent.map((c) => (
          <li key={c.key} className="continent-row">
            <span className="continent-name">{c.name}</span>
            <div className="meter thin">
              <i style={{ width: `${c.total ? (c.seen.length / c.total) * 100 : 0}%` }} />
            </div>
            <span className="continent-count">
              {c.seen.length}
              <span className="of"> / {c.total}</span>
            </span>
          </li>
        ))}
      </ul>

      {visited.size > 0 && (
        <>
          <p className="group-label">去过的国家和地区</p>
          <div className="card">
            {byContinent
              .filter((c) => c.seen.length > 0)
              .map((c) => (
                <div key={c.key} className="chip-group">
                  <h3>{c.name}</h3>
                  <div className="chips">
                    {c.seen.map((country) => (
                      <button key={country.properties.code} className="chip" onClick={() => onOpenCountry(country)}>
                        {countryNameZh(country)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      <p className="group-label">数据</p>
      <ul className="list group">
        <li>
          <button className="list-row" onClick={onExport}>
            <span className="list-text">
              <b>导出备份</b>
            </span>
            <Icon name="chevron" size={14} />
          </button>
        </li>
        <li>
          <button className="list-row" onClick={() => fileRef.current?.click()}>
            <span className="list-text">
              <b>从备份恢复</b>
            </span>
            <Icon name="chevron" size={14} />
          </button>
        </li>
      </ul>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pickFile} />
      {importError && <p className="hint error">文件格式不正确，请选择从 StarlingWorld 导出的备份</p>}
      {pending && (
        <div className="card confirm">
          <p>
            备份中有 {pending.places.length} 个地点和 {pending.countries.length} 个国家，恢复后会替换当前数据。
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
      <p className="hint center">数据只保存在这台设备上</p>
    </div>
  )
}
