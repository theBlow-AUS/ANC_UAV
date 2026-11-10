// Optional maintainer check: public requests only, no key or source files retained.
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, f);
const { downloadOpenAip } = require('../lib/openaip-client.ts');
const { openAipNavigationPack } = require('../lib/openaip-data.ts');
const { parseNavigationPack } = require('../data/navigation-pack.ts');
const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 180000);
downloadOpenAip(fetch, ac.signal, () => {}).then(s => {
  const p = parseNavigationPack(openAipNavigationPack(s));
  console.log(JSON.stringify({
    airports: s.airports.length, airspaces: s.airspaces.length,
    airspacesWithoutFrequencies: s.airspaces.filter(a => !a.frequencies.length).length,
    supportedLinkedFrequencyRows: p.frequencies.length,
    normalizedBytes: Buffer.byteLength(JSON.stringify(s)),
    licence: s.licence, sources: s.sources.map(({ key, bytes, modifiedAt }) => ({ key, bytes, modifiedAt })),
  }, null, 2));
}).catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => clearTimeout(timer));
