---
id: ci-cd
title: Pipeline CI/CD
sidebar_label: CI/CD Pipeline
sidebar_position: 3
---

# Pipeline CI/CD

Il Template Ever Works include una pipeline CI/CD completa costruita con GitHub Actions. Questa guida tratta la struttura del workflow, la scansione della sicurezza, la strategia di protezione dei branch e il flusso di promozione delle distribuzioni.

## Panoramica del Workflow

La pipeline è composta da sei file di workflow in `.github/workflows/`:

| Workflow | File | Trigger | Scopo |
|---|---|---|---|
| CI | `ci.yml` | Push/PR su `main`, `develop` | Lint, verifica tipi, build |
| CodeQL | `codeql.yml` | Push/PR su `main`, `develop` + pianificazione settimanale | Scansione vulnerabilità di sicurezza |
| Dev Deploy | `deploy_dev.yaml` | Push su `develop` | Deploy in ambiente di anteprima |
| Prod Deploy | `deploy_prod.yaml` | Push su `main` | Deploy in ambiente di produzione |
| Vercel Deploy | `deploy_vercel.yaml` | Chiamato dai workflow dev/prod | Logica di deploy Vercel condivisa |
| Disable CodeQL | `disable-default-codeql.yml` | Solo manuale | Utility per risolvere conflitti CodeQL |

### Flusso della Pipeline

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

## Workflow CI (ci.yml)

Il workflow CI viene eseguito ad ogni push e pull request su `main` e `develop`. Valida la qualità del codice e garantisce che il progetto venga compilato con successo.

### Job

Il workflow contiene un singolo job `lint-and-build` che viene eseguito su `ubuntu-latest`:

**Passaggi**:

1. **Checkout del codice** -- Clona il repository
2. **Rilevamento del package manager** -- Rileva automaticamente pnpm, yarn o npm dai lockfile
3. **Configurazione di pnpm** -- Installa pnpm v9 se rilevato
4. **Configurazione di Node.js** -- Installa Node 20 con caching del package manager
5. **Installazione delle dipendenze** -- Esegue `pnpm install`
6. **Esecuzione del lint** -- Esegue `pnpm lint` (continua in caso di errori per le PR)
7. **Verifica dei tipi** -- Esegue `pnpm typecheck` o `pnpm check:types`
8. **Creazione delle directory dei contenuti** -- Crea `.content/data` per la build
9. **Build del progetto** -- Esegue `pnpm build` con tutte le variabili d'ambiente richieste
10. **Verifica del successo della build** -- Verifica che la directory `.next` sia stata creata

### Controllo della Concorrenza

```yaml
concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true
```

Se un nuovo push avviene sullo stesso branch mentre il CI è ancora in esecuzione, l'esecuzione precedente viene annullata automaticamente. Questo risparmia minuti CI e garantisce che solo l'ultimo commit venga validato.

### Variabili d'Ambiente

Il workflow CI utilizza una combinazione di valori predefiniti hardcoded e secret GitHub:

| Variabile | Fonte | Scopo |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Hardcoded | URL dell'applicazione per la build |
| `DATABASE_URL` | Secret o predefinito | Connessione al database per la build |
| `AUTH_SECRET` | Valore CI hardcoded | Firma del token auth (non per produzione) |
| `DATA_REPOSITORY` | Secret o predefinito | URL del repository dei contenuti |
| `CONTENT_WARNINGS_SILENT` | Hardcoded `true` | Sopprime gli avvisi di contenuto in CI |
| `CI` | Hardcoded `true` | Indica l'ambiente CI |
| Secret OAuth | Secret GitHub | Credenziali Google, GitHub, Facebook, Twitter |
| `RESEND_API_KEY` | Secret GitHub | Servizio email per i controlli in fase di build |

### Permessi

Il workflow richiede permessi minimi:

```yaml
permissions:
  contents: read
```

È necessario solo l'accesso in lettura ai contenuti del repository per il job CI.

## Analisi della Sicurezza CodeQL (codeql.yml)

### Cosa Fa

CodeQL esegue l'analisi semantica del codice per rilevare vulnerabilità di sicurezza nel codice JavaScript/TypeScript. Viene eseguito:

- Ad ogni push e PR su `main` e `develop`
- Settimanalmente il lunedì alle 6:00 UTC (scansione pianificata)
- All'attivazione manuale

### Passaggi di Analisi

1. **Checkout** e **configurazione** Node.js + pnpm
2. **Inizializzazione di CodeQL** con il linguaggio `javascript-typescript`
3. **Configurazione dell'ambiente CodeQL** tramite `scripts/codeql-setup.js`
4. **Installazione delle dipendenze** per il contesto di analisi
5. **Autobuild** -- Rilevamento automatico della build di CodeQL
6. **Analisi con upload** -- Carica i risultati nella scheda Security di GitHub
7. **Analisi di fallback** -- Se l'upload fallisce, analisi senza upload

### Permessi

CodeQL richiede permessi più ampi per il reporting degli eventi di sicurezza:

```yaml
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
```

### Visualizzazione dei Risultati

Dopo un'esecuzione riuscita con upload:
1. Vai al tuo repository su GitHub
2. Naviga su **Security** > **Code scanning**
3. Esamina i risultati, filtra per gravità e gestisci gli avvisi

### Risoluzione dei Conflitti CodeQL

Se si incontrano conflitti di elaborazione SARIF con la configurazione CodeQL predefinita di GitHub, usa il workflow `disable-default-codeql.yml`:

```bash
# Trigger manually from GitHub Actions tab
# This disables the default configuration that may conflict with your custom setup
```

## Workflow di Deploy

### Mappatura Branch-Ambiente

