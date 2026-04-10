---
id: ci-cd
title: CI/CD Pipeline
sidebar_label: CI/CD Pipeline
sidebar_position: 3
---

# CI/CD Pipeline

Das Ever Works Template enthält eine vollständige CI/CD Pipeline, die mit GitHub Actions erstellt wurde. Dieser Leitfaden behandelt die Workflow-Struktur, Sicherheits-Scanning, Branch-Schutzstrategie und den Deployment-Promotionsfluss.

## Workflow-Übersicht

Die Pipeline besteht aus sechs Workflow-Dateien in `.github/workflows/`:

| Workflow | Datei | Auslöser | Zweck |
|---|---|---|---|
| CI | `ci.yml` | Push/PR zu `main`, `develop` | Lint, Typprüfung, Build |
| CodeQL | `codeql.yml` | Push/PR zu `main`, `develop` + wöchentlicher Zeitplan | Sicherheitslücken-Scanning |
| Dev Deploy | `deploy_dev.yaml` | Push zu `develop` | Deploy in Vorschau-Umgebung |
| Prod Deploy | `deploy_prod.yaml` | Push zu `main` | Deploy in Produktionsumgebung |
| Vercel Deploy | `deploy_vercel.yaml` | Von Dev/Prod-Workflows aufgerufen | Gemeinsame Vercel-Deployment-Logik |
| Disable CodeQL | `disable-default-codeql.yml` | Nur manuell | Hilfsprogramm zur CodeQL-Konfliktlösung |

### Pipeline-Fluss

```
Feature Branch --> PR to develop --> CI runs
                                     |
                                     v
                               Merge to develop --> Dev Deploy (preview)
                                     |
                                     v
                               PR to main --> CI runs
                                     |
                                     v
                               Merge to main --> Prod Deploy (production)
```

## CI-Workflow (ci.yml)

Der CI-Workflow läuft bei jedem Push und Pull-Request zu `main` und `develop`. Er validiert die Code-Qualität und stellt sicher, dass das Projekt erfolgreich erstellt wird.

### Jobs

Der Workflow enthält einen einzelnen Job `lint-and-build`, der auf `ubuntu-latest` läuft:

**Schritte**:

1. **Code auschecken** -- Klont das Repository
2. **Paketmanager erkennen** -- Erkennt automatisch pnpm, yarn oder npm aus Lockfiles
3. **pnpm einrichten** -- Installiert pnpm v9 bei Erkennung
4. **Node.js einrichten** -- Installiert Node 20 mit Paketmanager-Caching
5. **Abhängigkeiten installieren** -- Führt `pnpm install` aus
6. **Lint ausführen** -- Führt `pnpm lint` aus (setzt bei Fehlern für PRs fort)
7. **Typprüfung** -- Führt `pnpm typecheck` oder `pnpm check:types` aus
8. **Inhaltsverzeichnisse erstellen** -- Erstellt `.content/data` für den Build
9. **Projekt erstellen** -- Führt `pnpm build` mit allen erforderlichen Umgebungsvariablen aus
10. **Build-Erfolg prüfen** -- Verifiziert, dass das `.next`-Verzeichnis erstellt wurde

### Gleichzeitigkeitssteuerung

```yaml
concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true
```

Wenn ein neuer Push auf demselben Branch erfolgt, während CI noch läuft, wird der vorherige Lauf automatisch abgebrochen. Dies spart CI-Minuten und stellt sicher, dass nur der neueste Commit validiert wird.

### Umgebungsvariablen

Der CI-Workflow verwendet eine Kombination aus festverdrahteten Standardwerten und GitHub-Secrets:

| Variable | Quelle | Zweck |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Fest verdrahtet | Anwendungs-URL für den Build |
| `DATABASE_URL` | Secret oder Standard | Datenbankverbindung für den Build |
| `AUTH_SECRET` | Fest verdrahteter CI-Wert | Auth-Token-Signierung (nicht für Produktion) |
| `DATA_REPOSITORY` | Secret oder Standard | Inhalts-Repository-URL |
| `CONTENT_WARNINGS_SILENT` | Fest verdrahtet `true` | Inhaltswarnungen in CI unterdrücken |
| `CI` | Fest verdrahtet `true` | Zeigt CI-Umgebung an |
| OAuth-Secrets | GitHub-Secrets | Google, GitHub, Facebook, Twitter-Anmeldedaten |
| `RESEND_API_KEY` | GitHub-Secret | E-Mail-Service für Build-Zeit-Prüfungen |

