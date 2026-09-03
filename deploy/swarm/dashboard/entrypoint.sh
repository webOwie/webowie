#!/bin/sh
set -eu

cp /templates/index.html.template /www/index.html
sed -i \
  -e "s|\${DEPLOY_ENV}|${DEPLOY_ENV}|g" \
  -e "s|\${GRAFANA_HOST}|${GRAFANA_HOST}|g" \
  -e "s|\${GIT_SHA}|${GIT_SHA}|g" \
  -e "s|\${IMAGE_TAG}|${IMAGE_TAG}|g" \
  /www/index.html

printf 'ok\n' > /www/healthz
exec httpd -f -p 8080 -h /www
