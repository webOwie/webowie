#!/usr/bin/env bash
set -Eeuo pipefail

ADVERTISE_ADDR="${1:-}"
[[ -n "$ADVERTISE_ADDR" ]] || { echo "Usage: $0 <manager-advertise-ip>" >&2; exit 2; }
command -v docker >/dev/null || { echo "docker CLI not found" >&2; exit 1; }

state="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || true)"
if [[ "$state" != "active" ]]; then
  docker swarm init --advertise-addr "$ADVERTISE_ADDR"
else
  echo "Swarm already active; leaving membership unchanged"
fi

control="$(docker info --format '{{.Swarm.ControlAvailable}}')"
[[ "$control" == "true" ]] || { echo "This node is not a Swarm manager" >&2; exit 1; }

node_id="$(docker info --format '{{.Swarm.NodeID}}')"
docker node update \
  --label-add webowie.edge=true \
  --label-add webowie.monitoring=true \
  "$node_id" >/dev/null

echo
echo "Manager ready: $node_id"
echo "Required inter-node firewall ports: 2377/tcp, 7946/tcp+udp, 4789/udp"
echo "Public ingress ports: 80/tcp, 443/tcp"
echo

if [[ "${SHOW_JOIN_TOKEN:-false}" == "true" ]]; then
  echo "Worker join command (sensitive):"
  token="$(docker swarm join-token worker -q)"
  printf 'docker swarm join --token %s %s:2377\n' "$token" "$ADVERTISE_ADDR"
else
  echo "Worker join token not printed. Run 'docker swarm join-token worker' interactively when needed."
fi
