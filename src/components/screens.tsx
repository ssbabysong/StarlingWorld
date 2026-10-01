import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { continentZh, countryNameZh } from '../geo'
import { parseData } from '../storage'
import type { CountryFeature, Place, TravelData } from '../types'
import Icon from './Icon'
import { formatDate } from '../format'

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

  return (
    <div className="screen">
      <header className="screen-head">
        <p className="eyebrow">Journal</p>
        <h1>足迹</h1>
        <p className="muted">{places.length > 0 ? `共 ${places.length} 个地点` : '每一处都值得被记住'}</p>
      </header>

      {places.length === 0 ? (
        <div className="empty">
          <div className="empty-orb" />
          <p>还没有记录任何地点</p>
          <small>回到地球，轻触你去过的地方</small>
        </div>
      ) : (
        years.map(([year, list]) => (
          <section key={year} className="year">
            <h2 className="year-title">
              {year}
              <span>{list.length} 处</span>
            </h2>
            <ol className="timeline">
              {list.map((p) => (
                <li key={p.id}>
                  <button onClick={() => onOpen(p)}>
                    <span className="tl-date">{p.date ? formatDate(p.date).replace(/^\d+年/, '') : '—'}</span>
                    <span className="tl-body">
                      <b>{p.name}</b>
                      <small>{countryName(p.countryCode)}</small>
                      {p.note && <em>{p.note}</em>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- stats */

function Ring({ value }: { value: number }) {
  const r = 54
  const c = 2 * Math.PI * r
  return (
    <svg className="ring" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2b3" />
          <stop offset="1" stopColor="#b8914f" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} className="ring-track" />
      <circle
        cx="60"
        cy="60"
        r={r}
        className="ring-value"
        stroke="url(#gold)"
        strokeDasharray={`${(value / 100) * c} ${c}`}
      />
    </svg>
  )
}

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
        <p className="eyebrow">Atlas</p>
        <h1>我的世界</h1>
      </header>

      <section className="hero">
        <div className="hero-ring">
          <Ring value={percent} />
          <div className="hero-ring-text">
            <span className="num">{percent < 10 ? percent.toFixed(1) : Math.round(percent)}</span>
            <small>% 的世界</small>
          </div>
        </div>
        <div className="hero-stats">
          <div>
            <span className="num">{visited.size}</span>
            <small>国家与地区</small>
          </div>
          <div>
            <span className="num">
              {continentsVisited}
              <i>/7</i>
            </span>
            <small>大洲</small>
          </div>
          <div>
            <span className="num">{data.places.length}</span>
            <small>地点</small>
          </div>
        </div>
      </section>

      <section className="panel">
        <p className="section-label">大洲</p>
        {byContinent.map((c) => (
          <div key={c.key} className="bar-row">
            <span>{c.name}</span>
            <div className="bar">
              <i style={{ width: `${c.total ? (c.seen.length / c.total) * 100 : 0}%` }} />
            </div>
            <small>
              {c.seen.length}/{c.total}
            </small>
          </div>
        ))}
      </section>

      {visited.size > 0 && (
        <section className="panel">
          <p className="section-label">已点亮</p>
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
        </section>
      )}

      <section className="panel">
        <p className="section-label">数据</p>
        <button className="row" onClick={onExport}>
          <span className="row-icon">
            <Icon name="share" size={18} />
          </span>
          <span className="row-text">
            <b>导出备份</b>
            <small>保存为 JSON 文件</small>
          </span>
          <Icon name="chevron" size={16} />
        </button>
        <button className="row" onClick={() => fileRef.current?.click()}>
          <span className="row-icon">
            <Icon name="import" size={18} />
          </span>
          <span className="row-text">
            <b>从备份恢复</b>
            <small>会替换当前设备上的数据</small>
          </span>
          <Icon name="chevron" size={16} />
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pickFile} />
        {importError && <p className="error-text">文件格式不正确，请选择 StarlingWorld 导出的备份</p>}
        {pending && (
          <div className="confirm">
            <p>
              备份包含 <b>{pending.places.length}</b> 个地点、<b>{pending.countries.length}</b> 个国家。确认替换当前数据？
            </p>
            <div className="actions">
              <button className="btn ghost" onClick={() => setPending(null)}>
                取消
              </button>
              <button
                className="btn gold"
                onClick={() => {
                  onImport(pending)
                  setPending(null)
                }}
              >
                确认恢复
              </button>
            </div>
          </div>
        )}
        <p className="footnote">所有数据仅保存在本设备上</p>
      </section>
    </div>
  )
}
