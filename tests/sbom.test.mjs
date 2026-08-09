import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSbom, componentExplanation } from '../ui/core/sbom.js';

test('summarizes SBOM components by management status', () => {
  const summary = summarizeSbom([
    { name: 'postfix', required: true, owner: 'webOwie Blueprint' },
    { name: 'rspamd', required: false, owner: 'webOwie Blueprint' },
    { name: 'nodejs', required: false, owner: 'Unknown' }
  ]);
  assert.deepEqual(summary, { total: 3, required: 1, optional: 2, unknown: 1 });
});

test('explains a component using its purpose and responsibility', () => {
  const text = componentExplanation({
    name: 'rspamd',
    purpose: 'Spam filtering',
    responsibility: 'mail-security',
    removalImpact: 'Mail filtering stops'
  });
  assert.match(text, /Spam filtering/);
  assert.match(text, /mail-security/);
  assert.match(text, /Mail filtering stops/);
});
