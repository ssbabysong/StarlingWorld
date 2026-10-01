import type React from 'react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { countryNameZh, findCountry } from '../geo'
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
  interactive: boolean
  onCountryClick: (code: string, lat: number, lng: number) => void
  onOceanClick: (lat: number, lng: number) => void
  onPlaceClick: (id: string) => void
  onInteract: () => void
  onReady: () => void
}

const TAP_SLOP_PX = 8
const PIN_HIT_PX = 26

/** Great-circle distance in degrees. */
function angularDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = Math.PI / 180
  const c =
    Math.sin(lat1 * r) * Math.sin(lat2 * r) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng1 - lng2) * r)
  return Math.acos(Math.min(1, Math.max(-1, c))) / r
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
  interactive,
  onCountryClick,
  onOceanClick,
  onPlaceClick,
  onInteract,
  onReady,
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

  const mounted = size.width > 0

  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 0.35
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 130
    controls.maxDistance = 600
  }, [autoRotate, globeRef, mounted])

  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    controls.addEventListener('start', onInteract)
    return () => controls.removeEventListener('start', onInteract)
  }, [globeRef, onInteract, mounted])

  // Taps are resolved here rather than through globe.gl's click events, which use a
  // throttled hover raycast and can attribute a quick touch tap to a stale position.
  const down = useRef<{ x: number; y: number; id: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    down.current = e.isPrimary ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const start = down.current
    down.current = null
    const globe = globeRef.current
    const el = wrapRef.current
    if (!start || !globe || !el || start.id !== e.pointerId) return
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP_PX) return

    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hit = globe.toGlobeCoords(x, y)
    if (!hit) return

    let best: { id: string; d: number } | null = null
    for (const p of places) {
      if (angularDistance(p.lat, p.lng, hit.lat, hit.lng) > 25) continue // far side of the globe
      const s = globe.getScreenCoords(p.lat, p.lng, 0.05)
      const d = Math.hypot(s.x - x, s.y - y)
      if (d < PIN_HIT_PX && (!best || d < best.d)) best = { id: p.id, d }
    }
    if (best) return onPlaceClick(best.id)

    const country = findCountry(hit.lat, hit.lng, countries)
    if (country) onCountryClick(country.properties.code, hit.lat, hit.lng)
    else onOceanClick(hit.lat, hit.lng)
  }

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
    if (code === selectedCountry) return isVisited ? 'rgba(241, 217, 163, 0.75)' : 'rgba(150, 180, 255, 0.28)'
    if (code === hovered) return isVisited ? 'rgba(241, 217, 163, 0.6)' : 'rgba(255, 255, 255, 0.10)'
    return isVisited ? 'rgba(216, 184, 120, 0.42)' : 'rgba(0, 0, 0, 0)'
  }

  return (
    <div
      ref={wrapRef}
      className={`globe-wrap ${interactive ? '' : 'inert'}`}
      onPointerDownCapture={onPointerDown}
      onPointerUpCapture={onPointerUp}
      onPointerCancelCapture={() => (down.current = null)}
    >
      {mounted && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={`${TEXTURES}earth-night.jpg`}
          bumpImageUrl={`${TEXTURES}earth-topology.png`}
          atmosphereColor="#4b74ff"
          atmosphereAltitude={0.22}
          onGlobeReady={onReady}
          polygonsData={countries}
          polygonCapColor={(f) => capColor(f as CountryFeature)}
          polygonSideColor={(f) =>
            visited.has((f as CountryFeature).properties.code) ? 'rgba(216, 184, 120, 0.25)' : 'rgba(0, 0, 0, 0)'
          }
          polygonStrokeColor={(f) =>
            visited.has((f as CountryFeature).properties.code) ? 'rgba(241, 217, 163, 0.9)' : 'rgba(170, 190, 255, 0.16)'
          }
          polygonAltitude={(f) => {
            const code = (f as CountryFeature).properties.code
            if (code === selectedCountry) return 0.03
            if (code === hovered) return 0.018
            return visited.has(code) ? 0.012 : 0.005
          }}
          polygonsTransitionDuration={300}
          polygonLabel={(f) => `<div class="tip">${escapeHtml(countryNameZh(f as CountryFeature))}</div>`}
          onPolygonHover={(f) => setHovered(f ? (f as CountryFeature).properties.code : null)}
          pointsData={markers}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={(m) => ((m as Marker).id === selectedPlace ? 0.07 : 0.045)}
          pointRadius={(m) => ((m as Marker).id === selectedPlace ? 0.42 : 0.3)}
          pointColor={(m) => {
            const mk = m as Marker
            if (mk.kind === 'pending') return '#9fb8ff'
            return mk.id === selectedPlace ? '#ffffff' : '#f1d9a3'
          }}
          pointsMerge={false}
          pointsTransitionDuration={250}
          pointLabel={(m) => `<div class="tip">${escapeHtml((m as Marker).name)}</div>`}
          ringsData={rings}
          ringColor={() => (t: number) => `rgba(241, 217, 163, ${1 - t})`}
          ringMaxRadius={3.5}
          ringPropagationSpeed={2.2}
          ringRepeatPeriod={1100}
        />
      )}
    </div>
  )
}
