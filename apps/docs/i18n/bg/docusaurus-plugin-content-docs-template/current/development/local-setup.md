# Настройка на Локална Разработка

Това ръководство ще ви помогне да настроите пълна локална среда за разработка за Ever Works.

## Предварителни Изисквания

Уверете се, че имате инсталирано следното:

- **Node.js 20.x или по-нова** - [Изтегли](https://nodejs.org/)
- **pnpm** - [Инсталирай](https://pnpm.io/installation) (мениджър на пакети за monorepo)
- **Git** - [Изтегли](https://git-scm.com/)
- **PostgreSQL** (опционално) - [Изтегли](https://postgresql.org/)
- **Docker** (опционално) - [Изтегли](https://docker.com/)

## Настройка на Средата за Разработка

### 1. Клониране и Инсталиране

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Install all dependencies from the monorepo root
pnpm install
```

### 2. Конфигурация на Средата

Копирайте примерния файл за среда в директорията на уеб приложението:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Конфигурирайте вашия файл `apps/web/.env.local`:

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

### 3. Настройка на Базата Данни (Опционално)

#### Вариант А: Локален PostgreSQL

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

#### Вариант Б: Docker PostgreSQL

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

#### Вариант В: Supabase

1. Създайте проект в [Supabase](https://supabase.com)
2. Вземете connection string от Настройки → База данни
3. Актуализирайте `DATABASE_URL` в `apps/web/.env.local`
4. Стартирайте миграции от `apps/web/`: `pnpm run db:migrate`

### 4. Настройка на Хранилището за Съдържание

#### Разклонете Хранилището с Данни

1. Посетете [awesome-data](https://github.com/ever-works/awesome-data)
2. Натиснете "Fork" за да създадете копие
3. Актуализирайте `DATA_REPOSITORY` в `apps/web/.env.local`

#### Генерирайте GitHub Токен

1. Отидете на GitHub Settings → Developer settings → Personal access tokens
2. Генерирайте нов токен (класически)
3. Изберете обхвати: `repo`, `read:user`, `user:email`
4. Копирайте генерирания токен и го добавете към `GH_TOKEN` в `apps/web/.env.local`
5. **Важно**: Никога не включвайте токена в контрола на версиите

### 5. Стартиране на Сървъра за Разработка

```bash
# From the monorepo root — starts all apps (web, docs, etc.)
pnpm run dev

# Or start only the web app
pnpm run dev:web
```

Вашето приложение ще бъде достъпно на [http://localhost:3000](http://localhost:3000).

## Скриптове за Разработка

### Основни Скриптове (от корена на monorepo)

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

### Скриптове за База Данни (изпълнявайте от `apps/web/`)

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

### Скриптове за Съдържание (изпълнявайте от `apps/web/`)

```bash
cd apps/web

# Sync content from Git
pnpm run content:sync

# Validate content files
pnpm run content:validate

# Generate content types
pnpm run content:types
```

## Инструменти за Разработка

### Настройка на VS Code

Инсталирайте препоръчаните разширения:

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

Конфигурирайте настройките на VS Code (`.vscode/settings.json`):

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

### DevTools на Браузъра

#### React Developer Tools

- Инсталирайте [React DevTools](https://react.dev/learn/react-developer-tools)
- Инспектирайте дървото от компоненти и пропсите
- Профилирайте производителността на компонентите

#### Redux DevTools (за Zustand)

- Инсталирайте [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- Наблюдавайте промените в състоянието
- Дебъгване с пътуване назад във времето

### Инструменти за База Данни

#### Drizzle Studio

```bash
cd apps/web && pnpm run db:studio
```

- Визуален браузър на база данни
- Интерфейс за изграждане на заявки
- Визуализация на схемата

#### pgAdmin (за PostgreSQL)

- Инсталирайте [pgAdmin](https://www.pgadmin.org/)
- Свържете се с локалната база данни
- Разширени инструменти за заявки

## Hot Reloading

Сървърът за разработка поддържа hot reloading за:

- **React компоненти** - Незабавни актуализации
- **API маршрути** - Автоматично рестартиране
- **Tailwind CSS** - Актуализации на стиловете на живо
- **TypeScript** - Проверка на типовете в реално време

### Отстраняване на Проблеми с Hot Reload

Ако hot reload спре да работи:

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Restart development server
pnpm run dev
```

## Променливи на Средата

### Разработка срещу Продукция

Създайте различни файлове за среда в `apps/web/`:

```bash
apps/web/.env.local          # Local development
apps/web/.env.development    # Development environment
apps/web/.env.staging        # Staging environment
apps/web/.env.production     # Production environment
```

### Валидиране на Променливите на Средата

Приложението валидира променливите на средата при стартиране:

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

## Настройка на Тестването

### Единично Тестване

```bash
# Run tests (from monorepo root)
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### E2E Тестване

E2E тестовете се намират в пакета workspace `apps/web-e2e/` (`@ever-works/web-e2e`).

```bash
# From the monorepo root
pnpm run --filter @ever-works/web-e2e test:e2e

# Or from the E2E directory
cd apps/web-e2e
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui
```

## Дебъгване

### Дебъгване на Страната на Сървъра

Добавете към `package.json`:

```json
{
	"scripts": {
		"dev:debug": "NODE_OPTIONS='--inspect' next dev"
	}
}
```

След това прикрепете дебъгера в VS Code или Chrome DevTools.

### Дебъгване на Страната на Клиента

Използвайте DevTools на браузъра или добавете точки на прекъсване:

```typescript
// Add debugger statement
debugger;

// Or use console methods
console.log('Debug info:', data);
console.table(items);
console.group('API Response');
```

### Дебъгване на API

Активирайте логването на API:

```bash
# In apps/web/.env.local
DEBUG=api:*
LOG_LEVEL=debug
```

## Наблюдение на Производителността

### Анализ на Bundle

```bash
# Analyze bundle size (from apps/web/)
cd apps/web && pnpm run analyze
```

### Профилиране на Производителността

```bash
# Enable React profiling
NEXT_PUBLIC_REACT_PROFILING=true pnpm run dev:web
```

## Чести Проблеми при Разработка

### Портът Вече е Зает

```bash
# Use different port
pnpm run dev:web -- -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Проблеми с Разрешаването на Модули

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript Грешки

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check types manually
pnpm run type-check
```

### Проблеми с Връзката към Базата Данни

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d everworks_dev
```

## Работен Процес на Разработка

### 1. Разработка на Функционалност

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

### 2. Проверки за Качество на Кода

```bash
# Run all checks
pnpm run check

# Individual checks
pnpm run lint
pnpm run type-check
pnpm run test
pnpm run format:check
```

### 3. Промени в Базата Данни

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

## Следващи Стъпки

Вашата локална среда за разработка е готова! Можете да започнете да разработвате вашето приложение Ever Works.
