export interface Place {
  id: string
  name: string
  lat: number
  lng: number
  countryCode?: string
  date?: string
  note?: string
  createdAt: number
}

export interface TravelData {
  version: 1
  places: Place[]
  /** Countries marked as visited directly (places also count towards visited countries). */
  countries: string[]
}

type Ring = [number, number][]

export interface CountryFeature {
  type: 'Feature'
  properties: { code: string; name: string; continent: string; pop: number }
  geometry:
    | { type: 'Polygon'; coordinates: Ring[] }
    | { type: 'MultiPolygon'; coordinates: Ring[][] }
}

export type Selection =
  | { kind: 'country'; code: string; lat: number; lng: number }
  | { kind: 'place'; id: string }
  | { kind: 'new'; lat: number; lng: number; name?: string; countryCode?: string }
  | null
