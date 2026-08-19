FROM busybox:1.37.0-musl

RUN mkdir -p /www/cgi-bin /templates \
    && chown -R 65534:65534 /www /templates

COPY --chown=65534:65534 index.html.template /templates/index.html.template
COPY --chown=65534:65534 entrypoint.sh /entrypoint.sh
COPY --chown=65534:65534 metrics.sh /www/cgi-bin/metrics

RUN chmod 0555 /entrypoint.sh /www/cgi-bin/metrics

USER 65534:65534
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/entrypoint.sh"]
