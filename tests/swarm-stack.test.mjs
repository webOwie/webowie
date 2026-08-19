import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const stack = readFileSync('deploy/swarm/stack.yml', 'utf8');
const workflow = readFileSync('.github/workflows/swarm-devsecops.yml', 'utf8');
const deploy = readFileSync('scripts/swarm-deploy.sh', 'utf8');
const verify = readFileSync('scripts/swarm-verify.sh', 'utf8');

const requiredServices = [
  'traefik:',
  'prometheus:',
  'grafana:',
  'node-exporter:',
  'cadvisor:'
];

test('swarm stack uses registry images and swarm-safe orchestration primitives', () => {
  assert.match(stack, /^version:\s*["']3\.9["']/m);
  for (const service of requiredServices) assert.ok(stack.includes(service), `missing ${service}`);
  assert.ok(!/^\s*build:/m.test(stack), 'Swarm stack must not contain build:');
  assert.ok(!/^\s*depends_on:/m.test(stack), 'Swarm stack must not rely on depends_on:');
  assert.match(stack, /driver:\s*overlay/);
  assert.match(stack, /update_config:/);
  assert.match(stack, /failure_action:\s*rollback/);
  assert.match(stack, /rollback_config:/);
  assert.match(stack, /resources:\s*\n\s+limits:/);
  assert.match(stack, /restart_policy:/);
});

test('observability services are resource bounded and persistent where required', () => {
  assert.match(stack, /prometheus_data:/);
  assert.match(stack, /grafana_data:/);
  assert.match(stack, /--storage\.tsdb\.retention\.time=7d/);
  assert.match(stack, /mode:\s*global/);
});

test('deployment scripts validate, deploy, verify and support rollback', () => {
  assert.match(deploy, /docker stack deploy/);
  assert.match(deploy, /--with-registry-auth/);
  assert.match(deploy, /--prune/);
  assert.match(verify, /docker stack services/);
  assert.match(verify, /docker service ps/);
  assert.match(verify, /--rollback/);
});

test('CI pipeline contains quality, security, package and swarm deploy gates', () => {
  for (const marker of ['quality:', 'security:', 'package:', 'deploy-staging:', 'deploy-production:']) {
    assert.ok(workflow.includes(marker), `missing job ${marker}`);
  }
  assert.match(workflow, /npm test/);
  assert.match(workflow, /cargo test/);
  assert.match(workflow, /trivy/);
  assert.match(workflow, /docker\/build-push-action/);
  assert.match(workflow, /scripts\/swarm-deploy\.sh/);
  assert.match(workflow, /environment:\s*production/);
});
