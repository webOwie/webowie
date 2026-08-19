#!/bin/sh
set -eu

printf 'Content-Type: text/plain; version=0.0.4\r\n\r\n'
printf '# HELP webowie_deploy_timestamp_seconds Unix timestamp of the current deployment.\n'
printf '# TYPE webowie_deploy_timestamp_seconds gauge\n'
printf 'webowie_deploy_timestamp_seconds{environment="%s"} %s\n' "$DEPLOY_ENV" "$DEPLOY_EPOCH"
printf '# HELP webowie_build_info Current webOwie ops build metadata.\n'
printf '# TYPE webowie_build_info gauge\n'
printf 'webowie_build_info{environment="%s",git_sha="%s",image_tag="%s"} 1\n' "$DEPLOY_ENV" "$GIT_SHA" "$IMAGE_TAG"