### Berechtigungen

Der Workflow fordert minimale Berechtigungen an:

```yaml
permissions:
  contents: read
```

Nur Lesezugriff auf Repository-Inhalte wird für den CI-Job benötigt.

## CodeQL-Sicherheitsanalyse (codeql.yml)

### Was Es Tut

CodeQL führt semantische Code-Analyse durch, um Sicherheitslücken in JavaScript/TypeScript-Code zu erkennen. Es läuft:

- Bei jedem Push und PR zu `main` und `develop`
- Wöchentlich montags um 6:00 Uhr UTC (geplanter Scan)
- Bei manuellem Auslösen

### Analyse-Schritte

1. **Checkout** und **Setup** Node.js + pnpm
2. **CodeQL initialisieren** mit der Sprache `javascript-typescript`
3. **CodeQL-Umgebung einrichten** über `scripts/codeql-setup.js`
4. **Abhängigkeiten installieren** für den Analysekontext
5. **Autobuild** -- Automatische Build-Erkennung von CodeQL
6. **Mit Upload analysieren** -- Lädt Ergebnisse in den GitHub-Security-Tab hoch
7. **Fallback-Analyse** -- Falls der Upload fehlschlägt, Analyse ohne Upload

### Berechtigungen

CodeQL benötigt umfangreichere Berechtigungen für die Berichterstattung zu Sicherheitsereignissen:

```yaml
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
```

### Ergebnisse anzeigen

Nach einem erfolgreichen Lauf mit Upload:
1. Gehen Sie zu Ihrem Repository auf GitHub
2. Navigieren Sie zu **Security** > **Code scanning**
3. Überprüfen Sie Ergebnisse, filtern Sie nach Schweregrad und verwalten Sie Warnungen

### CodeQL-Konflikte lösen

Falls SARIF-Verarbeitungskonflikte mit der Standard-CodeQL-Konfiguration von GitHub auftreten, verwenden Sie den `disable-default-codeql.yml`-Workflow:

```bash
# Trigger manually from GitHub Actions tab
# This disables the default configuration that may conflict with your custom setup
```

## Deployment-Workflows

### Branch-zu-Umgebungs-Zuordnung

| Branch | Workflow | Umgebung | Domain |
|---|---|---|---|
| `develop` | `deploy_dev.yaml` | `preview` | Vorschau-URL von Vercel |
| `main` | `deploy_prod.yaml` | `production` | Produktionsdomain |

### Deploy-Anbieter-Gate

Beide Deployment-Workflows prüfen eine Repository-Variable, bevor sie fortfahren:

```yaml
jobs:
  Vercel:
    if: ${{ vars.DEPLOY_PROVIDER == 'vercel' }}
```

Setzen Sie `DEPLOY_PROVIDER=vercel` in den **Einstellungen > Variablen** Ihres Repositorys, um Vercel-Deployments zu aktivieren. Damit können Deployment-Anbieter gewechselt werden, ohne Workflow-Dateien zu ändern.

### Vercel-Deployment (deploy_vercel.yaml)

Der gemeinsame Vercel-Deployment-Workflow behandelt sowohl Preview- als auch Produktions-Deployments.

**Deployment-Strategie**: Der Workflow verwendet einen zweiphasigen Ansatz:

1. **API-Deployment** (primär): Löst Deployment über die Vercel-API für schnellere Builds aus
2. **CLI-Fallback**: Wenn der API-Aufruf fehlschlägt, wechselt der Workflow zu `vercel build` + `vercel deploy --prebuilt`

**Schritte**:

1. **Code auschecken**
2. **Paketmanager erkennen** und pnpm einrichten
3. **Vercel CLI global installieren**
4. **Vercel-Projekt verknüpfen** mit `VERCEL_TOKEN` und optionalem Team-Scope
5. **Umgebungsvariablen setzen** (DATA_REPOSITORY, GH_TOKEN, CRON_SECRET) über die Vercel CLI
6. **Vercel-Einstellungen abrufen** für die Zielumgebung
7. **API-Deployment auslösen** oder auf CLI-Build/Deploy zurückfallen
8. **Cron-Zeitplan aktualisieren** über `scripts/update-cron.ts`

### Erforderliche Secrets

