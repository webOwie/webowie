#!/usr/bin/env bash
set -euo pipefail

APPIMAGE=${1:?usage: smoke-appimage.sh path/to/app.AppImage}
TIMEOUT_SECONDS=${SMOKE_TIMEOUT_SECONDS:-6}

if ! command -v xvfb-run >/dev/null 2>&1; then
  echo 'xvfb-run is required for the AppImage smoke test' >&2
  exit 2
fi

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

appimage=$(realpath "$APPIMAGE")
chmod +x "$appimage"
(
  cd "$workdir"
  "$appimage" --appimage-extract >/dev/null
)

set +e
output=$(cd "$workdir/squashfs-root" && timeout "${TIMEOUT_SECONDS}s" xvfb-run -a ./AppRun 2>&1)
status=$?
set -e

if [[ $status -eq 124 ]]; then
  echo 'PASS: AppImage stayed alive through startup smoke window.'
  exit 0
fi

printf '%s\n' "$output" >&2
echo "FAIL: AppImage exited during startup smoke test with status $status" >&2
exit 1
