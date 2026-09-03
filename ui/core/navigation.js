const VIEWS = Object.freeze({
  infrastructure: {
    id: 'infrastructure',
    title: 'Infrastructure Map',
    state: 'active',
    mode: 'target',
    targetId: 'metricsGrid',
    summary: 'Live-Topologie, Inventarzustand und Controller-Status des verbundenen Proxmox-Clusters.'
  },
  inventory: {
    id: 'inventory',
    title: 'Inventory',
    state: 'active',
    mode: 'target',
    targetId: 'inventoryPanel',
    summary: 'Erkannte Nodes, Gäste, Storage- und Netzwerkressourcen.'
  },
  'server-factory': {
    id: 'server-factory',
    title: 'Server Factory',
    state: 'gated',
    mode: 'module',
    summary: 'Deklarative Server-Blueprints, Paket-/SBOM-Auflösung, Validierung und später kontrollierte Bereitstellung. Schreibende Provisionierung bleibt in V0.1 gesperrt.'
  },
  network: {
    id: 'network',
    title: 'Network Fabric',
    state: 'analyze',
    mode: 'module',
    summary: 'Analyse von Bridges, Interfaces, VLANs und geplanten Connectivity Contracts. Der aktuelle Stand ist read/analyze, nicht apply.'
  },
  security: {
    id: 'security',
    title: 'Security Controller',
    state: 'analyze',
    mode: 'module',
    summary: 'Security-Zustand, Trust Boundaries und Policy-Analyse. Änderungen bleiben hinter Simulation und Freigabe-Gates.'
  },
  dns: {
    id: 'dns',
    title: 'DNS / ACME',
    state: 'gated',
    mode: 'module',
    summary: 'DNS- und ACME/DNS-01-Automation ist als kontrollierter Workflow vorgesehen. V0.1 führt noch keine DNS- oder Zertifikatsmutation aus.'
  }
});

export function getNavigationView(id) {
  const view = VIEWS[id];
  if (!view) throw new Error(`Unknown navigation view: ${id}`);
  return view;
}

export function listNavigationViews() {
  return Object.values(VIEWS);
}
