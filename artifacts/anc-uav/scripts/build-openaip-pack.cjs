#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const sourceUrl = 'https://storage.openaip.net/openaip-system-exports/au_asp.json';
const rightsUrl = 'https://www.openaip.net/legal';
const attribution = 'Data used comes from openAIP and is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License. Visit https://www.openaip.net and https://creativecommons.org/licenses/by-nc/4.0/.';
const warning = 'openAIP states its data is uncertified, contains errors, and must not be used for primary navigation or flight planning. Verify with current authorized publications and NOTAMs.';
const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function fail(message) {
  throw new Error(`openAIP pack build failed: ${message}`);
}

function mapReference(datum) {
  if (datum === 0) return 'AGL'; // Source GND is the surface datum; expressed as zero AGL.
  if (datum === 1) return 'AMSL';
  if (datum === 2) return 'FL';
  fail(`unsupported vertical datum ${datum}`);
}

function assertH24(record) {
  const hours = record.hoursOfOperation?.operatingHours;
  if (!Array.isArray(hours) || hours.length !== 7 ||
      hours.some(h => h.startTime !== '00:00' || h.endTime !== '00:00' ||
        h.sunrise !== false || h.sunset !== false || h.byNotam !== false ||
        h.publicHolidaysExcluded !== false)) {
    fail(`unsupported or conditional hours for record ${record._id}; do not assume UTC or H24`);
  }
}

function sourceConditions(record) {
  const conditions = [warning];
  if (record.byNotam) conditions.push('Source marks activation as by NOTAM.');
  if (record.onDemand) conditions.push('Source marks activation as on demand.');
  if (record.onRequest) conditions.push('Source marks activation as on request.');
  if (record.specialAgreement) conditions.push('Source requires checking for a special agreement.');
  if (record.requestCompliance) conditions.push('Source marks a request-compliance condition.');
  if (record.activity && record.activity !== 0) conditions.push(`Check source activity code ${record.activity}.`);
  return conditions.join(' ');
}

