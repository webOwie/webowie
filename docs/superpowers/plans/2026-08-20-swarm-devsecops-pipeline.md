# webOwie Swarm DevSecOps Pipeline Implementation Plan

**Date:** 2026-08-20  
**Target:** resource-minimized Docker Swarm control plane with measurable CI/CD, security gates, rollback and BI observability.

## Delivery contract

Git is the source of truth. Every accepted change follows:

`Plan -> Develop -> Test -> Security -> Package -> Deploy -> Verify -> Observe -> Learn`

The production stack never builds source code. CI produces immutable OCI artifacts first; Swarm consumes registry images only.

## Runtime architecture

- Docker Swarm for orchestration
- Traefik for ingress and ACME TLS
- restricted Docker socket proxy on an encrypted internal control overlay
- custom `webowie-ops` BusyBox image as the first owned deployment artifact
- Prometheus with seven-day local retention
- Node Exporter in global mode
- Grafana with provisioned datasource and DevOps/SRE dashboard
- Docker Secrets for Grafana administrative credentials
- resource limits/reservations on every long-running control-plane service

## Environments

### Pull request

1. JavaScript tests
2. Rust tests
3. shell syntax validation
4. dashboard JSON parse validation
5. rendered Swarm stack validation
6. Trivy source/dependency/secret/IaC report
7. critical secret/misconfiguration gate
8. OCI image build
9. runtime health/UI/metrics smoke test
10. critical image vulnerability gate

No deployment occurs from a pull request.

### Staging

Push to `main` after all quality/security/package gates:

1. build SHA-tagged `webowie-ops` image
2. attach SBOM and build provenance
3. push to GHCR
4. deploy through a dedicated `swarm-staging-manager` runner
5. verify service convergence
6. automatic service rollback on failed rolling update

### Production

Production is triggered by `swarm-v*` release tag or explicit production workflow dispatch and uses a separate `swarm-production-manager` runner and GitHub Environment.

## Reliability model

- application/control stateless services use rolling start-first updates where applicable
- `failure_action: rollback` is the default update failure behavior
- explicit rollback helper exists for operational recovery
- edge and monitoring tasks use node labels
- stateful Prometheus, Grafana and ACME data remain on local volumes for the initial resource-minimized deployment
- shared/block storage is required before claiming automatic stateful failover across managers

## Security model

- public exposure only through Traefik on 80/443
- Docker API proxy is isolated on an internal encrypted overlay
- Docker socket is mounted read-only only into the proxy service
- proxy write requests are disabled
- secrets stay outside Git
- source/IaC and built image are scanned before promotion
- own dashboard container runs as UID/GID 65534 on BusyBox musl
- dependencies and infrastructure image versions are pinned to a tested release baseline

## BI / feedback model

The initial Grafana dashboard exposes:

- node availability
- CPU usage
- memory usage
- root filesystem usage
- current release SHA and image tag
- seconds since deployment
- deployment timestamp changes over 24 hours
- Prometheus target health

Next metrics after the first live deployment:

- Deployment Frequency
- Lead Time for Changes
- Change Failure Rate
- MTTR
- SLI/SLO and Error Budget
- service-level business KPIs

## Acceptance gates

The branch may only be considered merge-ready when the latest PR head has:

- `quality` green
- `security` green
- `package` green, including runtime smoke and image scan
- existing AppImage checks green or explicitly shown unrelated to the Swarm change

Production may only be considered operational after:

- production Swarm manager exists
- required Swarm/firewall ports are open
- DNS for `OPS_HOST` and `GRAFANA_HOST` resolves to ingress
- `production` GitHub Environment variables/secrets are configured
- `swarm-production-manager` runner is online
- production deploy job converges all stack services
- HTTPS endpoints and Grafana metrics are verified after deployment
