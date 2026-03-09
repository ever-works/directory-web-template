# Local Development Setup

This guide will help you set up a complete local development environment for the Ever Works.

## Prerequisites

Ensure you have the following installed:

- **Node.js 20.x or higher** - [Download](https://nodejs.org/)
- **pnpm** - [Install](https://pnpm.io/installation) (the monorepo package manager)
- **Git** - [Download](https://git-scm.com/)
- **PostgreSQL** (optional) - [Download](https://postgresql.org/)
- **Docker** (optional) - [Download](https://docker.com/)

## Development Environment Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/ever-works/ever-works-website-template.git
cd ever-works-website-template

# Install all dependencies from the monorepo root
pnpm install
```

### 2. Environment Configuration

Copy the example environment file into the web app directory:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Configure your `apps/web/.env.local` file:

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

### 3. Database Setup (Optional)

#### Option A: Local PostgreSQL

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

#### Option B: Docker PostgreSQL

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

#### Option C: Supabase

1. Create project at [Supabase](https://supabase.com)
2. Get connection string from Settings → Database
3. Update `DATABASE_URL` in `apps/web/.env.local`
4. Run migrations from `apps/web/`: `pnpm run db:migrate`

### 4. Content Repository Setup

#### Fork the Data Repository

1. Visit [awesome-data](https://github.com/ever-works/awesome-data)
2. Click "Fork" to create your copy
3. Update `DATA_REPOSITORY` in `apps/web/.env.local`

#### Generate GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:user`, `user:email`
4. Copy the generated token and add it to `GH_TOKEN` in `apps/web/.env.local`
5. **Important**: Never commit your token to version control

### 5. Start Development Server

```bash
# From the monorepo root — starts all apps (web, docs, etc.)
pnpm run dev

# Or start only the web app
pnpm run dev:web
```

Your application will be available at [http://localhost:3000](http://localhost:3000).

## Development Scripts

### Core Scripts (from monorepo root)

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

### Database Scripts (run from `apps/web/`)

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

### Content Scripts (run from `apps/web/`)

```bash
cd apps/web

# Sync content from Git
pnpm run content:sync

# Validate content files
pnpm run content:validate

# Generate content types
pnpm run content:types
```

## Development Tools

### VS Code Setup

Install recommended extensions:

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

Configure VS Code settings (`.vscode/settings.json`):

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

### Browser DevTools

#### React Developer Tools
- Install [React DevTools](https://react.dev/learn/react-developer-tools)
- Inspect component tree and props
- Profile component performance

#### Redux DevTools (for Zustand)
- Install [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- Monitor state changes
- Time-travel debugging

### Database Tools

#### Drizzle Studio
```bash
cd apps/web && pnpm run db:studio
```
- Visual database browser
- Query builder interface
- Schema visualization

#### pgAdmin (for PostgreSQL)
- Install [pgAdmin](https://www.pgadmin.org/)
- Connect to local database
- Advanced query tools

## Hot Reloading

The development server supports hot reloading for:

- **React components** - Instant updates
- **API routes** - Automatic restart
- **Tailwind CSS** - Live style updates
- **TypeScript** - Real-time type checking

### Troubleshooting Hot Reload

If hot reload stops working:

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Restart development server
pnpm run dev
```

## Environment Variables

### Development vs Production

Create different environment files inside `apps/web/`:

```bash
apps/web/.env.local          # Local development
apps/web/.env.development    # Development environment
apps/web/.env.staging        # Staging environment
apps/web/.env.production     # Production environment
```

### Environment Validation

The app validates environment variables on startup:

```typescript
// apps/web/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  AUTH_SECRET: z.string().min(32),
  GH_TOKEN: z.string().startsWith('ghp_'),
  DATABASE_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
```

## Testing Setup

### Unit Testing

```bash
# Run tests (from monorepo root)
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### E2E Testing

E2E tests live in the `apps/web-e2e/` workspace package (`@ever-works/web-e2e`).

```bash
# From the monorepo root
pnpm run --filter @ever-works/web-e2e test:e2e

# Or from the E2E directory
cd apps/web-e2e
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui
```

## Debugging

### Server-Side Debugging

Add to `package.json`:

```json
{
  "scripts": {
    "dev:debug": "NODE_OPTIONS='--inspect' next dev"
  }
}
```

Then attach debugger in VS Code or Chrome DevTools.

### Client-Side Debugging

Use browser DevTools or add breakpoints:

```typescript
// Add debugger statement
debugger;

// Or use console methods
console.log('Debug info:', data);
console.table(items);
console.group('API Response');
```

### API Debugging

Enable API logging:

```bash
# In apps/web/.env.local
DEBUG=api:*
LOG_LEVEL=debug
```

## Performance Monitoring

### Bundle Analysis

```bash
# Analyze bundle size (from apps/web/)
cd apps/web && pnpm run analyze
```

### Performance Profiling

```bash
# Enable React profiling
NEXT_PUBLIC_REACT_PROFILING=true pnpm run dev:web
```

## Common Development Issues

### Port Already in Use

```bash
# Use different port
pnpm run dev:web -- -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Module Resolution Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript Errors

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check types manually
pnpm run type-check
```

### Database Connection Issues

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d everworks_dev
```

## Development Workflow

### 1. Feature Development

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

### 2. Code Quality Checks

```bash
# Run all checks
pnpm run check

# Individual checks
pnpm run lint
pnpm run type-check
pnpm run test
pnpm run format:check
```

### 3. Database Changes

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

## Next Steps

Your local development environment is now ready! You can start developing your Ever Works application.
