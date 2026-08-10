import test from 'node:test';
import assert from 'node:assert/strict';
import { getNavigationView } from '../ui/core/navigation.js';

test('sidebar exposes every declared control-plane view', () => {
  const expected = ['infrastructure', 'inventory', 'server-factory', 'network', 'security', 'dns'];
  for (const id of expected) {
    const view = getNavigationView(id);
    assert.equal(view.id, id);
    assert.ok(view.title.length > 0);
    assert.ok(['active', 'analyze', 'gated'].includes(view.state));
  }
});

test('inventory navigates to the existing resource section', () => {
  assert.equal(getNavigationView('inventory').targetId, 'inventoryPanel');
});

test('planned modules provide an honest explanatory panel instead of a dead click', () => {
  for (const id of ['server-factory', 'network', 'security', 'dns']) {
    const view = getNavigationView(id);
    assert.equal(view.mode, 'module');
    assert.ok(view.summary.length > 20);
  }
});

test('unknown view ids are rejected', () => {
  assert.throws(() => getNavigationView('nonsense'), /Unknown navigation view/);
});
