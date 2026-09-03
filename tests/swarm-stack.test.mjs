import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const stack = readFileSync('deploy/swarm/stack.yml', 'utf8');
const workflow = readFileSync('.github/workflows/swarm-devsecops.yml', 'utf8');
const deploy = readFileSync('scripts/swarm-deploy.sh', 'utf8');
const verify = readFileSync('scripts/swarm-verify.sh', 'utf8');
const bootstrap = readFileSync('scripts/swarm-bootstrap.sh', 'utf8');
const dockerfile = readFileSync('deploy/swarm/dashboard/Dockerfile', 'utf8');
const prometheus = readFileSync('deploy/swarm/config/prometheus.yml', 'utf8');
const dashboard = JSON.parse(readFileSync('deploy/swarm/config/webowie-devops-dashboard.json', 'utf8'));

const requiredServices = [
  'socket-proxy:',
  'traefik:',
  'ops-dashboard:',
  'prometheus:',
  'grafana:',
  'node-exporter:'
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

test('docker socket is isolated behind a read-only internal proxy', () => {
  assert.match(stack, /\/var\/run\/docker\.sock:\/var\/run\/docker\.sock:ro/);
  assert.match(stack, /POST:\s*"0"/);
  assert.match(stack, /EVENTS:\s*"1"/);
  assert.match(stack, /internal:\s*true/);
  assert.match(stack, /driver_opts:\s*\n\s+encrypted:/);
  assert.match(stack, /tcp:\/\/socket-proxy:2375/);
  assert.match(stack, /--providers\.swarm\.network=\$\{STACK_NAME\}_edge/);
});

test('edge ingress uses ACME and pins routing to the edge overlay', () => {
  assert.match(stack, /--certificatesresolvers\.le\.acme\.httpchallenge=true/);
  assert.match(stack, /--certificatesresolvers\.le\.acme\.email=\$\{ACME_EMAIL\}/);
  assert.match(stack, /traefik\.http\.routers\.webowie-ops\.tls\.certresolver=le/);
  assert.match(stack, /traefik\.http\.services\.webowie-ops\.loadbalancer\.server\.port=8080/);
});

test('ops dashboard image is minimal and non-root', () => {
  assert.match(dockerfile, /^FROM busybox:1\.37\.0-musl/m);
  assert.match(dockerfile, /^USER 65534:65534/m);
  assert.match(dockerfile, /^EXPOSE 8080/m);
  assert.match(dockerfile, /HEALTHCHECK/);
});

test('observability is resource bounded and carries deployment metadata', () => {
  assert.match(stack, /prometheus_data:/);
  assert.match(stack, /grafana_data:/);
  assert.match(stack, /--storage\.tsdb\.retention\.time=7d/);
  assert.match(stack, /mode:\s*global/);
  assert.match(prometheus, /metrics_path:\s*\/cgi-bin\/metrics/);
  assert.match(prometheus, /ops-dashboard:8080/);
  assert.equal(dashboard.uid, 'webowie-devops-swarm');
  assert.equal(dashboard.title, 'webOwie DevOps & Swarm BI');
  assert.ok(Array.isArray(dashboard.panels) && dashboard.panels.length >= 8);
});

test('deployment scripts bootstrap, validate, deploy, verify and support rollback', () => {
  assert.match(bootstrap, /docker swarm init/);
  assert.match(bootstrap, /webowie\.edge=true/);
  assert.match(deploy, /docker stack deploy/);
  assert.match(deploy, /--with-registry-auth/);
  assert.match(deploy, /--prune/);
  assert.match(verify, /docker stack services/);
  assert.match(verify, /docker service ps/);
  assert.match(verify, /--rollback/);
});

test('CI pipeline contains quality, security, package, smoke and swarm deploy gates', () => {
  for (const marker of ['quality:', 'security:', 'package:', 'deploy-staging:', 'deploy-production:']) {
    assert.ok(workflow.includes(marker), `missing job ${marker}`);
  }
  assert.match(workflow, /npm test/);
  assert.match(workflow, /cargo test/);
  assert.match(workflow, /aquasecurity\/trivy-action@0\.34\.0/);
  assert.match(workflow, /docker\/build-push-action@v6/);
  assert.match(workflow, /Runtime smoke test/);
  assert.match(workflow, /scripts\/swarm-deploy\.sh/);
  assert.match(workflow, /environment:\s*production/);
});
