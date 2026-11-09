export type TileLayerId = 'openfreemap' | 'topographic' | 'satellite';
export type TileBounds = { west: number; south: number; east: number; north: number };

export const TILE_LAYERS: Record<TileLayerId, { label: string; attribution: string; notes: string; maxZoom: number }> = {
  openfreemap: {
    label: 'OpenStreetMap',
    attribution: '© OpenMapTiles · © OpenStreetMap contributors',
    notes: 'OpenFreeMap vector tiles. Each download is limited to 3,000 tiles or 50 MB.',
    maxZoom: 14,
  },
  topographic: {
    label: 'Topographic',
    attribution: '© Commonwealth of Australia (Geoscience Australia) 2016 · CC BY 4.0',
    notes: 'Geoscience Australia 1:250,000 topographic base map; detail is limited by its source scale.',
    maxZoom: 14,
  },
  satellite: {
    label: 'Satellite',
    attribution: 'NASA EOSDIS GIBS · VIIRS NOAA-21',
    notes: 'Dated satellite browse imagery, not high-resolution aerial photography or an aviation chart.',
    maxZoom: 9,
  },
};

export const AUSTRALIA_REGIONS: { id: string; label: string; bounds: TileBounds }[] = [
  { id: 'au', label: 'Australia', bounds: { west: 112.9, south: -44.0, east: 154.0, north: -9.0 } },
  { id: 'nsw', label: 'New South Wales', bounds: { west: 140.9, south: -37.6, east: 159.2, north: -28.0 } },
  { id: 'vic', label: 'Victoria', bounds: { west: 140.9, south: -39.2, east: 150.2, north: -33.9 } },
  { id: 'qld', label: 'Queensland', bounds: { west: 137.9, south: -29.2, east: 153.6, north: -9.0 } },
  { id: 'sa', label: 'South Australia', bounds: { west: 129.0, south: -38.1, east: 141.1, north: -25.9 } },
  { id: 'wa', label: 'Western Australia', bounds: { west: 112.9, south: -35.2, east: 129.1, north: -13.7 } },
  { id: 'tas', label: 'Tasmania', bounds: { west: 143.7, south: -43.8, east: 148.5, north: -39.2 } },
  { id: 'nt', label: 'Northern Territory', bounds: { west: 129.0, south: -26.1, east: 138.0, north: -9.0 } },
  { id: 'act', label: 'Australian Capital Territory', bounds: { west: 148.7, south: -35.93, east: 149.4, north: -35.1 } },
];

export function isValidTileBounds(b: TileBounds) {
  return Number.isFinite(b.west) && Number.isFinite(b.east) &&
    Number.isFinite(b.south) && Number.isFinite(b.north) &&
    b.west >= -180 && b.east <= 180 && b.south >= -85 && b.north <= 85 &&
    b.west < b.east && b.south < b.north;
}

function tileX(lon: number, z: number) {
  return Math.floor((lon + 180) / 360 * 2 ** z);
}
function tileY(lat: number, z: number) {
  const rad = Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI / 180;
  return Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * 2 ** z);
}
export function estimateTileCount(bounds: TileBounds, maxZoom: number, minZoom = 0) {
  if (!isValidTileBounds(bounds) || !Number.isInteger(maxZoom) || !Number.isInteger(minZoom) || minZoom < 0 || maxZoom < minZoom || maxZoom > 22) return 0;
  let count = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const edge = 2 ** z;
    const x1 = Math.max(0, Math.min(edge - 1, tileX(bounds.west, z)));
    const x2 = Math.max(0, Math.min(edge - 1, tileX(bounds.east, z)));
    const y1 = Math.max(0, Math.min(edge - 1, tileY(bounds.north, z)));
    const y2 = Math.max(0, Math.min(edge - 1, tileY(bounds.south, z)));
    count += (x2 - x1 + 1) * (y2 - y1 + 1);
    if (!Number.isSafeInteger(count)) return Number.MAX_SAFE_INTEGER;
  }
  return count;
}

export function mapStyle(layer: TileLayerId, satelliteDate: string) {
  if (layer === 'openfreemap') return 'https://tiles.openfreemap.org/styles/liberty';
  if (layer === 'topographic') return {
    version: 8,
    sources: {
      geoscience: {
        type: 'raster',
        tiles: ['https://services.ga.gov.au/gis/rest/services/Topographic_Base_Map/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 14,
        attribution: TILE_LAYERS.topographic.attribution,
      },
    },
    layers: [{ id: 'ga-topographic', type: 'raster', source: 'geoscience', paint: { 'raster-resampling': 'linear' } }],
  };
  return {
    version: 8,
    sources: {
      nasa: {
        type: 'raster',
        tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA21_CorrectedReflectance_TrueColor/default/${satelliteDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 9,
        attribution: TILE_LAYERS.satellite.attribution,
      },
    },
    layers: [{ id: 'nasa-satellite', type: 'raster', source: 'nasa' }],
  };
}

export function estimatedBytes(layer: TileLayerId, tileCount: number) {
  // Conservative planning estimate only; providers may return tiles of different sizes.
  const bytesPerTile = layer === 'openfreemap' ? 16 * 1024 : 48 * 1024;
  return tileCount * bytesPerTile + 1_500_000;
}
