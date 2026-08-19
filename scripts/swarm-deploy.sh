#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/deploy/swarm/.env}"
STACK_DIR="$ROOT_DIR/deploy/swarm"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

"$ROOT_DIR/scripts/swarm-preflight.sh" "$ENV_FILE"

cd "$STACK_DIR"

echo "Deploying stack '$STACK_NAME' with image tag '$IMAGE_TAG'"
docker stack deploy \
  --compose-file stack.yml \
  --with-registry-auth \
  --resolve-image always \
  --prune \
  "$STACK_NAME"

"$ROOT_DIR/scripts/swarm-verify.sh" "$ENV_FILE"

echo "Deployment verified: $STACK_NAME / ${DEPLOY_ENV:-unknown} / $GIT_SHA"
