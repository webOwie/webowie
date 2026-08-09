# webOwie Proxmox Client

Standalone Linux control-plane client for Proxmox VE, packaged as an AppImage.

## Verified V0.1 build

The first AppImage has been built successfully on a clean Ubuntu 22.04 GitHub Actions runner. The verification pipeline passed JavaScript tests, Rust tests, the Tauri release build and AppImage artifact upload.

**Artifact:** `webOwie-Proxmox-Client-AppImage`  
**Built file:** `webOwie Proxmox Client_0.1.0_amd64.AppImage`  
**SHA-256:** `b658aedcb4176f31b95a32e5a1fabe61a1c627d66cee68005e7d782f15c2d1fe`

To download from GitHub: open **Actions → Build AppImage → successful run → Artifacts → webOwie-Proxmox-Client-AppImage**.

## V0.1 scope

This first executable slice is intentionally **read/analyze-first**:

- Proxmox API-token connection over HTTPS
- explicit bootstrap-only self-signed TLS option
- cluster resource inventory
- deterministic infrastructure map
- click-through VM/LXC inspector
- network/security metadata view
- SBOM component inspector with purpose, responsibility, ownership, dependencies and removal impact
- demo topology for testing without a live cluster

No write command is registered in the Rust backend yet. Infrastructure mutations will only be enabled after the Desired-State policy compiler, simulation and rollback gates are implemented.

## Proxmox token

Create a Proxmox API token with the least privileges needed for read-only inventory during initial testing. Enter its token ID and secret in the connection dialog. The V0.1 UI does not persist the token secret.

## Bootstrap TLS

Fresh Proxmox installations commonly start with a self-signed certificate. The connection dialog includes an explicit temporary switch to accept it during bootstrap. Replace this state with the planned DNS-01/ACME certificate workflow and disable the switch afterward.

## Local source tests

```bash
npm test
```

## Build the AppImage

Linux build prerequisites follow the Tauri 2 AppImage guidance. On a supported Debian/Ubuntu build host:

```bash
npm install
npm run tauri build -- --bundles appimage
```

The bundle is written under:

```text
src-tauri/target/release/bundle/appimage/
```

## GitHub Actions

`.github/workflows/build-appimage.yml` runs JavaScript tests, Rust tests and the Tauri AppImage build on Ubuntu 22.04. Every successful workflow stores the AppImage as an Actions artifact. Pushing a tag such as `app-v0.1.0` also publishes the AppImage as a GitHub Release asset.

## Security architecture

The permanent write path is intentionally separate from the LLM/UI layer:

```text
Intent
  -> Desired State
  -> Static validation
  -> Simulation
  -> Explicit apply
  -> Connectivity/security verification
  -> Commit or rollback
```

The client must never infer that a listening port should automatically become reachable.
