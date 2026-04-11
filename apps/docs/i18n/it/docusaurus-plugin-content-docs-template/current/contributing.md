---
id: contributing
title: Guida ai Contributi
sidebar_label: Contribuire
---

# Guida ai Contributi

Grazie per il tuo interesse a contribuire al Directory Web Template. Questa guida copre tutto ciò che devi sapere per dare contributi significativi.

## Repository

Il codice sorgente del Template è ospitato su [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

Per i contributi alla Piattaforma Ever Works, vedere il [repository della Piattaforma](https://github.com/ever-works/ever-works) e la sua guida ai contributi su [docs.ever.works](https://docs.ever.works).

## Prerequisiti

Prima di iniziare, assicurati di avere installato quanto segue:

- **Node.js** >= 20.19.0 (LTS consigliato)
- **pnpm** >= 10.x (rigorosamente imposto; non usare npm o yarn)
- **Git** >= 2.30
- **PostgreSQL** (per il database; Supabase fornisce un'opzione ospitata)

### Installare pnpm

```bash
# Usando corepack (consigliato, incluso con Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# O tramite npm (bootstrap una-tantum)
npm install -g pnpm
```

**Importante:** Il repository utilizza campi `packageManager` e file di lock specifici per pnpm. L'esecuzione di `npm install` o `yarn install` fallirà o produrrà alberi di dipendenze errati.

## Configurazione dello sviluppo

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# Copiare il file di ambiente e configurarlo
cp .env.example .env.local
# Modifica .env.local con i tuoi valori (vedi README per i dettagli)

pnpm dev        # Server di sviluppo Next.js sulla porta 3000
```

## Standard del codice

### TypeScript

Il Template usa TypeScript ovunque. Non introdurre file `.js` semplici. Segui le pratiche TypeScript rigorose:

- Abilita e rispetta le impostazioni della modalità `strict` in `tsconfig.json`
- Preferisci i tipi di ritorno espliciti sulle funzioni esportate
- Usa `unknown` al posto di `any` dove possibile
- Valida l'input con schemi **Zod**

### Formattazione (Prettier)

La formattazione è imposta tramite Prettier. La configurazione si trova nel `package.json` della root:

```json
{
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed"
}
```

Esegui il formattatore prima di eseguire il commit:

```bash
pnpm format          # Formatta tutti i file
pnpm format:check    # Controlla senza modificare (compatibile con CI)
```

### Linting (ESLint)

Il Template usa la configurazione ESLint piatta (`eslint.config.mjs`) con plugin React, React Hooks e TypeScript:

```bash
pnpm lint
```

### Convenzioni di denominazione

| Elemento                    | Convenzione      | Esempio                               |
| --------------------------- | ---------------- | ------------------------------------- |
| File                        | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| Classi, Interfacce, Tipi    | PascalCase       | `DirectoryService`, `UserProfile`     |
| Funzioni, Variabili         | camelCase        | `getDirectoryById`, `itemCount`       |
| Costanti                    | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## Convenzioni di commit

Il repository impone i [Conventional Commits](https://www.conventionalcommits.org/) tramite **commitlint** e hook pre-commit **husky**.

| Prefisso    | Utilizzo                                             |
| ----------- | ---------------------------------------------------- |
| `feat:`     | Nuove funzionalità                                   |
| `fix:`      | Correzioni di bug                                    |
| `docs:`     | Modifiche alla documentazione                        |
| `refactor:` | Ristrutturazione del codice senza cambiamenti al comportamento |
| `test:`     | Aggiunta o aggiornamento di test                     |
| `chore:`    | Attività di manutenzione, aggiornamenti dipendenze   |
| `style:`    | Modifiche di formattazione (nessuna modifica logica) |
| `perf:`     | Miglioramenti delle prestazioni                      |
| `ci:`       | Modifiche alla configurazione CI/CD                  |

Esempio:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## Denominazione dei branch

Usa nomi di branch descrittivi con un prefisso:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## Processo di Pull Request

1. **Fai il fork** del repository (o crea un branch se hai accesso in scrittura).
2. **Crea un feature branch** da `main`.
3. **Apporta le modifiche** seguendo gli standard del codice sopra.
4. **Esegui i controlli di qualità** prima di fare push (vedi sotto).
5. **Fai il push** del tuo branch e apri una Pull Request contro `main`.
6. **Compila il template PR** con una descrizione, issue correlate e note sul testing.
7. **Attendi la revisione.** Un maintainer esaminerà la tua PR e potrebbe richiedere modifiche.
8. Una volta approvata, un maintainer unirà la tua PR.

### Controlli di qualità prima di inviare una PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # Controllo TypeScript
pnpm build          # Build di produzione completa
```

### Testing

Il Template usa **Playwright** per i test end-to-end:

```bash
pnpm test:e2e
```

Se le tue modifiche toccano funzionalità esistenti, assicurati che tutti i test correlati passino. Se aggiungi nuove funzionalità, includi test per essa.

## Licenza

Il Directory Web Template è concesso in licenza sotto la **GNU Affero General Public License v3.0 (AGPL-3.0)**. Inviando un contributo, accetti che il tuo lavoro sia concesso in licenza sotto la stessa licenza.

## Codice di condotta

Tutti i contributori sono tenuti a seguire il Codice di condotta del progetto. Sii rispettoso, costruttivo e collaborativo.

## Ottenere aiuto

Se hai domande sul contribuire:

- Apri una [GitHub Discussion](https://github.com/ever-works/directory-web-template/discussions)
- Unisciti alla [community Discord](https://discord.gg/ever) per aiuto in tempo reale
- Email a [ever@ever.co](mailto:ever@ever.co) per richieste private
