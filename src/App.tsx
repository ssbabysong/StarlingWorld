import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import GlobeView from './components/GlobeView'
import PlaceForm, { type PlaceDraft } from './components/PlaceForm'
import SearchBox from './components/SearchBox'
import { continentZh, countryNameZh, findCountry, loadCountries } from './geo'
import { exportData, loadData, parseData, saveData } from './storage'
import type { CountryFeature, Place, Selection, TravelData } from './types'
import './App.css'

const CONTINENT_COUNT = 7

const today = () => new Date().toISOString().slice(0, 10)
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

function sortPlaces(a: Place, b: Place) {
  return (b.date ?? '').localeCompare(a.date ?? '') || b.createdAt - a.createdAt
}

export default function App() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [data, setData] = useState<TravelData>(loadData)
  const [countries, setCountries] = useState<CountryFeature[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<'places' | 'countries'>('places')
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    loadCountries().then(setCountries, (e: Error) => setLoadError(e.message))
  }, [])

  useEffect(() => saveData(data), [data])

  const byCode = useMemo(() => new Map(countries.map((c) => [c.properties.code, c])), [countries])

  const visited = useMemo(() => {
    const set = new Set(data.countries)
    for (const p of data.places) if (p.countryCode) set.add(p.countryCode)
    return set
  }, [data])

  const stats = useMemo(() => {
    const continents = new Set<string>()
    for (const code of visited) {
      const c = byCode.get(code)
      if (c && continentZh(c.properties.continent) !== '其他') continents.add(c.properties.continent)
    }
    return {
      countries: visited.size,
      continents: continents.size,
      places: data.places.length,
      percent: countries.length ? Math.round((visited.size / countries.length) * 100) : 0,
    }
  }, [visited, byCode, data.places.length, countries.length])

  const flyTo = (lat: number, lng: number, altitude = 1.7) => {
    setAutoRotate(false)
    globeRef.current?.pointOfView({ lat, lng, altitude }, 1200)
  }

  const select = (s: Selection) => {
    setSelection(s)
    setEditing(false)
  }

  const stopRotate = useCallback(() => setAutoRotate(false), [])

  const nameOf = (code?: string) => {
    const c = code ? byCode.get(code) : undefined
    return c ? countryNameZh(c) : '公海 / 未知区域'
  }

  // --- mutations -----------------------------------------------------------

  const toggleCountry = (code: string) =>
    setData((d) => ({
      ...d,
      countries: d.countries.includes(code) ? d.countries.filter((c) => c !== code) : [...d.countries, code],
    }))

  const addPlace = (lat: number, lng: number, draft: PlaceDraft) => {
    const place: Place = {
      id: newId(),
      name: draft.name,
      lat,
      lng,
      countryCode: findCountry(lat, lng, countries)?.properties.code,
      date: draft.date || undefined,
      note: draft.note || undefined,
      createdAt: Date.now(),
    }
    setData((d) => ({ ...d, places: [...d.places, place] }))
    select({ kind: 'place', id: place.id })
    setTab('places')
  }

  const updatePlace = (id: string, draft: PlaceDraft) => {
    setData((d) => ({
      ...d,
      places: d.places.map((p) =>
        p.id === id ? { ...p, name: draft.name, date: draft.date || undefined, note: draft.note || undefined } : p,
      ),
    }))
    setEditing(false)
  }

  const deletePlace = (p: Place) => {
    if (!confirm(`确定删除「${p.name}」吗？`)) return
    setData((d) => ({ ...d, places: d.places.filter((x) => x.id !== p.id) }))
    select(null)
  }

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = parseData(JSON.parse(await file.text()))
      if (!parsed) throw new Error('bad')
      if (!confirm(`导入 ${parsed.places.length} 个地点、${parsed.countries.length} 个国家？这会替换当前数据。`)) return
      setData(parsed)
      select(null)
    } catch {
      alert('文件格式不正确，请选择从 StarlingWorld 导出的 JSON 文件')
    }
  }

  // --- detail card -----------------------------------------------------------

  const renderDetail = () => {
    if (!selection) return null

    if (selection.kind === 'new') {
      const country = selection.countryCode ?? findCountry(selection.lat, selection.lng, countries)?.properties.code
      return (
        <section className="card">
          <header className="card-head">
            <h2>添加地点</h2>
            <button className="icon-btn" onClick={() => select(null)} aria-label="关闭">
              ×
            </button>
          </header>
          <p className="meta">
            {nameOf(country)} · {selection.lat.toFixed(3)}, {selection.lng.toFixed(3)}
          </p>
          <PlaceForm
            key={`${selection.lat},${selection.lng}`}
            initial={{ name: selection.name ?? '', date: today(), note: '' }}
            submitLabel="保存"
            onSubmit={(d) => addPlace(selection.lat, selection.lng, d)}
            onCancel={() => select(null)}
          />
        </section>
      )
    }

    if (selection.kind === 'country') {
      const c = byCode.get(selection.code)
      if (!c) return null
      const placesHere = data.places.filter((p) => p.countryCode === selection.code).sort(sortPlaces)
      const marked = data.countries.includes(selection.code)
      return (
        <section className="card">
          <header className="card-head">
            <h2>{countryNameZh(c)}</h2>
            <button className="icon-btn" onClick={() => select(null)} aria-label="关闭">
              ×
            </button>
          </header>
          <p className="meta">
            {continentZh(c.properties.continent)} · {c.properties.name}
            {visited.has(selection.code) && <span className="tag">已去过</span>}
          </p>
          <div className="row">
            {placesHere.length === 0 || marked ? (
              <button className={`btn ${marked ? '' : 'primary'}`} onClick={() => toggleCountry(selection.code)}>
                {marked ? '取消标记' : '✓ 标记为去过'}
              </button>
            ) : null}
            <button className="btn" onClick={() => select({ kind: 'new', lat: selection.lat, lng: selection.lng, countryCode: selection.code })}>
              ＋ 在这里添加地点
            </button>
          </div>
          {placesHere.length > 0 && (
            <ul className="list compact">
              {placesHere.map((p) => (
                <li key={p.id}>
                  <button onClick={() => (select({ kind: 'place', id: p.id }), flyTo(p.lat, p.lng, 1.2))}>
                    <b>{p.name}</b>
                    <span>{p.date ?? ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )
    }

    const p = data.places.find((x) => x.id === selection.id)
    if (!p) return null
    return (
      <section className="card">
        <header className="card-head">
          <h2>{p.name}</h2>
          <button className="icon-btn" onClick={() => select(null)} aria-label="关闭">
            ×
          </button>
        </header>
        <p className="meta">
          {nameOf(p.countryCode)}
          {p.date && ` · ${p.date}`}
        </p>
        {editing ? (
          <PlaceForm
            key={p.id}
            initial={{ name: p.name, date: p.date ?? '', note: p.note ?? '' }}
            submitLabel="保存修改"
            onSubmit={(d) => updatePlace(p.id, d)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {p.note && <p className="note">{p.note}</p>}
            <div className="row">
              <button className="btn" onClick={() => setEditing(true)}>
                编辑
              </button>
              <button className="btn danger" onClick={() => deletePlace(p)}>
                删除
              </button>
            </div>
          </>
        )}
      </section>
    )
  }

  // --- lists -----------------------------------------------------------------

  const visitedByContinent = useMemo(() => {
    const groups = new Map<string, CountryFeature[]>()
    for (const code of visited) {
      const c = byCode.get(code)
      if (!c) continue
      const k = continentZh(c.properties.continent)
      groups.set(k, [...(groups.get(k) ?? []), c])
    }
    return [...groups.entries()]
      .map(([k, list]) => [k, list.sort((a, b) => countryNameZh(a).localeCompare(countryNameZh(b), 'zh-CN'))] as const)
      .sort((a, b) => b[1].length - a[1].length)
  }, [visited, byCode])

  const placeCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of data.places) if (p.countryCode) m.set(p.countryCode, (m.get(p.countryCode) ?? 0) + 1)
    return m
  }, [data.places])

  const focusCountry = (c: CountryFeature) => {
    const first = data.places.find((p) => p.countryCode === c.properties.code)
    // Fall back to the first vertex of the outline when no place is recorded.
    const ring = c.geometry.type === 'Polygon' ? c.geometry.coordinates[0] : c.geometry.coordinates[0][0]
    const pos = first ? { lat: first.lat, lng: first.lng } : { lat: ring[0][1], lng: ring[0][0] }
    select({ kind: 'country', code: c.properties.code, ...pos })
    flyTo(pos.lat, pos.lng, 1.6)
  }

  const sortedPlaces = useMemo(() => [...data.places].sort(sortPlaces), [data.places])
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="app">
      <main className="stage">
        <GlobeView
          globeRef={globeRef}
          countries={countries}
          visited={visited}
          places={data.places}
          selection={selection}
          autoRotate={autoRotate}
          onCountryClick={(code, lat, lng) => select({ kind: 'country', code, lat, lng })}
          onOceanClick={(lat, lng) => select({ kind: 'new', lat, lng })}
          onPlaceClick={(id) => select({ kind: 'place', id })}
          onInteract={stopRotate}
        />
        <div className="brand">
          <span className="logo">◉</span> StarlingWorld
        </div>
        {loadError && <div className="toast error">{loadError}</div>}
        <div className="globe-hint">点击国家标记去过 · 点击海洋或国家后可添加地点 · 拖动旋转、滚轮缩放</div>
        <button className="rotate-btn" onClick={() => setAutoRotate((v) => !v)}>
          {autoRotate ? '⏸ 停止旋转' : '⟳ 自动旋转'}
        </button>
      </main>

      <aside className="panel">
        <div className="stats">
          <div>
            <b>{stats.countries}</b>
            <span>国家/地区</span>
          </div>
          <div>
            <b>
              {stats.continents}
              <small>/{CONTINENT_COUNT}</small>
            </b>
            <span>大洲</span>
          </div>
          <div>
            <b>{stats.places}</b>
            <span>地点</span>
          </div>
          <div>
            <b>
              {stats.percent}
              <small>%</small>
            </b>
            <span>世界</span>
          </div>
        </div>

        <SearchBox
          onPick={(r) => {
            select({ kind: 'new', lat: r.lat, lng: r.lng, name: r.name })
            flyTo(r.lat, r.lng, 1.2)
          }}
        />

        {renderDetail()}

        <nav className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'places'} onClick={() => setTab('places')}>
            地点 {data.places.length}
          </button>
          <button role="tab" aria-selected={tab === 'countries'} onClick={() => setTab('countries')}>
            国家 {visited.size}
          </button>
        </nav>

        <div className="tab-body">
          {tab === 'places' &&
            (sortedPlaces.length === 0 ? (
              <p className="empty">还没有记录地点。搜索一个城市，或直接点击地球开始吧 🌏</p>
            ) : (
              <ul className="list">
                {sortedPlaces.map((p) => (
                  <li key={p.id} className={selection?.kind === 'place' && selection.id === p.id ? 'active' : ''}>
                    <button onClick={() => (select({ kind: 'place', id: p.id }), flyTo(p.lat, p.lng, 1.2))}>
                      <b>{p.name}</b>
                      <span>
                        {nameOf(p.countryCode)}
                        {p.date && ` · ${p.date}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}

          {tab === 'countries' &&
            (visitedByContinent.length === 0 ? (
              <p className="empty">点击地球上的国家，把去过的地方点亮 ✨</p>
            ) : (
              visitedByContinent.map(([continent, list]) => (
                <div key={continent} className="group">
                  <h3>
                    {continent} <span>{list.length}</span>
                  </h3>
                  <div className="chips">
                    {list.map((c) => (
                      <button key={c.properties.code} className="chip" onClick={() => focusCountry(c)}>
                        {countryNameZh(c)}
                        {placeCount.get(c.properties.code) ? <small>{placeCount.get(c.properties.code)}</small> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ))}
        </div>

        <footer className="panel-foot">
          <button className="btn small" onClick={() => exportData(data)}>
            导出数据
          </button>
          <button className="btn small" onClick={() => fileRef.current?.click()}>
            导入数据
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
          <span className="foot-note">数据保存在本机浏览器</span>
        </footer>
      </aside>
    </div>
  )
}
