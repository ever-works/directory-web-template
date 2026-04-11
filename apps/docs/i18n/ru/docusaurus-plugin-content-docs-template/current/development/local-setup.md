# Настройка Локальной Разработки

Это руководство поможет вам настроить полную локальную среду разработки для Ever Works.

## Требования

Убедитесь, что у вас установлено следующее:

- **Node.js 20.x или выше** - [Скачать](https://nodejs.org/)
- **pnpm** - [Установить](https://pnpm.io/installation) (менеджер пакетов монорепозитория)
- **Git** - [Скачать](https://git-scm.com/)
- **PostgreSQL** (опционально) - [Скачать](https://postgresql.org/)
- **Docker** (опционально) - [Скачать](https://docker.com/)

## Настройка Среды Разработки

### 1. Клонирование и Установка

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Install all dependencies from the monorepo root
pnpm install
```

### 2. Конфигурация Среды

Скопируйте пример файла среды в директорию веб-приложения:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Настройте файл `apps/web/.env.local`:

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

### 3. Настройка Базы Данных (Опционально)

#### Вариант А: Локальный PostgreSQL

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

1. Создайте проект на [Supabase](https://supabase.com)
2. Получите строку подключения в Настройки → База данных
3. Обновите `DATABASE_URL` в `apps/web/.env.local`
4. Запустите миграции из `apps/web/`: `pnpm run db:migrate`

### 4. Настройка Репозитория Контента

#### Форкните Репозиторий Данных

1. Перейдите на [awesome-data](https://github.com/ever-works/awesome-data)
2. Нажмите «Fork», чтобы создать свою копию
3. Обновите `DATA_REPOSITORY` в `apps/web/.env.local`

#### Сгенерируйте Токен GitHub

1. Перейдите в GitHub Settings → Developer settings → Personal access tokens
2. Сгенерируйте новый токен (классический)
3. Выберите области: `repo`, `read:user`, `user:email`
4. Скопируйте сгенерированный токен и добавьте его в `GH_TOKEN` в `apps/web/.env.local`
5. **Важно**: Никогда не коммитьте токен в систему контроля версий

### 5. Запуск Сервера Разработки

```bash
# From the monorepo root — starts all apps (web, docs, etc.)
pnpm run dev

# Or start only the web app
pnpm run dev:web
```

Ваше приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

## Скрипты Разработки

### Основные Скрипты (из корня монорепозитория)

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

### Скрипты Базы Данных (запускать из `apps/web/`)

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

### Скрипты Контента (запускать из `apps/web/`)

```bash
cd apps/web

# Sync content from Git
pnpm run content:sync

# Validate content files
pnpm run content:validate

# Generate content types
pnpm run content:types
```

## Инструменты Разработки

### Настройка VS Code

Установите рекомендуемые расширения:

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

Настройте параметры VS Code (`.vscode/settings.json`):

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

### DevTools Браузера

#### React Developer Tools

- Установите [React DevTools](https://react.dev/learn/react-developer-tools)
- Проверяйте дерево компонентов и пропсы
- Профилируйте производительность компонентов

#### Redux DevTools (для Zustand)

- Установите [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- Мониторьте изменения состояния
- Отладка с путешествием во времени

### Инструменты Базы Данных

#### Drizzle Studio

```bash
cd apps/web && pnpm run db:studio
```

- Визуальный браузер базы данных
- Интерфейс построителя запросов
- Визуализация схемы

#### pgAdmin (для PostgreSQL)

- Установите [pgAdmin](https://www.pgadmin.org/)
- Подключитесь к локальной базе данных
- Расширенные инструменты запросов

## Hot Reloading

Сервер разработки поддерживает hot reloading для:

- **Компоненты React** - Мгновенные обновления
- **Маршруты API** - Автоматический перезапуск
- **Tailwind CSS** - Обновления стилей в реальном времени
- **TypeScript** - Проверка типов в реальном времени

### Устранение Проблем с Hot Reload

Если hot reload перестал работать:

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Restart development server
pnpm run dev
```

## Переменные Среды

### Разработка vs Продакшен

Создайте разные файлы среды в `apps/web/`:

```bash
apps/web/.env.local          # Local development
apps/web/.env.development    # Development environment
apps/web/.env.staging        # Staging environment
apps/web/.env.production     # Production environment
```

### Валидация Переменных Среды

Приложение проверяет переменные среды при запуске:

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

## Настройка Тестирования

### Юнит-тестирование

```bash
# Run tests (from monorepo root)
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### E2E Тестирование

E2E тесты находятся в пакете workspace `apps/web-e2e/` (`@ever-works/web-e2e`).

```bash
# From the monorepo root
pnpm run --filter @ever-works/web-e2e test:e2e

# Or from the E2E directory
cd apps/web-e2e
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui
```

## Отладка

### Отладка на Стороне Сервера

Добавьте в `package.json`:

```json
{
	"scripts": {
		"dev:debug": "NODE_OPTIONS='--inspect' next dev"
	}
}
```

Затем подключите отладчик в VS Code или Chrome DevTools.

### Отладка на Стороне Клиента

Используйте DevTools браузера или добавьте точки останова:

```typescript
// Add debugger statement
debugger;

// Or use console methods
console.log('Debug info:', data);
console.table(items);
console.group('API Response');
```

### Отладка API

Включите логирование API:

```bash
# In apps/web/.env.local
DEBUG=api:*
LOG_LEVEL=debug
```

## Мониторинг Производительности

### Анализ Bundle

```bash
# Analyze bundle size (from apps/web/)
cd apps/web && pnpm run analyze
```

### Профилирование Производительности

```bash
# Enable React profiling
NEXT_PUBLIC_REACT_PROFILING=true pnpm run dev:web
```

## Распространённые Проблемы Разработки

### Порт Уже Используется

```bash
# Use different port
pnpm run dev:web -- -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Проблемы Разрешения Модулей

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

### Ошибки TypeScript

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check types manually
pnpm run type-check
```

### Проблемы Подключения к Базе Данных

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d everworks_dev
```

## Рабочий Процесс Разработки

### 1. Разработка Функциональности

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

### 2. Проверки Качества Кода

```bash
# Run all checks
pnpm run check

# Individual checks
pnpm run lint
pnpm run type-check
pnpm run test
pnpm run format:check
```

### 3. Изменения в Базе Данных

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

## Следующие Шаги

Ваша локальная среда разработки готова! Вы можете начать разработку своего приложения Ever Works.
