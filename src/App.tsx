import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import GlobeView from './components/GlobeView'
import Icon, { type IconName } from './components/Icon'
import { JournalScreen, PassportScreen } from './components/screens'
import { AddPlaceSheet, CountrySheet, PlaceSheet, SearchSheet, type PlaceDraft } from './components/sheets'
import { continentZh, countryNameZh, findCountry, loadCountries } from './geo'
import { setupNativeChrome, success, tap } from './native'
import { exportData, loadData, saveData } from './storage'
import type { CountryFeature, Place, Selection, TravelData } from './types'
import './App.css'

type Tab = 'globe' | 'journal' | 'stats'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'globe', label: '地球', icon: 'globe' },
  { id: 'journal', label: '手账', icon: 'journal' },
  { id: 'stats', label: '护照', icon: 'passport' },
]

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

export default function App() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [data, setData] = useState<TravelData>(loadData)
  const [countries, setCountries] = useState<CountryFeature[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('globe')
  const [selection, setSelection] = useState<Selection>(null)
  const [searching, setSearching] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setupNativeChrome()
    loadCountries().then(setCountries, (e: Error) => setLoadError(e.message))
  }, [])

  useEffect(() => saveData(data), [data])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const byCode = useMemo(() => new Map(countries.map((c) => [c.properties.code, c])), [countries])

  const visited = useMemo(() => {
    const set = new Set(data.countries)
    for (const p of data.places) if (p.countryCode) set.add(p.countryCode)
    return set
  }, [data])

  const continentsVisited = useMemo(() => {
    const set = new Set<string>()
    for (const code of visited) {
      const c = byCode.get(code)
      if (c && continentZh(c.properties.continent) !== '其他') set.add(c.properties.continent)
    }
    return set.size
  }, [visited, byCode])

  const countryName = (code?: string) => {
    const c = code ? byCode.get(code) : undefined
    return c ? countryNameZh(c) : '公海'
  }

  const flyTo = (lat: number, lng: number, altitude = 1.6) => {
    setAutoRotate(false)
    // Aim slightly south so the point sits above the bottom sheet.
    globeRef.current?.pointOfView({ lat: lat - altitude * 9, lng, altitude }, 1300)
  }

  const onGlobeReady = () => {
    globeRef.current?.pointOfView({ lat: 22, lng: 105, altitude: 2.4 })
    setReady(true)
  }

  const stopRotate = useCallback(() => setAutoRotate(false), [])

  // --- mutations -----------------------------------------------------------

  const toggleCountry = (code: string) => {
    const on = !data.countries.includes(code)
    setData((d) => ({
      ...d,
      countries: on ? [...d.countries, code] : d.countries.filter((c) => c !== code),
    }))
    if (on) {
      success()
      setToast(`已盖章 · ${countryName(code)}`)
    } else tap()
  }

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
    setSelection({ kind: 'place', id: place.id })
    success()
    setToast('已写进手账')
  }

  const updatePlace = (id: string, draft: PlaceDraft) =>
    setData((d) => ({
      ...d,
      places: d.places.map((p) =>
        p.id === id ? { ...p, name: draft.name, date: draft.date || undefined, note: draft.note || undefined } : p,
      ),
    }))

  const deletePlace = (id: string) => {
    setData((d) => ({ ...d, places: d.places.filter((p) => p.id !== id) }))
    setSelection(null)
    tap('medium')
  }

  // --- navigation ----------------------------------------------------------

  const openPlace = (p: Place) => {
    setTab('globe')
    setSelection({ kind: 'place', id: p.id })
    flyTo(p.lat, p.lng, 1.1)
  }

  const openCountry = (c: CountryFeature) => {
    const first = data.places.find((p) => p.countryCode === c.properties.code)
    const ring = c.geometry.type === 'Polygon' ? c.geometry.coordinates[0] : c.geometry.coordinates[0][0]
    const [lng, lat] = first ? [first.lng, first.lat] : ring[0]
    setTab('globe')
    setSelection({ kind: 'country', code: c.properties.code, lat, lng })
    flyTo(lat, lng, 1.7)
  }

  const switchTab = (t: Tab) => {
    if (t !== tab) tap()
    setTab(t)
    setSearching(false)
    if (t !== 'globe') setSelection(null)
  }

  // --- sheets ----------------------------------------------------------------

  const renderSheet = () => {
    if (searching) {
      return (
        <SearchSheet
          onClose={() => setSearching(false)}
          onPick={(r) => {
            setSearching(false)
            setSelection({ kind: 'new', lat: r.lat, lng: r.lng, name: r.name })
            flyTo(r.lat, r.lng, 1.1)
          }}
        />
      )
    }
    if (!selection) return null

    if (selection.kind === 'new') {
      const code = selection.countryCode ?? findCountry(selection.lat, selection.lng, countries)?.properties.code
      return (
        <AddPlaceSheet
          key={`${selection.lat},${selection.lng}`}
          lat={selection.lat}
          lng={selection.lng}
          name={selection.name}
          countryName={countryName(code)}
          onSave={(d) => addPlace(selection.lat, selection.lng, d)}
          onClose={() => setSelection(null)}
        />
      )
    }

    if (selection.kind === 'country') {
      const c = byCode.get(selection.code)
      if (!c) return null
      return (
        <CountrySheet
          key={selection.code}
          country={c}
          isVisited={visited.has(selection.code)}
          markedDirectly={data.countries.includes(selection.code)}
          places={data.places
            .filter((p) => p.countryCode === selection.code)
            .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))}
          onToggle={() => toggleCountry(selection.code)}
          onAddHere={() =>
            setSelection({ kind: 'new', lat: selection.lat, lng: selection.lng, countryCode: selection.code })
          }
          onOpenPlace={openPlace}
          onClose={() => setSelection(null)}
        />
      )
    }

    const p = data.places.find((x) => x.id === selection.id)
    if (!p) return null
    return (
      <PlaceSheet
        key={p.id}
        place={p}
        countryName={countryName(p.countryCode)}
        onUpdate={(d) => updatePlace(p.id, d)}
        onDelete={() => deletePlace(p.id)}
        onClose={() => setSelection(null)}
      />
    )
  }

  return (
    <div className={`app tab-${tab} ${ready ? 'ready' : ''}`}>
      <div className="stage">
        <div className="stars" />
        <GlobeView
          globeRef={globeRef}
          countries={countries}
          visited={visited}
          places={data.places}
          selection={selection}
          autoRotate={autoRotate}
          interactive={tab === 'globe'}
          onCountryClick={(code, lat, lng) => {
            tap()
            setSelection({ kind: 'country', code, lat, lng })
          }}
          onOceanClick={(lat, lng) => {
            tap()
            setSelection({ kind: 'new', lat, lng })
          }}
          onPlaceClick={(id) => {
            tap()
            setSelection({ kind: 'place', id })
          }}
          onInteract={stopRotate}
          onReady={onGlobeReady}
        />
        <div className="vignette" />
      </div>

      {!ready && (
        <div className="splash">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={72} height={72} />
        </div>
      )}

      {tab === 'globe' && (
        <>
          <header className="top">
            <h1>我的地球</h1>
            <p className="summary">
              去过 <b>{visited.size}</b> 个国家，<b>{data.places.length}</b> 个地方，<b>{continentsVisited}</b> 个大洲
            </p>
          </header>

          <button
            className="round-btn rotate"
            onClick={() => setAutoRotate((v) => !v)}
            aria-label={autoRotate ? '停止旋转' : '自动旋转'}
          >
            <Icon name={autoRotate ? 'pause' : 'rotate'} size={17} />
          </button>

          {!selection && !searching && (
            <button
              className="search-pill"
              onClick={() => {
                tap()
                setSearching(true)
              }}
            >
              <Icon name="search" size={17} />
              <span>去过哪里？搜一搜</span>
            </button>
          )}
        </>
      )}

      {tab === 'journal' && <JournalScreen places={data.places} countryName={countryName} onOpen={openPlace} />}

      {tab === 'stats' && (
        <PassportScreen
          data={data}
          countries={countries}
          visited={visited}
          onOpenCountry={openCountry}
          onExport={() => exportData(data).catch(() => setToast('导出已取消'))}
          onImport={(d) => {
            setData(d)
            setSelection(null)
            success()
            setToast('数据已恢复')
          }}
        />
      )}

      {renderSheet()}

      {toast && <div className="toast">{toast}</div>}
      {loadError && <div className="toast error">{loadError}</div>}

      <nav className="capsule" aria-label="主菜单">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => switchTab(t.id)}
            aria-label={t.label}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <Icon name={t.icon} size={21} />
          </button>
        ))}
      </nav>
    </div>
  )
}
