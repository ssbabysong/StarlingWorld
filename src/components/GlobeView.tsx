import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { countryNameZh } from '../geo'
import type { CountryFeature, Place, Selection } from '../types'

const TEXTURES = `${import.meta.env.BASE_URL}textures/`

interface Marker {
  id: string
  name: string
  lat: number
  lng: number
  kind: 'place' | 'pending'
}

interface Props {
  globeRef: RefObject<GlobeMethods | undefined>
  countries: CountryFeature[]
  visited: Set<string>
  places: Place[]
  selection: Selection
  autoRotate: boolean
  onCountryClick: (code: string, lat: number, lng: number) => void
  onOceanClick: (lat: number, lng: number) => void
  onPlaceClick: (id: string) => void
  onInteract: () => void
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

export default function GlobeView({
  globeRef,
  countries,
  visited,
  places,
  selection,
  autoRotate,
  onCountryClick,
  onOceanClick,
  onPlaceClick,
  onInteract,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width: Math.round(width), height: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 0.4
  }, [autoRotate, globeRef, size.width])

  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    controls.addEventListener('start', onInteract)
    return () => controls.removeEventListener('start', onInteract)
  }, [globeRef, onInteract, size.width])

  const selectedCountry = selection?.kind === 'country' ? selection.code : null
  const selectedPlace = selection?.kind === 'place' ? selection.id : null

  const markers = useMemo<Marker[]>(() => {
    const list: Marker[] = places.map((p) => ({ ...p, kind: 'place' }))
    if (selection?.kind === 'new') {
      list.push({ id: '__new', name: selection.name || '新地点', lat: selection.lat, lng: selection.lng, kind: 'pending' })
    }
    return list
  }, [places, selection])

  const rings = useMemo(() => {
    if (selection?.kind === 'new') return [{ lat: selection.lat, lng: selection.lng }]
    const p = selectedPlace && places.find((x) => x.id === selectedPlace)
    return p ? [{ lat: p.lat, lng: p.lng }] : []
  }, [selection, selectedPlace, places])

  const capColor = (f: CountryFeature) => {
    const code = f.properties.code
    const isVisited = visited.has(code)
    if (code === selectedCountry) return isVisited ? 'rgba(255, 196, 92, 0.95)' : 'rgba(140, 200, 255, 0.55)'
    if (code === hovered) return isVisited ? 'rgba(255, 196, 92, 0.9)' : 'rgba(255, 255, 255, 0.28)'
    return isVisited ? 'rgba(255, 166, 61, 0.72)' : 'rgba(0, 0, 0, 0)'
  }

  return (
    <div ref={wrapRef} className="globe-wrap">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          globeImageUrl={`${TEXTURES}earth-blue-marble.jpg`}
          bumpImageUrl={`${TEXTURES}earth-topology.png`}
          backgroundImageUrl={`${TEXTURES}night-sky.png`}
          atmosphereColor="#7ab8ff"
          atmosphereAltitude={0.18}
          polygonsData={countries}
          polygonCapColor={(f) => capColor(f as CountryFeature)}
          polygonSideColor={() => 'rgba(255, 166, 61, 0.15)'}
          polygonStrokeColor={() => 'rgba(255, 255, 255, 0.35)'}
          polygonAltitude={(f) => {
            const code = (f as CountryFeature).properties.code
            if (code === selectedCountry || code === hovered) return 0.025
            return visited.has(code) ? 0.012 : 0.006
          }}
          polygonsTransitionDuration={250}
          polygonLabel={(f) => {
            const c = f as CountryFeature
            const tag = visited.has(c.properties.code) ? '<span class="tip-tag">已去过</span>' : ''
            return `<div class="tip"><b>${escapeHtml(countryNameZh(c))}</b>${tag}</div>`
          }}
          onPolygonHover={(f) => setHovered(f ? (f as CountryFeature).properties.code : null)}
          onPolygonClick={(f, _e, { lat, lng }) => onCountryClick((f as CountryFeature).properties.code, lat, lng)}
          onGlobeClick={({ lat, lng }) => onOceanClick(lat, lng)}
          pointsData={markers}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.04}
          pointRadius={(m) => ((m as Marker).id === selectedPlace ? 0.55 : 0.4)}
          pointColor={(m) => {
            const mk = m as Marker
            if (mk.kind === 'pending') return '#7fd1ff'
            return mk.id === selectedPlace ? '#ffffff' : '#ff4f7b'
          }}
          pointsMerge={false}
          pointsTransitionDuration={200}
          pointLabel={(m) => `<div class="tip"><b>${escapeHtml((m as Marker).name)}</b></div>`}
          onPointClick={(m) => {
            const mk = m as Marker
            if (mk.kind === 'place') onPlaceClick(mk.id)
          }}
          ringsData={rings}
          ringColor={() => (t: number) => `rgba(255, 255, 255, ${1 - t})`}
          ringMaxRadius={3}
          ringPropagationSpeed={2.5}
          ringRepeatPeriod={900}
        />
      )}
    </div>
  )
}
