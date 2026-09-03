# webOwie Docker Swarm Control Plane

Ressourcenschlanke Produktionsbasis für webOwie mit GitHub Actions, GHCR, Traefik, Prometheus und Grafana.

## Architektur

```text
Git / PR
  -> quality tests
  -> Trivy DevSecOps gates
  -> OCI runtime smoke test
  -> critical image scan
  -> BuildKit image + SBOM + provenance
  -> GHCR
  -> self-hosted Swarm manager runner
  -> docker stack deploy
  -> rolling update / automatic rollback
  -> Prometheus
  -> Grafana BI/SRE dashboard
```

Swarm-Dienste bauen keine Images. CI baut das eigene `webowie-ops` Image und veröffentlicht es zuerst in GHCR. `docker stack deploy` verteilt anschließend ausschließlich Registry-Images.

## Ressourcenprofil

Basiskonfiguration pro Swarm, ohne Anwendungs-Workloads:

- socket-proxy: 64 MiB Limit
- Traefik: 192 MiB Limit
- 2 x BusyBox ops-dashboard: 64 MiB pro Task
- Prometheus: 512 MiB Limit, 7 Tage Retention
- Grafana: 384 MiB Limit
- Node Exporter: 96 MiB pro Node

Die tatsächliche Nutzung liegt normalerweise unter den Limits. Die Limits verhindern, dass Observability selbst zum Ausfallgrund wird.

## 1. Swarm initialisieren

Auf dem ersten Manager:

```bash
chmod +x scripts/swarm-*.sh
scripts/swarm-bootstrap.sh 10.0.0.10
```

Zwischen Swarm-Nodes müssen erreichbar sein:

- `2377/tcp` Swarm control plane
- `7946/tcp` und `7946/udp` node discovery
- `4789/udp` overlay data plane

Für öffentlichen Ingress:

- `80/tcp`
- `443/tcp`

Der Bootstrap gibt Join-Tokens standardmäßig nicht aus. Bei bewusstem Bedarf:

```bash
SHOW_JOIN_TOKEN=true scripts/swarm-bootstrap.sh 10.0.0.10
```

## 2. DNS

Mindestens zwei DNS-Namen auf die öffentliche Swarm-/Ingress-Adresse zeigen lassen:

```text
ops.example.com
grafana.example.com
```

Beispielwerte im Environment:

```text
OPS_HOST=ops.example.com
GRAFANA_HOST=grafana.example.com
ACME_EMAIL=admin@example.com
```

Traefik verwendet ACME HTTP-01 und leitet HTTP automatisch auf HTTPS um.

## 3. GitHub Environments

Erstelle die Environments `staging` und `production`.

Variables:

```text
OPS_HOST
GRAFANA_HOST
GRAFANA_ADMIN_USER
ACME_EMAIL
```

Optional können die bereits gepinnten Baseline-Images überschrieben werden:

```text
SOCKET_PROXY_IMAGE
TRAEFIK_IMAGE
PROMETHEUS_IMAGE
GRAFANA_IMAGE
NODE_EXPORTER_IMAGE
```

Secret:

```text
GRAFANA_ADMIN_PASSWORD
```

Das Kennwort wird beim ersten Deployment in ein externes Docker-Swarm-Secret übertragen und nicht in Git geschrieben.

## 4. Self-hosted Runner

Der Deployment-Runner muss auf einem Swarm-Manager laufen, Docker verwenden dürfen und eine aktuelle GitHub-Actions-Runner-Version besitzen.

Staging Runner Labels:

```text
self-hosted
linux
x64
swarm-staging-manager
```

Production Runner Labels:

```text
self-hosted
linux
x64
swarm-production-manager
```

Staging und Production sollten auf getrennten Swarms laufen. Beide Stacks enthalten einen Ingress auf 80/443 und gehören deshalb nicht parallel auf denselben Cluster.

## 5. Manuelles Preflight

```bash
cp deploy/swarm/env.example deploy/swarm/.env
$EDITOR deploy/swarm/.env
export GRAFANA_ADMIN_PASSWORD='...'
scripts/swarm-preflight.sh deploy/swarm/.env
```

## 6. Manuelles Deployment

```bash
scripts/swarm-deploy.sh deploy/swarm/.env
```

Status:

```bash
docker stack services webowie
docker stack ps webowie
```

## 7. Rollback

Alle Services, soweit eine vorherige Service-Spezifikation vorhanden ist:

```bash
scripts/swarm-verify.sh deploy/swarm/.env --rollback
```

Ein einzelner Service:

```bash
scripts/swarm-verify.sh deploy/swarm/.env --rollback webowie_ops-dashboard
```

Service-Updates sind zusätzlich mit `failure_action: rollback` konfiguriert.

## 8. CI/CD-Verhalten

Pull Request:

- JavaScript Tests
- Rust Tests
- Shell Syntax
- Grafana JSON Validation
- Swarm Stack Render Validation
- Trivy Vulnerability/Secret/Misconfiguration Report
- Blocking Gate für kritische Secrets/IaC-Fehler
- Build des minimalen BusyBox-OCI-Images
- Runtime Smoke Test für `/`, `/healthz` und `/cgi-bin/metrics`
- Blocking Gate für kritische Image-Vulnerabilities

Push auf `main`:

- alle PR-Gates
- Build des SHA-getaggten `webowie-ops` OCI Images
- SBOM + Build Provenance
- Push nach GHCR
- Deployment nach Staging

Tag `swarm-v*` oder manueller Production-Dispatch:

- alle Gates
- unveränderliches SHA-getaggtes Image
- Production Environment
- Production Swarm Runner
- Rolling Deployment
- Konvergenzprüfung

## 9. Observability / BI

Grafana wird automatisch provisioniert mit:

- Prometheus Datasource
- `webOwie DevOps & Swarm BI` Dashboard
- Swarm Nodes Up
- CPU pro Node
- RAM pro Node
- Root Filesystem Usage
- Sekunden seit letztem Deployment
- Deployment-Änderungen innerhalb 24 Stunden
- aktuelle Git SHA / Image Tag

Die nächsten BI-Erweiterungen sind Change Failure Rate, MTTR, Lead Time for Changes, SLO/Error Budget und Business-KPIs aus den webOwie-Diensten.

## 10. Persistenz

Prometheus-, Grafana- und ACME-Daten liegen aktuell in lokalen Docker Volumes auf den gelabelten Manager-Nodes. Für einen Single-Node- oder festen Manager-Cluster ist das bewusst einfach und ressourcenschlank. Vor automatischer Stateful-Failover-Migration auf andere Nodes muss ein Shared-/Block-Storage-Konzept ergänzt werden.
