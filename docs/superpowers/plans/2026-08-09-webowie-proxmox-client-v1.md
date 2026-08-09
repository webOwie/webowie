# webOwie Proxmox Client V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Tauri 2 AppImage that securely reads Proxmox cluster inventory and presents an interactive infrastructure/SBOM explorer.

**Architecture:** Static ES-module frontend plus Rust/Tauri backend. All V1 Proxmox operations are read-only. Shared graph and SBOM models are deterministic and tested independently from the UI.

**Tech Stack:** Tauri 2, Rust, reqwest, serde, vanilla HTML/CSS/JavaScript, Node built-in test runner, GitHub Actions.

## Global Constraints

- No persisted Proxmox token secret in frontend storage or repository files.
- System TLS trust is the default; insecure TLS requires explicit bootstrap opt-in.
- No infrastructure write operation in V1.
- AppImage target: Linux x86_64 built on Ubuntu 22.04.
- Infrastructure graph must never invent edges not present in discovered/blueprint data.

---

### Task 1: Deterministic topology model

**Status:** Implemented locally and pushed. JavaScript tests pass.

- [x] Write failing tests for resource normalization and undeclared-edge rejection.
- [x] Verify RED before implementation.
- [x] Implement topology functions.
- [x] Verify GREEN.

### Task 2: SBOM responsibility model

**Status:** Implemented locally and pushed. JavaScript tests pass.

- [x] Write failing tests for required/optional/unknown counts and explanations.
- [x] Verify RED before implementation.
- [x] Implement SBOM helpers.
- [x] Verify GREEN.

### Task 3: Tauri Proxmox read client

**Status:** Implemented and pushed; Rust tests are executed by CI because the local container has no Rust toolchain.

- [x] Add Rust unit tests for base URL normalization and token header creation.
- [x] Implement API client using `/api2/json` and `PVEAPIToken` authorization.
- [x] Redact token secrets from returned API errors.
- [x] Register only read-only commands.

### Task 4: Desktop UI and Infrastructure Map

**Status:** Implemented and pushed.

- [x] Build connection panel and status banner.
- [x] Render resource cards and SVG relationship graph.
- [x] Add server detail drawer with Overview/Network/Security/SBOM tabs.
- [x] Add explicit demo mode.

### Task 5: Tauri packaging and CI

**Status:** Workflow pushed; AppImage build pending CI verification.

- [x] Configure static `frontendDist` and `app.withGlobalTauri=true`.
- [x] Configure AppImage metadata/icons.
- [x] Add Ubuntu 22.04 build dependencies and Rust stable setup.
- [x] Run JavaScript tests locally.
- [ ] Verify Cargo tests in GitHub Actions.
- [ ] Verify AppImage build in GitHub Actions.
- [ ] Verify downloadable AppImage artifact.
