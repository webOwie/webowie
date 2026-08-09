import { normalizeResources, buildServiceEdges } from './core/topology.js';
import { summarizeSbom, componentExplanation, normalizeComponent } from './core/sbom.js';

const state = {
  config: null,
  resources: [],
  nodes: [],
  edges: [],
  metadata: {},
  selected: null,
  selectedTab: 'overview',
  source: 'none'
};

const $ = (id) => document.getElementById(id);
const invoke = window.__TAURI__?.core?.invoke;

function log(code, message) {
  const item = document.createElement('div');
  item.innerHTML = `<span>${escapeHtml(code)}</span><p>${escapeHtml(message)}</p>`;
  $('eventLog').prepend(item);
}

function banner(message, kind = '') {
  const el = $('statusBanner');
  el.textContent = message;
  el.className = `status-banner ${kind}`;
}

function hideBanner() { $('statusBanner').classList.add('hidden'); }

function connectionConfig() {
  return {
    baseUrl: $('baseUrl').value.trim(),
    tokenId: $('tokenId').value.trim(),
    tokenSecret: $('tokenSecret').value,
    acceptInvalidTls: $('invalidTls').checked
  };
}

async function testConnection() {
  if (!invoke) throw new Error('Tauri backend unavailable. Use Demo mode when running in a browser.');
  const config = connectionConfig();
  const result = await invoke('test_connection', { config });
  state.config = config;
  banner(`Verbindung erfolgreich: Proxmox ${result.version || result.release || ''} · ${result.baseUrl}`, 'success');
  log('API', `Verbindung zu ${result.baseUrl} erfolgreich getestet.`);
  return result;
}

async function connectAndLoad() {
  await testConnection();
  const resources = await invoke('fetch_inventory', { config: state.config });
  state.resources = resources;
  state.nodes = normalizeResources(resources);
  state.edges = [];
  state.metadata = {};
  state.source = 'proxmox';
  renderAll();
  $('connectionPanel').classList.add('hidden');
  log('SYNC', `${state.nodes.length} Proxmox-Ressourcen geladen. Keine Service-Beziehungen werden erfunden.`);
}

async function loadDemo() {
  const data = await fetch('./data/demo.json').then((r) => r.json());
  state.resources = data.resources;
  state.nodes = normalizeResources(data.resources);
  state.edges = buildServiceEdges(state.nodes, data.edges);
  state.metadata = data.metadata || {};
  state.source = 'demo';
  renderAll();
  banner('Demo-Blueprint geladen. Diese Daten stammen nicht von einem echten Cluster.', 'success');
  log('DEMO', 'webOwie-Beispieltopologie mit deklarierter Service-Matrix geladen.');
}

function renderAll() {
  updateMetrics();
  renderResourceCards();
  renderMap();
}

function updateMetrics() {
  $('nodeCount').textContent = state.nodes.filter(n => n.kind === 'node').length;
  $('guestCount').textContent = state.nodes.filter(n => ['qemu', 'lxc'].includes(n.kind)).length;
  $('runningCount').textContent = state.nodes.filter(n => n.status === 'running' || n.status === 'online').length;
  $('edgeCount').textContent = state.edges.length;
}

function renderResourceCards() {
  const grid = $('resourceGrid');
  grid.innerHTML = '';
  const guests = state.nodes.filter(n => n.kind !== 'node');
  if (!guests.length) {
    grid.innerHTML = '<div class="empty-state" style="height:120px"><span>Noch keine VM/LXC-Ressourcen.</span></div>';
    return;
  }
  for (const node of guests) {
    const button = document.createElement('button');
    button.className = 'resource-card';
    button.innerHTML = `
      <div class="resource-top"><div><strong>${escapeHtml(node.name)}</strong><small>#${node.vmid ?? '—'} · ${escapeHtml(node.kind.toUpperCase())}</small></div><span class="badge">${escapeHtml(node.status)}</span></div>
      <div class="resource-meta"><span>${escapeHtml(node.node || 'unassigned')}</span><span>${formatBytes(node.mem)} / ${formatBytes(node.maxmem)}</span></div>`;
    button.addEventListener('click', () => openDrawer(node.id));
    grid.appendChild(button);
  }
}

