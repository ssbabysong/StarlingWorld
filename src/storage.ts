import type { Place, TravelData } from './types'

const KEY = 'starlingworld:v1'

export const emptyData = (): TravelData => ({ version: 1, places: [], countries: [] })

function isPlace(p: unknown): p is Place {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.lat === 'number' &&
    typeof o.lng === 'number'
  )
}

/** Validates untrusted JSON (from storage or an imported file). */
export function parseData(raw: unknown): TravelData | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.places) || !Array.isArray(o.countries)) return null
  return {
    version: 1,
    places: o.places.filter(isPlace),
    countries: o.countries.filter((c): c is string => typeof c === 'string'),
  }
}

export function loadData(): TravelData {
  try {
    const raw = localStorage.getItem(KEY)
    return (raw && parseData(JSON.parse(raw))) || emptyData()
  } catch {
    return emptyData()
  }
}

export function saveData(data: TravelData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Storage unavailable (private mode, quota): keep working in memory.
  }
}

export function exportData(data: TravelData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `starlingworld-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