Konfigurieren Sie diese in Ihren GitHub-Repository-Secrets:

| Secret | Erforderlich | Zweck |
|---|---|---|
| `VERCEL_TOKEN` | Ja | Vercel-API-Authentifizierung |
| `VERCEL_TEAM_SCOPE` | Bei Verwendung von Teams | Vercel-Team-Slug |
| `DATA_REPOSITORY` | Ja | Inhalts-Repository-Name |
| `GH_TOKEN` | Ja | GitHub-Token für Inhaltsklonen |
| `CRON_SECRET` | Empfohlen | Authentifiziert Cron-Endpunktaufrufe |
| `DATABASE_URL` | Für den Build | Datenbankverbindungszeichenkette |
| OAuth-Secrets | Bei Verwendung von OAuth | Anbieter-Anmeldedaten |

### Cron-Zeitplan-Aktualisierungen

Nach erfolgreichem Deployment führt der Workflow `scripts/update-cron.ts` aus, um Cron-Zeitpläne zu synchronisieren:

```yaml
- name: Update cron schedule
  if: success() && steps.trigger_deployment.outputs.deployment_id != ''
  run: npx tsx scripts/update-cron.ts
```

## Branch-Schutzregeln

### Empfohlene Einstellungen für `main`

| Einstellung | Wert | Zweck |
|---|---|---|
| Pull-Request erforderlich | Ja | Keine direkten Pushes in die Produktion |
| Erforderliche Reviews | 1+ | Code-Review vor dem Merge |
| Statusprüfungen erforderlich | CI (lint-and-build) | CI muss vor dem Merge bestehen |
| CodeQL erforderlich | CodeQL-Analyse | Sicherheits-Scan muss bestehen |
| Branches aktuell halten | Ja | PR muss auf aktuellem main rebasiert werden |
| Administratoren einschließen | Ja | Regeln gelten für alle |

### Empfohlene Einstellungen für `develop`

| Einstellung | Wert | Zweck |
|---|---|---|
| Pull-Request erforderlich | Optional | Direkte Pushes für schnelle Iteration erlaubt |
| Erforderliche Statusprüfungen | CI (lint-and-build) | Grundlegendes Qualitäts-Gate |
| Branches aktuell halten | Nein | Ermöglicht schnellere Iteration |

### Branch-Schutz einrichten

1. Gehen Sie zu **Einstellungen** > **Branches** des Repositorys
2. Klicken Sie auf **Branch-Schutzregel hinzufügen**
3. Geben Sie das Branch-Namensmuster ein (z.B. `main`)
4. Konfigurieren Sie die Einstellungen aus den obigen Tabellen
5. Änderungen speichern

## Promotionsfluss

Das Template folgt einem Standard-Promotionsfluss:

### Entwicklungszyklus

```
1. Create feature branch from develop
2. Implement changes
3. Open PR to develop
4. CI validates (lint, type check, build)
5. CodeQL scans for vulnerabilities
6. Code review and approval
7. Merge to develop --> automatic preview deployment
```

### Produktionsveröffentlichung

```
1. Open PR from develop to main
2. CI validates against main
3. CodeQL security scan
4. Final code review
5. Merge to main --> automatic production deployment
```

### Hotfix-Prozess

```
1. Create hotfix branch from main
2. Implement fix
3. Open PR directly to main
4. CI + CodeQL validation
5. Emergency review and merge
6. Backport to develop
```

## Anpassung

### Neue CI-Schritte hinzufügen

Um Tests oder zusätzliche Validierung hinzuzufügen, fügen Sie Schritte zum `ci.yml`-Job hinzu:

```yaml
- name: Run unit tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test

- name: Run E2E tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test:e2e
```

### Deployment-Benachrichtigungen hinzufügen

Fügen Sie am Ende des Deployment-Workflows einen Benachrichtigungsschritt hinzu:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text": "Deployed to ${{ inputs.environment }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Umgebungsspezifische Variablen

Verwenden Sie GitHub-**Umgebungen**, um Secrets auf bestimmte Deployment-Ziele zu beschränken:

1. Gehen Sie zu **Einstellungen** > **Umgebungen**
2. Erstellen Sie `production`- und `preview`-Umgebungen
3. Fügen Sie umgebungsspezifische Secrets hinzu
4. Referenzieren Sie diese in Workflows mit der `environment:`-Konfiguration