async function main() {
  const response = await fetch(sourceUrl, { redirect: 'error' });
  if (!response.ok) fail(`source returned HTTP ${response.status}`);
  const sourceBytes = Buffer.from(await response.arrayBuffer());
  if (sourceBytes.length > 16 * 1024 * 1024) fail('source exceeded the 16 MB maintainer-build limit');
  const source = JSON.parse(sourceBytes.toString('utf8'));
  if (!Array.isArray(source) || !source.length) fail('source is not a non-empty airspace array');
  const rows = source.filter(record => Array.isArray(record.frequencies) && record.frequencies.length > 0);
  if (!rows.length) fail('no frequency-linked airspace records were found');

  const retrievedAt = new Date().toISOString();
  const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
  const extrema = { south: Infinity, north: -Infinity, west: Infinity, east: -Infinity };
  const frequencies = [];
  const ids = new Set();

  for (const record of rows) {
    if (record.country !== 'AU') fail(`unexpected non-Australian record ${record._id}`);
    if (record.geometry?.type !== 'Polygon' || !Array.isArray(record.geometry.coordinates) ||
        record.geometry.coordinates.length !== 1) fail(`unsupported geometry for record ${record._id}`);
    const ring = record.geometry.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 3 || ring.length > 2000) fail(`invalid polygon ring for ${record._id}`);
    assertH24(record);
    if (!record.lowerLimit || !record.upperLimit) fail(`missing vertical limits for ${record._id}`);
    for (const limit of [record.lowerLimit, record.upperLimit]) {
      if (![1, 6].includes(limit.unit)) fail(`unsupported vertical unit ${limit.unit} for ${record._id}`);
      if (!Number.isFinite(limit.value)) fail(`invalid vertical limit for ${record._id}`);
      mapReference(limit.referenceDatum);
      if (limit.referenceDatum === 0 && limit.value !== 0)
        fail(`non-zero GND vertical limit for ${record._id}; do not map it to AGL`);
    }
    for (const [longitude, latitude] of ring) {
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
          !Number.isFinite(latitude) || latitude < -90 || latitude > 90) fail(`invalid coordinate for ${record._id}`);
      extrema.west = Math.min(extrema.west, longitude);
      extrema.east = Math.max(extrema.east, longitude);
      extrema.south = Math.min(extrema.south, latitude);
      extrema.north = Math.max(extrema.north, latitude);
    }
    if (ring.some((p, i) => Math.abs(p[0] - ring[(i + 1) % ring.length][0]) > 180))
      fail(`dateline-crossing ring for ${record._id}`);

    record.frequencies.forEach((frequency, index) => {
      if (frequency.unit !== 2 || !/^\d{3}\.\d{3}$/.test(frequency.value) ||
          Number(frequency.value) < 118 || Number(frequency.value) > 136.975)
        fail(`unsupported frequency value or unit for ${record._id}`);
      const id = `open-aip-${record._id}-${frequency._id || index}`;
      if (ids.has(id)) fail(`duplicate frequency identifier ${id}`);
      ids.add(id);
      const recordEdition = `AU airspace export · SHA-256 ${sourceSha256} · record ${record._id} · source updated ${record.updatedAt || 'date not supplied'}`;
      const provenance = {
        publisher: 'openAIP',
        source: sourceUrl,
        edition: recordEdition,
        effectiveFrom: record.activeFrom || null,
        effectiveTo: record.activeUntil || null,
        retrievedAt,
        licence: 'CC BY-NC 4.0',
        rightsReference: rightsUrl,
        attribution,
      };
      frequencies.push({
        id,
        label: `${record.name || 'Unnamed area'}${frequency.name ? ` · ${frequency.name}` : ''}`,
        service: 'AREA_FREQUENCY',
        frequencyMHz: frequency.value,
        provenance,
        applicability: {
          area: { kind: 'polygon', ring: ring.map(([longitude, latitude]) => ({ latitude, longitude })) },
          altitude: {
            lower: { reference: mapReference(record.lowerLimit.referenceDatum), value: record.lowerLimit.value },
            upper: { reference: mapReference(record.upperLimit.referenceDatum), value: record.upperLimit.value },
          },
          // Official record pages render the source's seven 00:00–00:00 daily
          // intervals as 24H. No recurring UTC expansion or validity is invented.
          activeUtc: [],
          condition: sourceConditions(record),
        },
      });
    });
  }

  if (frequencies.length !== 1096) fail(`expected 1,096 source frequency records, found ${frequencies.length}; review the new export before rebuilding`);
  const pack = {
    format: 'anc-navigation-v1',
    id: 'openaip-au-area-frequency',
    name: 'Australia · openAIP area-frequency reference',
    bounds: extrema,
    provenance: {
      publisher: 'openAIP',
      source: sourceUrl,
      edition: `Australian airspace export · retrieved ${retrievedAt} · source SHA-256 ${sourceSha256}`,
      effectiveFrom: null,
      effectiveTo: null,
      retrievedAt,
      licence: 'CC BY-NC 4.0',
      rightsReference: rightsUrl,
      attribution,
    },
    coverage: {
      aerodromes: 'absent',
      localities: 'absent',
      frequencies: 'partial',
      notes: 'Partial community-contributed area-frequency records from openAIP. Uncertified, incomplete and not for primary navigation or flight planning. Effective dates are not supplied; check current authorized publications and NOTAMs.',
    },
    land: [],
    places: [],
    frequencies,
  };

  const packJson = Buffer.from(JSON.stringify(pack));
  const gzip = zlib.gzipSync(packJson, { level: 9 });
  const packedBase64 = gzip.toString('base64');
  const chunks = packedBase64.match(/.{1,16000}/g) || [];
  const moduleText = [
    '// Generated by scripts/build-openaip-pack.cjs. Do not edit by hand.',
    'export const OPENAIP_AU_PACK_GZIP_BASE64 = [',
    ...chunks.map(chunk => `  ${JSON.stringify(chunk)},`),
    '].join(\'\');',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, 'data', 'openaip-au-pack-gzip.ts'), moduleText);
  fs.writeFileSync(path.join(root, 'data', 'openaip-au-pack-manifest.json'), JSON.stringify({
    publisher: 'openAIP',
    source: sourceUrl,
    rightsReference: rightsUrl,
    licence: 'CC BY-NC 4.0',
    retrievedAt,
    sourceSha256,
    sourceBytes: sourceBytes.length,
    sourceAirspaceRecords: source.length,
    linkedFrequencyRecords: frequencies.length,
    packBytes: packJson.length,
    compressedPackBytes: gzip.length,
    packSha256: crypto.createHash('sha256').update(packJson).digest('hex'),
  }, null, 2) + '\n');
  console.log(`Created ${frequencies.length} linked frequency records from ${source.length} AU airspaces.`);
  console.log(`Source SHA-256: ${sourceSha256}`);
  console.log(`Pack JSON: ${packJson.length} bytes; compressed app asset: ${gzip.length} bytes.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
