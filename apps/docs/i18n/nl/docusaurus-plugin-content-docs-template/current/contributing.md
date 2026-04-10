---
id: contributing
title: Bijdragegids
sidebar_label: Bijdragen
---

# Bijdragegids

Bedankt voor uw interesse in het bijdragen aan de Directory Web Template. Deze gids behandelt alles wat u moet weten om zinvolle bijdragen te leveren.

## Repository

De broncode van de Template is gehost op [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

Voor bijdragen aan het Ever Works Platform, zie de [Platform-repository](https://github.com/ever-works/ever-works) en de bijdragegids op [docs.ever.works](https://docs.ever.works).

## Vereisten

Zorg ervoor dat u het volgende geïnstalleerd heeft voordat u begint:

- **Node.js** >= 20.19.0 (LTS aanbevolen)
- **pnpm** >= 10.x (strikt gehandhaafd; gebruik geen npm of yarn)
- **Git** >= 2.30
- **PostgreSQL** (voor database; Supabase biedt een gehoste optie)

### pnpm installeren

```bash
# Met corepack (aanbevolen, wordt geleverd met Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# Of via npm (eenmalige bootstrap)
npm install -g pnpm
```

**Belangrijk:** De repository gebruikt `packageManager`-velden en lockfiles die specifiek zijn voor pnpm. Het uitvoeren van `npm install` of `yarn install` mislukt of produceert onjuiste afhankelijkheidsbomen.

## Ontwikkelingsomgeving instellen

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# Omgevingsbestand kopiëren en configureren
cp .env.example .env.local
# Bewerk .env.local met uw waarden (zie README voor details)

pnpm dev        # Next.js dev-server op poort 3000
```

## Codestandaarden

### TypeScript

De Template gebruikt TypeScript overal. Introduceer geen gewone `.js`-bestanden. Volg strikte TypeScript-praktijken:

- Schakel `strict`-modus in en respecteer de instellingen in `tsconfig.json`
- Gebruik bij voorkeur expliciete retourtypen bij geëxporteerde functies
- Gebruik `unknown` boven `any` waar mogelijk
- Valideer invoer met **Zod**-schema's

### Opmaak (Prettier)

Opmaak wordt afgedwongen via Prettier. De configuratie bevindt zich in de root-`package.json`:

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

Voer de formatter uit vóór het committen:

```bash
pnpm format          # Alle bestanden opmaken
pnpm format:check    # Controleren zonder te wijzigen (CI-vriendelijk)
```

### Linting (ESLint)

De Template gebruikt de platte ESLint-configuratie (`eslint.config.mjs`) met React-, React Hooks- en TypeScript-plugins:

```bash
pnpm lint
```

### Naamgevingsconventies

| Element                       | Conventie        | Voorbeeld                             |
| ----------------------------- | ---------------- | ------------------------------------- |
| Bestanden                     | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| Klassen, Interfaces, Types    | PascalCase       | `DirectoryService`, `UserProfile`     |
| Functies, Variabelen          | camelCase        | `getDirectoryById`, `itemCount`       |
| Constanten                    | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## Commit-conventies

De repository dwingt [Conventional Commits](https://www.conventionalcommits.org/) af via **commitlint** en **husky** pre-commit hooks.

| Prefix      | Gebruik                                       |
| ----------- | --------------------------------------------- |
| `feat:`     | Nieuwe functies                               |
| `fix:`      | Bugfixes                                      |
| `docs:`     | Documentatiewijzigingen                       |
| `refactor:` | Code-herstructurering zonder gedragswijziging |
| `test:`     | Tests toevoegen of bijwerken                  |
| `chore:`    | Onderhoudstaken, afhankelijkheidsupdates       |
| `style:`    | Opmaakwijzigingen (geen logicawijziging)       |
| `perf:`     | Prestatieverbeteringen                        |
| `ci:`       | CI/CD-configuratiewijzigingen                 |

Voorbeeld:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## Branch-naamgeving

Gebruik beschrijvende branchnamen met een prefix:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## Pull Request-proces

1. **Fork** de repository (of maak een branch als u schrijftoegang heeft).
2. **Maak een feature-branch** van `main`.
3. **Voer uw wijzigingen door** volgens de bovenstaande codestandaarden.
4. **Voer kwaliteitscontroles uit** vóór het pushen (zie hieronder).
5. **Push** uw branch en open een Pull Request tegen `main`.
6. **Vul de PR-template in** met een beschrijving, gerelateerde problemen en testnotities.
7. **Wacht op beoordeling.** Een beheerder beoordeelt uw PR en kan wijzigingen aanvragen.
8. Na goedkeuring zal een beheerder uw PR samenvoegen.

### Kwaliteitscontroles vóór het indienen van een PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # TypeScript-controle
pnpm build          # Volledige productiebuild
```

### Testen

De Template gebruikt **Playwright** voor end-to-end tests:

```bash
pnpm test:e2e
```

Als uw wijzigingen bestaande functionaliteit raken, zorg dan dat alle gerelateerde tests slagen. Als u nieuwe functionaliteit toevoegt, voeg dan tests toe.

## Licentie

De Directory Web Template is gelicenseerd onder de **GNU Affero General Public License v3.0 (AGPL-3.0)**. Door een bijdrage in te dienen, gaat u ermee akkoord dat uw werk onder dezelfde licentie wordt gelicenseerd.

## Gedragscode

Van alle bijdragers wordt verwacht dat zij de gedragscode van het project volgen. Wees respectvol, constructief en samenwerkend.

## Hulp krijgen

Als u vragen heeft over bijdragen:

- Open een [GitHub-discussie](https://github.com/ever-works/directory-web-template/discussions)
- Sluit u aan bij de [Discord-community](https://discord.gg/ever) voor realtime hulp
- E-mail naar [ever@ever.co](mailto:ever@ever.co) voor privévragen
