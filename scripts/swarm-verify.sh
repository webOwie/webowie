#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/deploy/swarm/.env}"
ACTION="${2:-verify}"
SERVICE_FILTER="${3:-}"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ "$ACTION" == "--rollback" ]]; then
  mapfile -t services < <(docker stack services "$STACK_NAME" --format '{{.Name}}')
  for service in "${services[@]}"; do
    if [[ -n "$SERVICE_FILTER" && "$service" != "$SERVICE_FILTER" ]]; then
      continue
    fi
    echo "Rolling back $service"
    docker service update --rollback "$service" >/dev/null || true
  done
  exit 0
fi

mapfile -t rows < <(docker stack services "$STACK_NAME" --format '{{.Name}}|{{.Replicas}}')
[[ ${#rows[@]} -gt 0 ]] || { echo "No services found for stack $STACK_NAME" >&2; exit 1; }

failed=0
for row in "${rows[@]}"; do
  service="${row%%|*}"
  replicas="${row#*|}"
  running="${replicas%%/*}"
  desired="${replicas##*/}"
  printf '%-48s %s\n' "$service" "$replicas"
  if [[ "$running" != "$desired" ]]; then
    failed=1
    docker service ps "$service" --no-trunc --format 'table {{.Name}}\t{{.CurrentState}}\t{{.Error}}' || true
  fi
done

if (( failed )); then
  echo "One or more Swarm services have not converged" >&2
  exit 1
fi

echo "All services converged for stack $STACK_NAME"