function renderMap() {
  const svg = $('topologyMap');
  const empty = $('mapEmpty');
  svg.innerHTML = '';
  if (!state.nodes.length) {
    svg.classList.remove('visible');
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  svg.classList.add('visible');

  const hosts = state.nodes.filter(n => n.kind === 'node');
  const guests = state.nodes.filter(n => n.kind !== 'node');
  const positions = new Map();

  hosts.forEach((host, i) => positions.set(host.id, { x: 70, y: 90 + i * 170 }));
  guests.forEach((guest, i) => positions.set(guest.id, { x: 390 + (i % 2) * 315, y: 75 + Math.floor(i / 2) * 155 }));

  for (const guest of guests) {
    const host = hosts.find(h => h.name === guest.node);
    if (host) drawLine(svg, positions.get(host.id), positions.get(guest.id), `${guest.kind.toUpperCase()} #${guest.vmid}`, 'host-link');
  }
  for (const edge of state.edges) {
    drawLine(svg, positions.get(edge.from), positions.get(edge.to), `${edge.service} ${edge.protocol.toUpperCase()}/${edge.port ?? ''}`, 'service-link');
  }
  for (const host of hosts) drawBox(svg, host, positions.get(host.id), true);
  for (const guest of guests) drawBox(svg, guest, positions.get(guest.id), false);
}

function drawLine(svg, from, to, label, kind) {
  if (!from || !to) return;
  const ns = 'http://www.w3.org/2000/svg';
  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', from.x + 100); line.setAttribute('y1', from.y + 30);
  line.setAttribute('x2', to.x); line.setAttribute('y2', to.y + 30);
  line.setAttribute('stroke', kind === 'service-link' ? '#68e0a2' : '#2f405a');
  line.setAttribute('stroke-width', kind === 'service-link' ? '1.6' : '1.1');
  line.setAttribute('stroke-dasharray', kind === 'service-link' ? '0' : '5 5');
  line.setAttribute('opacity', '.82');
  svg.appendChild(line);
  const text = document.createElementNS(ns, 'text');
  text.setAttribute('x', (from.x + 100 + to.x) / 2);
  text.setAttribute('y', (from.y + to.y) / 2 + 18);
  text.setAttribute('fill', kind === 'service-link' ? '#83d9ad' : '#637189');
  text.setAttribute('font-size', '9');
  text.textContent = label;
  svg.appendChild(text);
}

function drawBox(svg, node, pos, isHost) {
  if (!pos) return;
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');
  g.style.cursor = isHost ? 'default' : 'pointer';
  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('x', pos.x); rect.setAttribute('y', pos.y);
  rect.setAttribute('width', isHost ? 200 : 240); rect.setAttribute('height', 62);
  rect.setAttribute('rx', 12);
  rect.setAttribute('fill', isHost ? '#0d2430' : '#15172b');
  rect.setAttribute('stroke', isHost ? '#4fcde9' : '#6f64c9');
  rect.setAttribute('stroke-opacity', '.55');
  const title = document.createElementNS(ns, 'text');
  title.setAttribute('x', pos.x + 14); title.setAttribute('y', pos.y + 25); title.setAttribute('fill', '#eef4ff'); title.setAttribute('font-size', '12'); title.setAttribute('font-weight', '700');
  title.textContent = node.name;
  const sub = document.createElementNS(ns, 'text');
  sub.setAttribute('x', pos.x + 14); sub.setAttribute('y', pos.y + 45); sub.setAttribute('fill', '#8795ac'); sub.setAttribute('font-size', '9');
  const meta = state.metadata[node.id]?.network;
  sub.textContent = isHost ? `PVE NODE · ${node.status}` : `${node.kind.toUpperCase()} #${node.vmid} · ${meta ? `VLAN ${meta.vlan}` : node.node}`;
  g.append(rect, title, sub);
  if (!isHost) g.addEventListener('click', () => openDrawer(node.id));
  svg.appendChild(g);
}

async function openDrawer(id) {
  state.selected = state.nodes.find(node => node.id === id);
  state.selectedTab = 'overview';
  if (!state.selected) return;
  $('drawerTitle').textContent = state.selected.name;
  $('drawerKind').textContent = `${state.selected.kind.toUpperCase()} ${state.selected.vmid ? `#${state.selected.vmid}` : ''}`;
  $('drawerSubtitle').textContent = `${state.selected.node || 'unassigned'} · ${state.selected.status}`;
  $('drawerTabs').querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.tab === 'overview'));
  renderDrawer();
  $('drawerBackdrop').classList.remove('hidden');
  $('serverDrawer').classList.add('open');
  $('serverDrawer').setAttribute('aria-hidden', 'false');

  if (state.source === 'proxmox' && invoke && ['qemu', 'lxc'].includes(state.selected.kind)) {
    try {
      const config = await invoke('fetch_guest_config', { config: state.config, node: state.selected.node, kind: state.selected.kind, vmid: state.selected.vmid });
      state.metadata[id] = { ...(state.metadata[id] || {}), proxmoxConfig: config };
      renderDrawer();
    } catch (error) {
      log('WARN', `Guest-Konfiguration konnte nicht geladen werden: ${String(error)}`);
    }
  }
}

function closeDrawer() {
  $('drawerBackdrop').classList.add('hidden');
  $('serverDrawer').classList.remove('open');
  $('serverDrawer').setAttribute('aria-hidden', 'true');
}

