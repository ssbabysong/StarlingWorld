import type { CountryFeature } from './types'

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['zh-CN'], { type: 'region' })
  } catch {
    return null
  }
})()

const NAME_OVERRIDES: Record<string, string> = {
  XN: '北塞浦路斯',
  XS: '索马里兰',
}

const CONTINENTS_ZH: Record<string, string> = {
  Africa: '非洲',
  Antarctica: '南极洲',
  Asia: '亚洲',
  Europe: '欧洲',
  'North America': '北美洲',
  Oceania: '大洋洲',
  'South America': '南美洲',
}

export function countryNameZh(f: CountryFeature): string {
  const { code, name } = f.properties
  if (NAME_OVERRIDES[code]) return NAME_OVERRIDES[code]
  const zh = regionNames?.of(code)
  return zh && zh !== code ? zh : name
}

export function continentZh(continent: string): string {
  return CONTINENTS_ZH[continent] ?? '其他'
}

export async function loadCountries(): Promise<CountryFeature[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/countries.geojson`)
  if (!res.ok) throw new Error(`加载国家数据失败（${res.status}）`)
  const json = (await res.json()) as { features: CountryFeature[] }
  return json.features
}

function inRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function inPolygon(lng: number, lat: number, rings: [number, number][][]): boolean {
  if (!inRing(lng, lat, rings[0])) return false
  return !rings.slice(1).some((hole) => inRing(lng, lat, hole))
}

/** Finds the country containing a coordinate, if any. */
export function findCountry(
  lat: number,
  lng: number,
  countries: CountryFeature[],
): CountryFeature | undefined {
  return countries.find(({ geometry }) =>
    geometry.type === 'Polygon'
      ? inPolygon(lng, lat, geometry.coordinates)
      : geometry.coordinates.some((poly) => inPolygon(lng, lat, poly)),
  )
}

export interface SearchResult {
  name: string
  fullName: string
  lat: number
  lng: number
}

/** Place search via OpenStreetMap Nominatim. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '6',
    'accept-language': 'zh-CN,zh,en',
  }).toString()
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`搜索失败（${res.status}）`)
  const rows = (await res.json()) as { name: string; display_name: string; lat: string; lon: string }[]
  return rows.map((r) => ({
    name: r.name || r.display_name.split(',')[0],
    fullName: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }))
}
