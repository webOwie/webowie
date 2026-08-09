import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResources, buildServiceEdges } from '../ui/core/topology.js';

test('normalizes Proxmox node and guest resources into graph nodes', () => {
  const nodes = normalizeResources([
    { type: 'node', id: 'node/pve01', node: 'pve01', status: 'online' },
    { type: 'qemu', id: 'qemu/101', node: 'pve01', vmid: 101, name: 'webowie-core', status: 'running' }
  ]);
  assert.deepEqual(nodes.map(n => [n.id, n.kind, n.name]), [
    ['node/pve01', 'node', 'pve01'],
    ['qemu/101', 'qemu', 'webowie-core']
  ]);
});

test('buildServiceEdges keeps only edges whose endpoints exist', () => {
  const nodes = [{ id: 'qemu/101' }, { id: 'qemu/102' }];
  const edges = buildServiceEdges(nodes, [
    { from: 'qemu/101', to: 'qemu/102', protocol: 'tcp', port: 5432, service: 'postgres' },
    { from: 'qemu/101', to: 'qemu/999', protocol: 'tcp', port: 6379, service: 'redis' }
  ]);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].service, 'postgres');
});
