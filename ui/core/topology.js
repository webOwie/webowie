export function normalizeResources(resources = []) {
  return resources
    .filter(Boolean)
    .map((resource) => {
      const kind = resource.type || 'unknown';
      const fallbackName = resource.node || resource.id || 'unnamed';
      return {
        id: String(resource.id ?? `${kind}/${resource.vmid ?? fallbackName}`),
        kind,
        name: String(resource.name || fallbackName),
        node: resource.node || null,
        vmid: resource.vmid ?? null,
        status: resource.status || 'unknown',
        cpu: Number(resource.cpu || 0),
        mem: Number(resource.mem || 0),
        maxmem: Number(resource.maxmem || 0),
        disk: Number(resource.disk || 0),
        maxdisk: Number(resource.maxdisk || 0),
        uptime: Number(resource.uptime || 0),
        template: Boolean(resource.template),
        raw: resource
      };
    });
}

export function buildServiceEdges(nodes = [], declaredEdges = []) {
  const ids = new Set(nodes.map((node) => node.id));
  return declaredEdges
    .filter((edge) => edge && ids.has(edge.from) && ids.has(edge.to))
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
      protocol: String(edge.protocol || 'tcp').toLowerCase(),
      port: edge.port ?? null,
      service: edge.service || 'service',
      policy: edge.policy || 'allow',
      reason: edge.reason || '',
      state: edge.state || 'declared'
    }));
}

export function groupByHost(nodes = []) {
  return nodes.reduce((groups, node) => {
    const key = node.kind === 'node' ? node.name : (node.node || 'unassigned');
    if (!groups[key]) groups[key] = [];
    groups[key].push(node);
    return groups;
  }, {});
}
