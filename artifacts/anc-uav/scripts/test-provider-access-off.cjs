// Source-level regression checks for the disabled Provider Access UI.
// These checks do not claim to exercise native iOS Keychain behavior.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const settings = read('app/(tabs)/settings.tsx');
const library = read('app/(tabs)/library.tsx');
const accounts = read('app/accounts.tsx');

test('Settings and Library expose no Provider Access or secure-vault entry points', () => {
  for (const [screen, source] of [['Settings', settings], ['Library', library]]) {
    assert.doesNotMatch(source, /provider access|secure[- ]?vault|secure[- ]?store|credential/i, `${screen} should not expose disabled provider controls`);
    assert.doesNotMatch(source, /['"]\/(?:accounts|provider-access)(?:['"/?#]|$)/i, `${screen} must not link to a provider route`);
    assert.doesNotMatch(source, /secure-vault|expo-secure-store|SecureStore/i, `${screen} must not access the credential vault`);
  }
});

test('the legacy Accounts route renders only the disabled notice', () => {
  const file = ts.createSourceFile('accounts.tsx', accounts, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const jsxNames = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      jsxNames.push(node.tagName.getText(file));
    }
    ts.forEachChild(node, visit);
  }
  visit(file);

  assert.deepEqual(jsxNames.sort(), ['Callout', 'Screen']);
  assert.match(accounts, /title="Provider Access is off"/);
  assert.match(accounts, /Feature disabled/);
  assert.match(accounts, /secure-storage values are retained and are not accessed or deleted/i);
  assert.match(accounts, /makes no provider requests/i);
  assert.doesNotMatch(accounts, /secure-vault|expo-secure-store|SecureStore|fetch\s*\(|axios|api-client/i);
});
