# Konfiguracja Lokalnego Środowiska

Ten przewodnik pomoże Ci skonfigurować kompletne lokalne środowisko deweloperskie dla Ever Works.

## Wymagania Wstępne

Upewnij się, że masz zainstalowane następujące elementy:

- **Node.js 20.x lub nowszy** - [Pobierz](https://nodejs.org/)
- **pnpm** - [Zainstaluj](https://pnpm.io/installation) (menedżer pakietów monorepo)
- **Git** - [Pobierz](https://git-scm.com/)
- **PostgreSQL** (opcjonalnie) - [Pobierz](https://postgresql.org/)
- **Docker** (opcjonalnie) - [Pobierz](https://docker.com/)

## Konfiguracja Środowiska Deweloperskiego

### 1. Klonowanie i Instalacja

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Install all dependencies from the monorepo root
pnpm install
```

### 2. Konfiguracja Środowiska

Skopiuj przykładowy plik środowiska do katalogu aplikacji webowej:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Skonfiguruj plik `apps/web/.env.local`:

```bash
# Basic Development Configuration
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Authentication
AUTH_SECRET="generate-a-secure-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# GitHub Integration (Required)
GH_TOKEN="your-github-personal-access-token"
DATA_REPOSITORY="https://github.com/your-username/awesome-data"

# Database (Optional)
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Konfiguracja Bazy Danych (Opcjonalnie)

#### Opcja A: Lokalne PostgreSQL

```bash
# Create database
createdb everworks_dev

# Run database commands from the web app directory
cd apps/web

# Run migrations
pnpm run db:generate
pnpm run db:migrate

# Seed with sample data
pnpm run db:seed
```

#### Opcja B: Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=your_database_name \
  -p 5432:5432 \
  -d postgres:15

# Run migrations (from apps/web/)
pnpm run db:migrate
pnpm run db:seed
```

#### Opcja C: Supabase

1. Utwórz projekt na [Supabase](https://supabase.com)
2. Pobierz connection string z Ustawienia → Baza danych
3. Zaktualizuj `DATABASE_URL` w `apps/web/.env.local`
4. Uruchom migracje z `apps/web/`: `pnpm run db:migrate`

### 4. Konfiguracja Repozytorium Treści

#### Zforkuj Repozytorium Danych

1. Odwiedź [awesome-data](https://github.com/ever-works/awesome-data)
2. Kliknij "Fork", aby utworzyć kopię
3. Zaktualizuj `DATA_REPOSITORY` w `apps/web/.env.local`

#### Wygeneruj Token GitHub

1. Przejdź do GitHub Settings → Developer settings → Personal access tokens
2. Wygeneruj nowy token (klasyczny)
3. Wybierz zakresy: `repo`, `read:user`, `user:email`
4. Skopiuj wygenerowany token i dodaj go do `GH_TOKEN` w `apps/web/.env.local`
5. **Ważne**: Nigdy nie commituj tokenu do kontroli wersji

### 5. Uruchom Serwer Deweloperski

```bash
# From the monorepo root — starts all apps (web, docs, etc.)
pnpm run dev

# Or start only the web app
pnpm run dev:web
```

Twoja aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000).

## Skrypty Deweloperskie

### Podstawowe Skrypty (z poziomu katalogu głównego monorepo)

```bash
# Start all dev servers (web, docs, etc.)
pnpm run dev

# Start only the web app
pnpm run dev:web

# Build all apps
pnpm run build

# Type checking
pnpm run type-check

# Linting
pnpm run lint
pnpm run lint:fix

# Code formatting
pnpm run format
pnpm run format:check
```

### Skrypty Bazy Danych (uruchom z `apps/web/`)

```bash
cd apps/web

# Generate database schema
pnpm run db:generate

# Run migrations
pnpm run db:migrate

# Reset database
pnpm run db:reset

# Seed database
pnpm run db:seed

# Open database studio
pnpm run db:studio
```

### Skrypty Treści (uruchom z `apps/web/`)

```bash
cd apps/web

# Sync content from Git
pnpm run content:sync

# Validate content files
pnpm run content:validate

# Generate content types
pnpm run content:types
```

## Narzędzia Deweloperskie

### Konfiguracja VS Code

Zainstaluj zalecane rozszerzenia:

```json
{
	"recommendations": [
		"bradlc.vscode-tailwindcss",
		"esbenp.prettier-vscode",
		"dbaeumer.vscode-eslint",
		"ms-vscode.vscode-typescript-next",
		"formulahendry.auto-rename-tag",
		"christian-kohler.path-intellisense"
	]
}
```

Skonfiguruj ustawienia VS Code (`.vscode/settings.json`):

```json
{
	"editor.formatOnSave": true,
	"editor.defaultFormatter": "esbenp.prettier-vscode",
	"editor.codeActionsOnSave": {
		"source.fixAll.eslint": true
	},
	"typescript.preferences.importModuleSpecifier": "relative",
	"tailwindCSS.experimental.classRegex": [
		["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
		["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
	]
}
```

### DevTools Przeglądarki

#### React Developer Tools

- Zainstaluj [React DevTools](https://react.dev/learn/react-developer-tools)
- Sprawdzaj drzewo komponentów i propsy
- Profilej wydajność komponentów

#### Redux DevTools (dla Zustand)

- Zainstaluj [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- Monitoruj zmiany stanu
- Debugowanie z podróżą w czasie

### Narzędzia Bazy Danych

#### Drizzle Studio

```bash
cd apps/web && pnpm run db:studio
```

- Wizualny przeglądarka bazy danych
- Interfejs konstruktora zapytań
- Wizualizacja schematu

#### pgAdmin (dla PostgreSQL)

- Zainstaluj [pgAdmin](https://www.pgadmin.org/)
- Połącz się z lokalną bazą danych
- Zaawansowane narzędzia zapytań

## Hot Reloading

Serwer deweloperski obsługuje hot reloading dla:

- **Komponenty React** - Natychmiastowe aktualizacje
- **Trasy API** - Automatyczny restart
- **Tailwind CSS** - Aktualizacje stylów na żywo
- **TypeScript** - Sprawdzanie typów w czasie rzeczywistym

### Rozwiązywanie Problemów z Hot Reload

Jeśli hot reload przestanie działać:

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Restart development server
pnpm run dev
```

## Zmienne Środowiskowe

### Deweloperskie vs Produkcyjne

Utwórz różne pliki środowiskowe w `apps/web/`:

```bash
apps/web/.env.local          # Local development
apps/web/.env.development    # Development environment
apps/web/.env.staging        # Staging environment
apps/web/.env.production     # Production environment
```

### Walidacja Zmiennych Środowiskowych

Aplikacja waliduje zmienne środowiskowe podczas uruchamiania:

```typescript
// apps/web/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']),
	AUTH_SECRET: z.string().min(32),
	GH_TOKEN: z.string().startsWith('ghp_'),
	DATABASE_URL: z.string().url().optional()
});

export const env = envSchema.parse(process.env);
```

## Konfiguracja Testowania

### Testy Jednostkowe

```bash
# Run tests (from monorepo root)
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### Testy E2E

Testy E2E znajdują się w pakiecie workspace `apps/web-e2e/` (`@ever-works/web-e2e`).

```bash
# From the monorepo root
pnpm run --filter @ever-works/web-e2e test:e2e

# Or from the E2E directory
cd apps/web-e2e
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui
```

## Debugowanie

### Debugowanie Serwerowe

Dodaj do `package.json`:

```json
{
	"scripts": {
		"dev:debug": "NODE_OPTIONS='--inspect' next dev"
	}
}
```

Następnie podłącz debugger w VS Code lub Chrome DevTools.

### Debugowanie Klienckie

Używaj DevTools przeglądarki lub dodaj breakpointy:

```typescript
// Add debugger statement
debugger;

// Or use console methods
console.log('Debug info:', data);
console.table(items);
console.group('API Response');
```

### Debugowanie API

Włącz logowanie API:

```bash
# In apps/web/.env.local
DEBUG=api:*
LOG_LEVEL=debug
```

## Monitorowanie Wydajności

### Analiza Bundle

```bash
# Analyze bundle size (from apps/web/)
cd apps/web && pnpm run analyze
```

### Profilowanie Wydajności

```bash
# Enable React profiling
NEXT_PUBLIC_REACT_PROFILING=true pnpm run dev:web
```

## Typowe Problemy Deweloperskie

### Port Już w Użyciu

```bash
# Use different port
pnpm run dev:web -- -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Problemy z Rozwiązywaniem Modułów

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

### Błędy TypeScript

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check types manually
pnpm run type-check
```

### Problemy z Połączeniem z Bazą Danych

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d everworks_dev
```

## Przepływ Pracy Deweloperskiej

### 1. Tworzenie Funkcji

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
pnpm run dev
pnpm run test

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### 2. Sprawdzanie Jakości Kodu

```bash
# Run all checks
pnpm run check

# Individual checks
pnpm run lint
pnpm run type-check
pnpm run test
pnpm run format:check
```

### 3. Zmiany w Bazie Danych

```bash
# Run from apps/web/
cd apps/web

# Create migration
pnpm run db:generate

# Apply migration
pnpm run db:migrate

# Test with seed data
pnpm run db:seed
```

## Następne Kroki

Twoje lokalne środowisko deweloperskie jest gotowe! Możesz rozpocząć tworzenie swojej aplikacji Ever Works.
