// Maintainer-only generation. No server/API credentials. Runtime never runs this script.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { buildCommunitySnapshot, MAX_AIRPORT_CSV_BYTES, MAX_FREQUENCY_CSV_BYTES } = require('../lib/community-aviation.ts');

async function text(url, max) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: 'error' });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  let bytes = 0;
  const chunks = [];
  for await (const chunk of res.body) {
    bytes += chunk.length;
    if (bytes > max) throw new Error('Source is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function main() {
  const revision = process.argv[2] || JSON.parse(await text('https://api.github.com/repos/davidmegginson/ourairports-data/git/ref/heads/main', 40000)).object.sha;
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Supply an upstream 40-character commit revision.');
  const root = `https://raw.githubusercontent.com/davidmegginson/ourairports-data/${revision}/`;
  const [airports, frequencies] = await Promise.all([text(root + 'airports.csv', MAX_AIRPORT_CSV_BYTES), text(root + 'airport-frequencies.csv', MAX_FREQUENCY_CSV_BYTES)]);
  const snapshot = buildCommunitySnapshot(airports, frequencies, process.argv[3] || new Date().toISOString(), revision);
  const output = path.join(__dirname, '../data/ourairports-australia.json');
  fs.writeFileSync(output, JSON.stringify(snapshot) + '\n');
  const checksums = { revision, retrievedAt: snapshot.retrievedAt, source: 'https://ourairports.com/data/', licence: 'Public domain',
    airportsCsvSha256: crypto.createHash('sha256').update(airports).digest('hex'),
    frequenciesCsvSha256: crypto.createHash('sha256').update(frequencies).digest('hex') };
  fs.writeFileSync(path.join(__dirname, '../data/ourairports-sources.json'), JSON.stringify(checksums, null, 2) + '\n');
  console.log({ revision, airports: snapshot.airports.length, frequencies: snapshot.frequencies.length,
    rejectedAirports: snapshot.rejectedAirports, rejectedFrequencies: snapshot.rejectedFrequencies, bytes: fs.statSync(output).size });
}
main().catch(e => { console.error(e); process.exitCode = 1; });
