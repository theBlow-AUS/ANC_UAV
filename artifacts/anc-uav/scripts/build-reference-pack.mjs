// Maintainer-only, not app runtime. Inputs are Natural Earth v5.1.2 GeoJSON:
// https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson
// Public domain: https://www.naturalearthdata.com/about/terms-of-use/
// node scripts/build-reference-pack.mjs /path/countries.json /path/places.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [countriesPath, placesPath] = process.argv.slice(2);
if (!countriesPath || !placesPath) throw new Error('Supply ne_110m_admin_0_countries and ne_50m_populated_places_simple v5.1.2 GeoJSON paths.');
const countries = JSON.parse(readFileSync(countriesPath, 'utf8'));
const places = JSON.parse(readFileSync(placesPath, 'utf8'));
const source = {
  publisher: 'Natural Earth contributors',
  source: 'https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson',
  edition: '5.1.2 · 1:110m country outlines / 1:50m selected populated places',
  effectiveFrom: null, effectiveTo: null,
  retrievedAt: new Date().toISOString(),
  licence: 'Public domain',
  rightsReference: 'https://www.naturalearthdata.com/about/terms-of-use/',
  attribution: 'Made with Natural Earth. General reference only; not an aviation chart.',
};
const position = ([longitude, latitude]) => ({ latitude, longitude });
const pack = {
  format: 'anc-navigation-v1', id: 'natural-earth-au', name: 'Australia · overview reference',
  bounds: { south: -45, north: -9, west: 112, east: 155 },
  provenance: source,
  coverage: {
    aerodromes: 'absent', localities: 'partial', frequencies: 'absent',
    notes: 'Generalised mainland/Tasmania outline and selected populated places only. Omits small localities, roads, terrain, aerodromes, airspace and frequencies. No declared operational validity. Zooming does not add detail.',
  },
  land: countries.features.filter(f => f.properties.ADMIN === 'Australia').flatMap(f => {
    const polygons = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    return polygons.map(p => p[0].map(position));
  }),
  places: places.features.filter(f => f.properties.adm0name === 'Australia').map(f => ({
    id: `ne-${f.properties.ne_id}`, name: f.properties.name,
    position: position(f.geometry.coordinates), kind: 'locality', provenance: source,
    statusNote: 'Selected populated-place reference; not an aerodrome.',
  })),
  frequencies: [],
};
writeFileSync(fileURLToPath(new URL('../data/australia-reference.json', import.meta.url)), JSON.stringify(pack));
console.log(`Generated ${pack.land.length} outlines and ${pack.places.length} localities; no aviation records.`);