| Branch | Workflow | Ambiente | Dominio |
|---|---|---|---|
| `develop` | `deploy_dev.yaml` | `preview` | URL di anteprima da Vercel |
| `main` | `deploy_prod.yaml` | `production` | Dominio di produzione |

### Gate del Provider di Deploy

Entrambi i workflow di deploy controllano una variabile del repository prima di procedere:

```yaml
jobs:
  Vercel:
    if: ${{ vars.DEPLOY_PROVIDER == 'vercel' }}
```

Imposta `DEPLOY_PROVIDER=vercel` nelle **Impostazioni > Variabili** del tuo repository per abilitare i deploy Vercel. Questo consente di cambiare provider di deploy senza modificare i file del workflow.

### Deploy Vercel (deploy_vercel.yaml)

Il workflow di deploy Vercel condiviso gestisce sia i deploy di anteprima che di produzione.

**Strategia di Deploy**: Il workflow utilizza un approccio in due fasi:

1. **Deploy API** (primario): Avvia il deploy tramite l'API Vercel per build più veloci
2. **Fallback CLI**: Se la chiamata API fallisce, ricade su `vercel build` + `vercel deploy --prebuilt`

**Passaggi**:

1. **Checkout** del codice
2. **Rilevamento del package manager** e configurazione di pnpm
3. **Installazione globale di Vercel CLI**
4. **Collegamento del progetto Vercel** usando `VERCEL_TOKEN` e scope del team opzionale
5. **Impostazione delle variabili d'ambiente** (DATA_REPOSITORY, GH_TOKEN, CRON_SECRET) tramite Vercel CLI
6. **Recupero delle impostazioni Vercel** per l'ambiente di destinazione
7. **Attivazione del deploy API** o fallback a CLI build/deploy
8. **Aggiornamento del cron schedule** tramite `scripts/update-cron.ts`

### Secret Richiesti

Configura questi nei secret del tuo repository GitHub:

| Secret | Richiesto | Scopo |
|---|---|---|
| `VERCEL_TOKEN` | Sì | Autenticazione API Vercel |
| `VERCEL_TEAM_SCOPE` | Se si usano team | Slug del team Vercel |
| `DATA_REPOSITORY` | Sì | Nome del repository dei contenuti |
| `GH_TOKEN` | Sì | Token GitHub per la clonazione dei contenuti |
| `CRON_SECRET` | Consigliato | Autentica le chiamate all'endpoint cron |
| `DATABASE_URL` | Per la build | Stringa di connessione al database |
| Secret OAuth | Se si usa OAuth | Credenziali del provider |

### Aggiornamenti del Cron Schedule

Dopo un deploy riuscito, il workflow esegue `scripts/update-cron.ts` per sincronizzare i cron schedule:

```yaml
- name: Update cron schedule
  if: success() && steps.trigger_deployment.outputs.deployment_id != ''
  run: npx tsx scripts/update-cron.ts
```

## Regole di Protezione dei Branch

### Impostazioni Consigliate per `main`

| Impostazione | Valore | Scopo |
|---|---|---|
| Richiedi pull request | Sì | Nessun push diretto alla produzione |
| Revisioni richieste | 1+ | Revisione del codice prima del merge |
| Richiedi controlli di stato | CI (lint-and-build) | Il CI deve passare prima del merge |
| Richiedi CodeQL | Analisi CodeQL | La scansione di sicurezza deve passare |
| Richiedi branch aggiornati | Sì | La PR deve essere rebasata sull'ultimo main |
| Includi amministratori | Sì | Le regole si applicano a tutti |

### Impostazioni Consigliate per `develop`

| Impostazione | Valore | Scopo |
|---|---|---|
| Richiedi pull request | Opzionale | Push diretti consentiti per iterazione rapida |
| Controlli di stato richiesti | CI (lint-and-build) | Gate di qualità di base |
| Richiedi branch aggiornati | No | Consente un'iterazione più rapida |

### Configurazione della Protezione dei Branch

1. Vai alle **Impostazioni** > **Branch** del repository
2. Clicca su **Aggiungi regola di protezione del branch**
3. Inserisci il pattern del nome del branch (es. `main`)
4. Configura le impostazioni dalle tabelle sopra
5. Salva le modifiche

## Flusso di Promozione

Il template segue un flusso di promozione standard:

### Ciclo di Sviluppo

```
1. Create feature branch from develop
2. Implement changes
3. Open PR to develop
4. CI validates (lint, type check, build)
5. CodeQL scans for vulnerabilities
6. Code review and approval
7. Merge to develop --> automatic preview deployment
```

### Rilascio in Produzione

```
1. Open PR from develop to main
2. CI validates against main
3. CodeQL security scan
4. Final code review
5. Merge to main --> automatic production deployment
```

### Processo Hotfix

```
1. Create hotfix branch from main
2. Implement fix
3. Open PR directly to main
4. CI + CodeQL validation
5. Emergency review and merge
6. Backport to develop
```

## Personalizzazione

### Aggiunta di Nuovi Passaggi CI

Per aggiungere test o validazioni aggiuntive, aggiungi passaggi al job `ci.yml`:

```yaml
- name: Run unit tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test

- name: Run E2E tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test:e2e
```

### Aggiunta di Notifiche di Deploy

Aggiungi un passaggio di notifica alla fine del workflow di deploy:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text": "Deployed to ${{ inputs.environment }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Variabili Specifiche dell'Ambiente

Usa gli **Ambienti** di GitHub per limitare i secret a specifici target di deploy:

1. Vai su **Impostazioni** > **Ambienti**
2. Crea gli ambienti `production` e `preview`
3. Aggiungi secret specifici dell'ambiente
4. Fai riferimento a essi nei workflow con la configurazione `environment:`
