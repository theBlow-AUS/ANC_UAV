const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const assert = require('node:assert/strict');

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } },
).outputText, filename);
const { explainNotam } = require('../lib/notam-explainer.ts');

const sample = `A1234/26 NOTAMN
Q) YBBB/QRTCA/IV/BO/W/000/015/3350S15110E
A) YSSY
B) 2606101430
C) 2606101800EST
D) DAILY 1430-1800
E) RWY 16L/34R CLSD DUE TO WIP
F) SFC
G) 1500FT AMSL`;

test('explains recognized header, location, UTC times, schedule, impact and limits', () => {
  const result = explainNotam(sample);
  assert.equal(result.original, sample);
  assert.equal(result.items.find(i => i.label === 'Reference and status').explanation, 'New NOTAM');
  assert.equal(result.items.find(i => i.label === 'Location identifier').value, 'YSSY');
  assert.match(result.items.find(i => i.label === 'Start time (B)').explanation, /10 June, year “26” · 14:30 UTC/);
  assert.match(result.items.find(i => i.label === 'End time (C)').explanation, /estimated/);
  assert.match(result.items.find(i => i.label === 'Schedule (D)').explanation, /timezone and recurrence are not interpreted/);
  assert.equal(result.items.find(i => i.label === 'Affected activity / condition (E)').value, 'RWY 16L/34R CLSD DUE TO WIP');
  assert.match(result.items.find(i => i.label === 'Affected activity / condition (E)').explanation, /RWY \(runway\).*CLSD \(closed\).*works in progress/);
  assert.equal(result.items.find(i => i.label === 'Lower limit (F)').explanation, 'Surface level.');
  assert.equal(result.items.find(i => i.label === 'Upper limit (G)').explanation, '1,500 feet above mean sea level.');
  assert.match(result.items.find(i => i.label === 'Q-line (coded qualifiers)').value, /YBBB\/QRTCA/);
  assert.match(result.items.find(i => i.label === 'Start time (B)').explanation, /century is not inferred/);
});

test('preserves Q-codes and does not infer the meaning of linked NOTAMs', () => {
  const text = sample.replace('NOTAMN', 'NOTAMR A0999/26');
  const result = explainNotam(text);
  assert.equal(result.items[0].explanation, 'Replacement NOTAM');
  assert.equal(result.items.find(i => i.label === 'Replaces / cancels reference').value, 'A0999/26');
  assert.match(result.items.find(i => i.label === 'Replaces / cancels reference').explanation, /not looked up/);
  assert.equal(result.items.find(i => i.label === 'Q-line (coded qualifiers)').interpreted, false);
});

test('recognizes permanent end time and a cancellation status', () => {
  const result = explainNotam('B0012/26 NOTAMC B0011/26\nC) PERM');
  assert.equal(result.items[0].explanation, 'Cancellation NOTAM');
  assert.equal(result.items.find(i => i.label === 'End time (C)').explanation, 'Marked PERM (permanent) in the source.');
});

test('flags malformed date-times and altitude formats rather than guessing', () => {
  const result = explainNotam('A0001/26 NOTAMN\nB) 2602312460\nC) 2602312460\nF) 1200\nG) FL9999');
  assert.equal(result.items.find(i => i.label === 'Start time (B)').interpreted, false);
  assert.equal(result.items.find(i => i.label === 'End time (C)').interpreted, false);
  assert.equal(result.items.find(i => i.label === 'Lower limit (F)').value, '1200');
  assert.equal(result.items.find(i => i.label === 'Upper limit (G)').value, 'FL9999');
  assert.ok(result.warnings.some(w => w.includes('B) start-time')));
  assert.ok(result.warnings.some(w => w.includes('F) altitude-limit')));
});

test('surfaces unsupported sections, missing fields, and invalid input safely', () => {
  const result = explainNotam('This is not a standard NOTAM\nH) UNKNOWN DATA');
  assert.equal(result.items.length, 0);
  assert.ok(result.warnings.some(w => w.includes('outside the supported A–G fields')));
  assert.ok(result.warnings.some(w => w.includes('No supported NOTAM fields')));
  assert.throws(() => explainNotam('   '), /Enter or paste/);
  assert.throws(() => explainNotam('x'.repeat(12_001)), /limited to 12,000/);
});

test('continuation lines remain attached to their original section', () => {
  const result = explainNotam('A1234/26 NOTAMN\nE) RWY 09 CLSD\nDUE TO MAINTENANCE');
  assert.equal(result.items.find(i => i.label === 'Affected activity / condition (E)').value, 'RWY 09 CLSD\nDUE TO MAINTENANCE');
});

test('explanation runs synchronously without making network requests', () => {
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = () => { requests += 1; throw new Error('network access attempted'); };
  try {
    explainNotam(sample);
    assert.equal(requests, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('Comms explainer has no API, storage, analytics, or external-text path', () => {
  const component = fs.readFileSync(path.join(__dirname, '../components/NotamExplainer.tsx'), 'utf8');
  assert.match(component, /explainNotam\(draft\)/);
  assert.doesNotMatch(component, /\bfetch\s*\(|XMLHttpRequest|AsyncStorage|SecureStore|api-client-react|analytics/i);
});
