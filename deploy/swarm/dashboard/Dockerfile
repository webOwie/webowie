FROM nginx:1.27-alpine

ENV NGINX_ENVSUBST_OUTPUT_DIR=/usr/share/nginx/html

COPY index.html.template /etc/nginx/templates/index.html.template
COPY metrics.prometheus.template /etc/nginx/templates/metrics.prometheus.template
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