function renderDrawer() {
  const node = state.selected;
  if (!node) return;
  const meta = state.metadata[node.id] || {};
  const content = $('drawerContent');
  if (state.selectedTab === 'overview') {
    content.innerHTML = `<div class="detail-grid">
      ${detail('Status', node.status)}${detail('Host', node.node || '—')}${detail('Type', node.kind.toUpperCase())}${detail('VMID', node.vmid ?? '—')}
      ${detail('Memory', `${formatBytes(node.mem)} / ${formatBytes(node.maxmem)}`)}${detail('Security Score', meta.securityScore ? `${meta.securityScore}/100` : 'not assessed')}
    </div>${meta.services?.length ? `<h3>Services</h3><div class="component-meta">${meta.services.map(s => `<span>${escapeHtml(s)}</span>`).join('')}</div>` : ''}`;
  } else if (state.selectedTab === 'network') {
    const network = meta.network;
    content.innerHTML = network ? `<div class="detail-grid">${detail('Plane', network.plane)}${detail('Trust Zone', network.zone)}${detail('VLAN', network.vlan)}${detail('IP', network.ip)}${detail('DNS', network.dns)}</div>` : `<p class="form-note">Für diesen live entdeckten Gast ist noch kein webOwie Network Blueprint registriert.</p>`;
  } else if (state.selectedTab === 'security') {
    const related = state.edges.filter(edge => edge.from === node.id || edge.to === node.id);
    content.innerHTML = `<div class="detail-grid">${detail('Security Score', meta.securityScore ? `${meta.securityScore}/100` : 'not assessed')}${detail('Known service links', related.length)}</div><h3>Connectivity Contract</h3>${related.length ? related.map(edge => `<div class="component"><div class="component-head"><h3>${escapeHtml(edge.service)}</h3><span class="badge">${escapeHtml(edge.policy)}</span></div><p>${escapeHtml(edge.from)} → ${escapeHtml(edge.to)} · ${escapeHtml(edge.protocol.toUpperCase())}/${edge.port ?? ''}</p><div class="component-meta"><span>${escapeHtml(edge.reason || 'declared')}</span></div></div>`).join('') : '<p class="form-note">Keine deklarierte Service-Beziehung vorhanden. V1 erfindet keine Verbindungen aus offenen Ports.</p>'}`;
  } else if (state.selectedTab === 'sbom') {
    const components = (meta.sbom || []).map(normalizeComponent);
    if (!components.length) {
      content.innerHTML = `<p class="form-note">Für diesen Live-Gast ist noch keine webOwie-SBOM hinterlegt. Sie wird bei Builds der Server Factory erzeugt oder später aus autorisierten Guest-Inventardaten importiert.</p>`;
      return;
    }
    const summary = summarizeSbom(components);
    content.innerHTML = `<div class="sbom-summary">${detail('Components', summary.total)}${detail('Required', summary.required)}${detail('Optional', summary.optional)}${detail('Unknown', summary.unknown)}</div><div class="component-list">${components.map(renderComponent).join('')}</div>`;
  }
}

function renderComponent(component) {
  return `<article class="component">
    <div class="component-head"><div><h3>${escapeHtml(component.name)} <small>${escapeHtml(component.version)}</small></h3></div><span class="badge">${component.required ? 'required' : 'optional'}</span></div>
    <p>${escapeHtml(componentExplanation(component))}</p>
    <div class="component-meta"><span>${escapeHtml(component.category)}</span><span>owner: ${escapeHtml(component.owner)}</span><span>security: ${escapeHtml(component.securityRelevance)}</span>${component.ports.map(port => `<span>tcp/${escapeHtml(String(port))}</span>`).join('')}</div>
  </article>`;
}

function detail(label, value) {
  return `<div class="detail"><span>${escapeHtml(String(label))}</span><strong>${escapeHtml(String(value ?? '—'))}</strong></div>`;
}

function formatBytes(value) {
  if (!value) return '0 B';
  const units = ['B','KB','MB','GB','TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 2 ? 1 : 0)} ${units[index]}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

$('connectButton').addEventListener('click', () => $('connectionPanel').classList.toggle('hidden'));
$('closeConnection').addEventListener('click', () => $('connectionPanel').classList.add('hidden'));
$('demoButton').addEventListener('click', () => loadDemo().catch(error => banner(String(error), 'error')));
$('testConnection').addEventListener('click', async () => {
  hideBanner();
  try { await testConnection(); } catch (error) { banner(String(error), 'error'); log('ERROR', String(error)); }
});
$('connectionForm').addEventListener('submit', async (event) => {
  event.preventDefault(); hideBanner();
  try { await connectAndLoad(); } catch (error) { banner(String(error), 'error'); log('ERROR', String(error)); }
});
$('closeDrawer').addEventListener('click', closeDrawer);
$('drawerBackdrop').addEventListener('click', closeDrawer);
$('drawerTabs').addEventListener('click', event => {
  const button = event.target.closest('button[data-tab]'); if (!button) return;
  state.selectedTab = button.dataset.tab;
  $('drawerTabs').querySelectorAll('button').forEach(b => b.classList.toggle('active', b === button));
  renderDrawer();
});

document.querySelectorAll('[data-map-mode]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-map-mode]').forEach(b => b.classList.toggle('active', b === button));
  if (button.dataset.mapMode !== 'actual') banner(`${button.textContent}: Datenmodell vorhanden; V1 zeigt derzeit den Actual-State-Graph.`, '');
}));

if (!invoke) {
  $('backendMode').textContent = 'Browser preview';
  log('INFO', 'Tauri-Backend nicht gefunden. Demo-Modus verfügbar.');
}
