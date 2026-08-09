export function summarizeSbom(components = []) {
  const total = components.length;
  const required = components.filter((component) => component.required === true).length;
  const unknown = components.filter((component) => component.owner === 'Unknown').length;
  return {
    total,
    required,
    optional: total - required,
    unknown
  };
}

export function componentExplanation(component = {}) {
  const name = component.name || 'Unknown component';
  const purpose = component.purpose || 'No documented purpose';
  const responsibility = component.responsibility || 'unassigned';
  const impact = component.removalImpact || 'Removal impact not documented';
  return `${name}: ${purpose}. Responsibility: ${responsibility}. Removal impact: ${impact}.`;
}

export function normalizeComponent(component = {}) {
  return {
    name: component.name || 'unknown',
    version: component.version || 'unknown',
    category: component.category || 'system',
    purpose: component.purpose || 'Undocumented',
    responsibility: component.responsibility || 'unassigned',
    required: Boolean(component.required),
    owner: component.owner || 'Unknown',
    service: component.service || null,
    ports: Array.isArray(component.ports) ? component.ports : [],
    dependencies: Array.isArray(component.dependencies) ? component.dependencies : [],
    removalImpact: component.removalImpact || 'Unknown',
    securityRelevance: component.securityRelevance || 'UNKNOWN'
  };
}
