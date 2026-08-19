#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/deploy/swarm/.env}"
STACK_DIR="$ROOT_DIR/deploy/swarm"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || fail "docker CLI not found"
[[ -f "$ENV_FILE" ]] || fail "environment file not found: $ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required=(STACK_NAME OPS_HOST GRAFANA_HOST GRAFANA_ADMIN_USER WEBOWIE_OPS_IMAGE IMAGE_TAG GIT_SHA SOCKET_PROXY_IMAGE TRAEFIK_IMAGE PROMETHEUS_IMAGE GRAFANA_IMAGE NODE_EXPORTER_IMAGE)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || fail "required variable $name is empty"
done

swarm_state="$(docker info --format '{{.Swarm.LocalNodeState}}')"
control="$(docker info --format '{{.Swarm.ControlAvailable}}')"
[[ "$swarm_state" == "active" ]] || fail "Docker Swarm is not active; initialize or join the node first"
[[ "$control" == "true" ]] || fail "deployment must run on a Swarm manager"

node_id="$(docker info --format '{{.Swarm.NodeID}}')"
if ! docker node inspect "$node_id" --format '{{ index .Spec.Labels "webowie.monitoring" }}' 2>/dev/null | grep -qx true; then
  echo "Labeling current manager as the monitoring node"
  docker node update --label-add webowie.monitoring=true "$node_id" >/dev/null
fi

if ! docker secret inspect grafana_admin_password >/dev/null 2>&1; then
  [[ -n "${GRAFANA_ADMIN_PASSWORD:-}" ]] || fail "Swarm secret grafana_admin_password is missing and GRAFANA_ADMIN_PASSWORD is not set"
  printf '%s' "$GRAFANA_ADMIN_PASSWORD" | docker secret create grafana_admin_password - >/dev/null
  echo "Created external Swarm secret: grafana_admin_password"
fi

(
  cd "$STACK_DIR"
  docker stack config --compose-file stack.yml >/dev/null
)

echo "Swarm preflight OK: stack=$STACK_NAME node=$node_id environment=${DEPLOY_ENV:-unknown}"
