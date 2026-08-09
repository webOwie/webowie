# AppImage CI Verification

This document exists to exercise the pull-request CI path for the first webOwie Proxmox Client AppImage.

The verification run must pass, in order:

1. JavaScript topology/SBOM tests.
2. Rust unit tests for Proxmox URL/token handling.
3. Tauri 2 Linux build.
4. AppImage packaging.
5. AppImage artifact upload.

No infrastructure write capability is enabled in this release candidate.
