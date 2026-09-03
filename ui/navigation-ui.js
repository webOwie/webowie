import { getNavigationView } from './core/navigation.js';

const navButtons = [...document.querySelectorAll('.nav-item[data-view]')];
const metricsGrid = document.getElementById('metricsGrid');
const inventoryPanel = document.querySelector('.inventory-panel');
const statusBanner = document.getElementById('statusBanner');

function ensureModulePanel() {
  let panel = document.getElementById('navigationModulePanel');
  if (panel) return panel;

  panel = document.createElement('section');
  panel.id = 'navigationModulePanel';
  panel.className = 'panel hidden';
  panel.style.marginBottom = '14px';
  panel.innerHTML = `
    <div class="panel-heading">
      <div>
        <p class="eyebrow" id="navigationModuleState">MODULE</p>
        <h2 id="navigationModuleTitle">Module</h2>
      </div>
    </div>
    <div style="padding:0 20px 20px">
      <p id="navigationModuleSummary" style="margin:0;color:#96a3b7;line-height:1.6"></p>
    </div>`;
  metricsGrid.parentNode.insertBefore(panel, metricsGrid);
  return panel;
}

function markActive(button) {
  navButtons.forEach(item => item.classList.toggle('active', item === button));
}

function showTarget(view) {
  const panel = document.getElementById('navigationModulePanel');
  if (panel) panel.classList.add('hidden');

  const target = view.targetId === 'inventoryPanel' ? inventoryPanel : document.getElementById(view.targetId);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showModule(view) {
  const panel = ensureModulePanel();
  document.getElementById('navigationModuleState').textContent = view.state.toUpperCase();
  document.getElementById('navigationModuleTitle').textContent = view.title;
  document.getElementById('navigationModuleSummary').textContent = view.summary;
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (statusBanner) {
    statusBanner.textContent = `${view.title}: ${view.state === 'gated' ? 'noch gesperrt' : 'Analysemodus'}. Der Menüpunkt ist jetzt angebunden; nicht implementierte Schreibfunktionen werden nicht vorgetäuscht.`;
    statusBanner.className = 'status-banner';
  }
}

for (const button of navButtons) {
  button.addEventListener('click', () => {
    const view = getNavigationView(button.dataset.view);
    markActive(button);
    if (view.mode === 'target') showTarget(view);
    else showModule(view);
  });
}
