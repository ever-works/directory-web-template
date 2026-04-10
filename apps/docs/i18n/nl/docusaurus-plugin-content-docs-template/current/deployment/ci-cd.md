---
id: ci-cd
title: CI/CD Pipeline
sidebar_label: CI/CD Pipeline
sidebar_position: 3
---

# CI/CD Pipeline

Het Ever Works Template bevat een complete CI/CD-pipeline gebouwd met GitHub Actions. Deze gids behandelt de workflowstructuur, beveiligingsscanning, branch-beveiligingsstrategie en de implementatiepromotie-flow.

## Workflowoverzicht

De pipeline bestaat uit zes workflowbestanden in `.github/workflows/`:

| Workflow | Bestand | Trigger | Doel |
|---|---|---|---|
| CI | `ci.yml` | Push/PR naar `main`, `develop` | Lint, typecontrole, build |
| CodeQL | `codeql.yml` | Push/PR naar `main`, `develop` + wekelijks schema | Beveiligingskwetsbaarheidsscanning |
| Dev Deploy | `deploy_dev.yaml` | Push naar `develop` | Implementeren in voorbeeldomgeving |
| Prod Deploy | `deploy_prod.yaml` | Push naar `main` | Implementeren in productieomgeving |
| Vercel Deploy | `deploy_vercel.yaml` | Aangeroepen door dev/prod-workflows | Gedeelde Vercel-implementatielogica |
| Disable CodeQL | `disable-default-codeql.yml` | Alleen handmatig | Hulpprogramma om CodeQL-conflicten op te lossen |

### Pipeline-flow

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

## CI-workflow (ci.yml)

De CI-workflow wordt uitgevoerd bij elke push en pull request naar `main` en `develop`. Het valideert de codekwaliteit en zorgt ervoor dat het project succesvol wordt gebouwd.

### Taken

De workflow bevat één taak `lint-and-build` die wordt uitgevoerd op `ubuntu-latest`:

**Stappen**:

