# webOwie Proxmox Client V1 Design

## Goal

Ship a standalone Linux AppImage that connects securely to Proxmox VE, inventories nodes and guests, visualizes infrastructure relationships, and exposes a clickable server inspector with SBOM/responsibility information. V1 is read/analyze-first; write operations are designed behind plan/simulate/apply gates and are not enabled until their deterministic policy compiler is complete.

## Architecture

- **Desktop shell:** Tauri 2, packaged as AppImage.
- **Frontend:** dependency-light static HTML/CSS/ES modules rendered in the Tauri webview.
- **Backend:** Rust commands using the Proxmox REST API through `pveproxy`.
- **Authentication:** Proxmox API token supplied per session. Token secrets are never written to project files or browser localStorage.
- **TLS:** system trust by default. An explicit bootstrap-only switch can temporarily accept the initial self-signed certificate; the UI labels this unsafe and the later ACME manager replaces it with managed DNS-01 certificates.
- **Safety boundary:** V1 commands are read-only. Future writes must flow through Desired State -> validation -> simulation -> explicit apply -> verification -> rollback.

## V1 Capabilities

1. Connection profile form for Proxmox URL and API token.
2. Connection test against the Proxmox API.
3. Cluster resource inventory (nodes, QEMU VMs, LXCs, storage where returned).
4. Infrastructure Map built deterministically from discovered resources and local blueprint metadata.
5. Clickable server inspector with overview, network, services, security and SBOM tabs.
6. SBOM component metadata includes purpose, responsibility, ownership, dependencies, ports and removal impact.
7. Desired/Actual/Drift model foundations in shared frontend graph structures.
8. Demo mode so UI/graph/SBOM can be tested without a live cluster.
9. GitHub Actions pipeline builds an x86_64 AppImage on Ubuntu 22.04.

## Deferred Write Modules

The following modules are represented in navigation and data contracts but remain gated until deterministic apply code is implemented and tested: Server Factory, Network Fabric writes, firewall compiler apply, DNS provider changes, ACME provisioning, cluster/storage/upgrade mutations.

## Data Model

### Infrastructure node

`id`, `kind`, `name`, `node`, `status`, `vmid`, `network`, `vlan`, `ip`, `services`, `sbom`, `securityScore`.

### Connection edge

`from`, `to`, `protocol`, `port`, `service`, `policy`, `reason`, `state`.

### SBOM component

`name`, `version`, `category`, `purpose`, `responsibility`, `required`, `owner`, `service`, `ports`, `dependencies`, `removalImpact`, `securityRelevance`.

## Error Handling

- Proxmox API errors are returned to the UI as sanitized messages without token secrets.
- HTTP status codes are preserved where useful.
- Invalid URL and malformed token input fail before API calls.
- Demo data is never silently substituted after a failed real connection.

## Testing

- Node built-in tests cover topology normalization, relationship generation and SBOM responsibility formatting without third-party dependencies.
- Rust unit tests cover URL normalization and token header construction in CI.
- GitHub Actions runs JavaScript tests, Rust tests and Tauri AppImage build.

## Success Criteria

A downloaded AppImage launches on a compatible x86_64 Linux desktop, can connect to a Proxmox VE node with an API token, display its resources, render a deterministic infrastructure map, and show an SBOM/responsibility inspector for selected servers or blueprint-backed workloads.
