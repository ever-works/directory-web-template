---
id: changelog
title: Changelog & Versioning
sidebar_label: Changelog
---

# Changelog & Versioning

Questa pagina spiega come il Directory Web Template gestisce il versioning, i rilasci e i percorsi di aggiornamento.

## Versionamento Semantico

Il Template segue il [Semantic Versioning (SemVer)](https://semver.org/). I numeri di versione utilizzano il formato **MAJOR.MINOR.PATCH**:

| Componente | Quando incrementare                                           |
| ---------- | ------------------------------------------------------------- |
| **MAJOR**  | Modifiche incompatibili che richiedono passi di migrazione    |
| **MINOR**  | Nuove funzionalità aggiunte in modo retrocompatibile          |
| **PATCH**  | Correzioni di bug retrocompatibili e miglioramenti minori     |

Le versioni pre-release possono usare suffissi come `-alpha.1`, `-beta.2` o `-rc.1` per test anticipati.

## Migrazioni del Database

Il Template usa **Drizzle ORM** con PostgreSQL. Le modifiche allo schema del database sono gestite tramite Drizzle Kit:

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio for visual database management
pnpm db:studio
```

I file di migrazione sono archiviati nella directory `lib/db/migrations/`. Ogni migrazione è un file SQL generato dalle modifiche alle definizioni dello schema Drizzle in `lib/db/schema/`.

## Aggiornamento del Template

Quando si esegue l'aggiornamento a una versione più recente:

```bash
cd directory-web-template

# Pull latest changes
git pull origin main

# Install updated dependencies
pnpm install

# Apply database migrations
pnpm db:migrate

# Verify build
pnpm build
```

### Gestione dei Conflitti Durante gli Aggiornamenti

Se hai personalizzato il Template, potresti incontrare conflitti di merge durante il recupero degli aggiornamenti. L'approccio consigliato:

1. **Mantieni le personalizzazioni in file separati** quando possibile (componenti personalizzati, nuove route, servizi aggiuntivi).
2. **Usa il CMS basato su Git** per le modifiche al contenuto invece di modificare i file principali.
3. **Consulta le note di rilascio** prima di aggiornare per capire quali file sono cambiati.
4. **Testa accuratamente** dopo aver risolto i conflitti eseguendo `pnpm lint`, `pnpm tsc --noEmit` e `pnpm build`.

## Monitorare i Rilasci

### GitHub Releases

I rilasci sono pubblicati su GitHub all'indirizzo [github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases).

Ogni rilascio include:

- Un tag di versione (es. `v0.1.0`)
- Note di rilascio che descrivono modifiche, nuove funzionalità, correzioni di bug e breaking changes
- Link alle pull request e issue pertinenti

### Cronologia dei Commit

Il repository usa [Conventional Commits](https://www.conventionalcommits.org/), rendendo facile scansionare la cronologia dei commit per le modifiche:

```bash
# View recent commits with conventional commit prefixes
git log --oneline --since="2025-01-01"

# Filter for feature commits only
git log --oneline --grep="^feat:"

# Filter for breaking changes
git log --oneline --grep="BREAKING CHANGE"
```

## Politica sulle Breaking Changes

Le breaking changes vengono prese sul serio. Il progetto segue questi principi:

1. **Preavviso.** Le breaking changes vengono annunciate almeno un rilascio minore prima che entrino in vigore, quando possibile.
2. **Guide alla migrazione.** Ogni breaking change include una guida alla migrazione nelle note di rilascio.
3. **Minimizzare le interruzioni.** Le breaking changes vengono raggruppate nei rilasci major invece di distribuirle su più rilasci minor.
4. **Compatibilità retroattiva del database.** Le migrazioni sono progettate per essere non distruttive. Si preferiscono aggiunte di colonne e creazioni di tabelle rispetto a rimozioni o rinominazioni.

### Esempi di Breaking Changes

- Rimozione o rinominazione di un endpoint API pubblico
- Modifica della struttura dei corpi di richiesta o risposta API
- Rimozione o rinominazione di colonne o tabelle del database
- Modifica delle variabili d'ambiente richieste
- Abbandono del supporto per una versione di Node.js
- Modifica del comportamento di autenticazione o autorizzazione
- Rimozione o rinominazione di tipi o interfacce TypeScript esportati

### Esempi di Modifiche Non-Breaking

- Aggiunta di nuovi endpoint API
- Aggiunta di nuovi campi opzionali ai corpi di richiesta o risposta
- Aggiunta di nuove colonne del database con valori predefiniti
- Aggiunta di nuove variabili d'ambiente con valori predefiniti ragionevoli
- Aggiunta di nuove funzionalità o integrazioni
- Miglioramenti delle prestazioni
- Correzioni di bug

## Formato del Changelog

Le note di rilascio seguono questa struttura:

```markdown
## [0.2.0] - 2025-04-15

### Added

- Category-based directory filtering
- New Polar payment provider integration

### Changed

- Improved authentication flow with better error messages

### Fixed

- Resolved race condition in concurrent directory updates
- Fixed pagination offset calculation for search results

### Deprecated

- Legacy REST endpoints under /api/v1/ (use /api/v2/ instead)

### Breaking Changes

- Removed `LEGACY_AUTH_MODE` environment variable
- Renamed `DirectoryItem` type to `Item` across all APIs
```

Questo formato segue le convenzioni di [Keep a Changelog](https://keepachangelog.com/).