1. **Code ophalen** -- Kloont de repository
2. **Pakketbeheerder detecteren** -- Detecteert automatisch pnpm, yarn of npm uit lockbestanden
3. **pnpm instellen** -- Installeert pnpm v9 indien gedetecteerd
4. **Node.js instellen** -- Installeert Node 20 met pakketbeheerder-caching
5. **Afhankelijkheden installeren** -- Voert `pnpm install` uit
6. **Lint uitvoeren** -- Voert `pnpm lint` uit (gaat door bij fouten voor PR's)
7. **Typecontrole** -- Voert `pnpm typecheck` of `pnpm check:types` uit
8. **Inhoudsmappen aanmaken** -- Maakt `.content/data` aan voor de build
9. **Project bouwen** -- Voert `pnpm build` uit met alle vereiste omgevingsvariabelen
10. **Bouwsucces controleren** -- Verifieert dat de `.next`-map is aangemaakt

### Gelijktijdigheidscontrole

```yaml
concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true
```

Als er een nieuwe push plaatsvindt op dezelfde branch terwijl CI nog loopt, wordt de vorige run automatisch geannuleerd. Dit bespaart CI-minuten en zorgt ervoor dat alleen de nieuwste commit wordt gevalideerd.

### Omgevingsvariabelen

De CI-workflow gebruikt een combinatie van hardgecodeerde standaardwaarden en GitHub-secrets:

| Variabele | Bron | Doel |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Hardgecodeerd | Applicatie-URL voor build |
| `DATABASE_URL` | Secret of standaard | Databaseverbinding voor build |
| `AUTH_SECRET` | Hardgecodeerde CI-waarde | Auth-token ondertekening (niet voor productie) |
| `DATA_REPOSITORY` | Secret of standaard | URL van inhoudsrepository |
| `CONTENT_WARNINGS_SILENT` | Hardgecodeerd `true` | Inhoudswaarschuwingen in CI onderdrukken |
| `CI` | Hardgecodeerd `true` | Geeft CI-omgeving aan |
| OAuth-secrets | GitHub-secrets | Google, GitHub, Facebook, Twitter-referenties |
| `RESEND_API_KEY` | GitHub-secret | E-mailservice voor build-tijdcontroles |

### Machtigingen

De workflow vraagt minimale machtigingen aan:

```yaml
permissions:
  contents: read
```

Alleen leestoegang tot repository-inhoud is nodig voor de CI-taak.

## CodeQL-beveiligingsanalyse (codeql.yml)

### Wat Het Doet

CodeQL voert semantische codeanalyse uit om beveiligingskwetsbaarheden in JavaScript/TypeScript-code te detecteren. Het wordt uitgevoerd:

- Bij elke push en PR naar `main` en `develop`
- Wekelijks op maandag om 6:00 UTC (geplande scan)
- Bij handmatige activering

### Analysestappen

1. **Ophalen** en **instellen** Node.js + pnpm
2. **CodeQL initialiseren** met de taal `javascript-typescript`
3. **CodeQL-omgeving instellen** via `scripts/codeql-setup.js`
4. **Afhankelijkheden installeren** voor analysecontext
5. **Autobuild** -- Automatische bouwdetectie van CodeQL
6. **Analyseren met upload** -- Uploadt resultaten naar het GitHub-beveiligingstabblad
7. **Fallback-analyse** -- Als de upload mislukt, analyse uitvoeren zonder upload

### Machtigingen

CodeQL vereist bredere machtigingen voor het rapporteren van beveiligingsgebeurtenissen:

```yaml
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
```

### Resultaten bekijken

Na een succesvolle run met upload:
1. Ga naar uw repository op GitHub
2. Navigeer naar **Security** > **Code scanning**
3. Bekijk bevindingen, filter op ernst en beheer waarschuwingen

### CodeQL-conflicten oplossen

Als u SARIF-verwerkingsconflicten tegenkomt met de standaard CodeQL-configuratie van GitHub, gebruik dan de `disable-default-codeql.yml`-workflow:

```bash
# Trigger manually from GitHub Actions tab
# This disables the default configuration that may conflict with your custom setup
```

## Implementatieworkflows

### Branch-naar-omgeving-mapping

| Branch | Workflow | Omgeving | Domein |
|---|---|---|---|
| `develop` | `deploy_dev.yaml` | `preview` | Voorbeeld-URL van Vercel |
| `main` | `deploy_prod.yaml` | `production` | Productiedomein |

### Implementatieprovider-gate

Beide implementatieworkflows controleren een repositoryvariabele voordat ze doorgaan:

```yaml
jobs:
  Vercel:
    if: ${{ vars.DEPLOY_PROVIDER == 'vercel' }}
```

Stel `DEPLOY_PROVIDER=vercel` in bij de **Instellingen > Variabelen** van uw repository om Vercel-implementaties in te schakelen. Dit maakt het mogelijk om van implementatieprovider te wisselen zonder workflowbestanden te wijzigen.

### Vercel-implementatie (deploy_vercel.yaml)

De gedeelde Vercel-implementatieworkflow verwerkt zowel voorbeeld- als productie-implementaties.

**Implementatiestrategie**: De workflow gebruikt een tweefasige aanpak:

1. **API-implementatie** (primair): Triggert implementatie via de Vercel-API voor snellere builds
2. **CLI-fallback**: Als de API-aanroep mislukt, terugvallen op `vercel build` + `vercel deploy --prebuilt`

**Stappen**:

1. **Code ophalen**
2. **Pakketbeheerder detecteren** en pnpm instellen
3. **Vercel CLI globaal installeren**
4. **Vercel-project koppelen** met `VERCEL_TOKEN` en optionele teamscope
5. **Omgevingsvariabelen instellen** (DATA_REPOSITORY, GH_TOKEN, CRON_SECRET) via Vercel CLI
6. **Vercel-instellingen ophalen** voor de doelomgeving
7. **API-implementatie triggeren** of terugvallen op CLI-build/deploy
8. **Cron-schema bijwerken** via `scripts/update-cron.ts`

### Vereiste secrets

Configureer deze in uw GitHub-repository-secrets:

| Secret | Vereist | Doel |
|---|---|---|
| `VERCEL_TOKEN` | Ja | Vercel API-authenticatie |
| `VERCEL_TEAM_SCOPE` | Bij gebruik van teams | Vercel-team-slug |
| `DATA_REPOSITORY` | Ja | Naam van inhoudsrepository |
| `GH_TOKEN` | Ja | GitHub-token voor het klonen van inhoud |
| `CRON_SECRET` | Aanbevolen | Authenticeert cron-eindpuntaanroepen |
| `DATABASE_URL` | Voor de build | Databaseverbindingsreeks |
| OAuth-secrets | Bij gebruik van OAuth | Providerreferenties |

### Updates van cron-schema

Na succesvolle implementatie voert de workflow `scripts/update-cron.ts` uit om cron-schema's te synchroniseren:

```yaml
- name: Update cron schedule
  if: success() && steps.trigger_deployment.outputs.deployment_id != ''
  run: npx tsx scripts/update-cron.ts
```

## Branch-beveiligingsregels

### Aanbevolen instellingen voor `main`

| Instelling | Waarde | Doel |
|---|---|---|
| Pull request vereist | Ja | Geen directe pushes naar productie |
| Vereiste beoordelingen | 1+ | Coderecensie voor samenvoegen |
| Statuscontroles vereist | CI (lint-and-build) | CI moet slagen voor samenvoegen |
| CodeQL vereist | CodeQL-analyse | Beveiligingsscan moet slagen |
| Branches up-to-date houden | Ja | PR moet worden gerebased op nieuwste main |
| Beheerders opnemen | Ja | Regels gelden voor iedereen |

### Aanbevolen instellingen voor `develop`

| Instelling | Waarde | Doel |
|---|---|---|
| Pull request vereist | Optioneel | Directe pushes toegestaan voor snelle iteratie |
| Vereiste statuscontroles | CI (lint-and-build) | Basis kwaliteitspoort |
| Branches up-to-date houden | Nee | Maakt snellere iteratie mogelijk |

### Branch-beveiliging instellen

1. Ga naar **Instellingen** > **Branches** van de repository
2. Klik op **Branch-beveiligingsregel toevoegen**
3. Voer het branch-naampatroon in (bijv. `main`)
4. Configureer de instellingen uit de bovenstaande tabellen
5. Wijzigingen opslaan

## Promotiestroom

Het template volgt een standaard promotiestroom:

### Ontwikkelingscyclus

```
1. Create feature branch from develop
2. Implement changes
3. Open PR to develop
4. CI validates (lint, type check, build)
5. CodeQL scans for vulnerabilities
6. Code review and approval
7. Merge to develop --> automatic preview deployment
```

### Productierelease

```
1. Open PR from develop to main
2. CI validates against main
3. CodeQL security scan
4. Final code review
5. Merge to main --> automatic production deployment
```

### Hotfix-proces

```
1. Create hotfix branch from main
2. Implement fix
3. Open PR directly to main
4. CI + CodeQL validation
5. Emergency review and merge
6. Backport to develop
```

## Aanpassing

### Nieuwe CI-stappen toevoegen

Om tests of aanvullende validatie toe te voegen, voeg stappen toe aan de `ci.yml`-taak:

```yaml
- name: Run unit tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test

- name: Run E2E tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test:e2e
```

### Implementatiemeldingen toevoegen

Voeg een meldingsstap toe aan het einde van de implementatieworkflow:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text": "Deployed to ${{ inputs.environment }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Omgevingsspecifieke variabelen

Gebruik GitHub-**omgevingen** om secrets te beperken tot specifieke implementatiedoelen:

1. Ga naar **Instellingen** > **Omgevingen**
2. Maak `production`- en `preview`-omgevingen aan
3. Voeg omgevingsspecifieke secrets toe
4. Verwijs ernaar in workflows met de `environment:`-configuratie
