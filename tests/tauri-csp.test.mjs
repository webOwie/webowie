import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));

test('Tauri CSP permits same-origin frontend asset fetches', () => {
  const csp = config.app?.security?.csp || '';
  const connect = csp.split(';').map(part => part.trim()).find(part => part.startsWith('connect-src '));
  assert.ok(connect, 'connect-src directive must exist');
  assert.match(connect, /(?:^|\s)'self'(?:\s|$)/, 'connect-src must include self so bundled demo JSON can be fetched');
});
