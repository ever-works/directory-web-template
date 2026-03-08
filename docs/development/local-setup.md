# Local Development Setup

This guide will help you set up a complete local development environment for the Ever Works.

## Prerequisites

Ensure you have the following installed:

- **Node.js 20.x or higher** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **PostgreSQL** (optional) - [Download](https://postgresql.org/)
- **Docker** (optional) - [Download](https://docker.com/)

## Development Environment Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/ever-works/ever-works-website-template.git
cd ever-works-website-template

# Install dependencies
npm install

# Or using yarn/pnpm
yarn install
pnpm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure your `.env.local` file:

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

# Run migrations
npm run db:generate
npm run db:migrate

# Seed with sample data
npm run db:seed
```

#### Option B: Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=your_database_name \
  -p 5432:5432 \
  -d postgres:15

# Run migrations
npm run db:migrate
npm run db:seed
```

#### Option C: Supabase

1. Create project at [Supabase](https://supabase.com)
2. Get connection string from Settings → Database
3. Update `DATABASE_URL` in `.env.local`
4. Run migrations: `npm run db:migrate`

### 4. Content Repository Setup

#### Fork the Data Repository

1. Visit [awesome-data](https://github.com/ever-works/awesome-data)
2. Click "Fork" to create your copy
3. Update `DATA_REPOSITORY` in `.env.local`

#### Generate GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:user`, `user:email`
4. Copy the generated token and add it to `GH_TOKEN` in `.env.local`
5. **Important**: Never commit your token to version control

### 5. Start Development Server

```bash
npm run dev
```

Your application will be available at [http://localhost:3000](http://localhost:3000).

## Development Scripts

### Core Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check
```

### Database Scripts

```bash
# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset

# Seed database
npm run db:seed

# Open database studio
npm run db:studio
```

### Content Scripts

```bash
# Sync content from Git
npm run content:sync

# Validate content files
npm run content:validate

# Generate content types
npm run content:types
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
npm run db:studio
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
rm -rf .next

# Restart development server
npm run dev
```

## Environment Variables

### Development vs Production

Create different environment files:

```bash
.env.local          # Local development
.env.development    # Development environment
.env.staging        # Staging environment
.env.production     # Production environment
```

### Environment Validation

The app validates environment variables on startup:

```typescript
// lib/env.ts
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
# Install testing dependencies
npm install -D jest @testing-library/react @testing-library/jest-dom

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### E2E Testing

```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui
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
# In .env.local
DEBUG=api:*
LOG_LEVEL=debug
```

## Performance Monitoring

### Bundle Analysis

```bash
# Analyze bundle size
npm run analyze

# Check for duplicate dependencies
npm run check-duplicates
```

### Performance Profiling

```bash
# Enable React profiling
NEXT_PUBLIC_REACT_PROFILING=true npm run dev
```

## Common Development Issues

### Port Already in Use

```bash
# Use different port
npm run dev -- -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Module Resolution Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check types manually
npm run type-check
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
npm run dev
npm run test

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### 2. Code Quality Checks

```bash
# Run all checks
npm run check

# Individual checks
npm run lint
npm run type-check
npm run test
npm run format:check
```

### 3. Database Changes

```bash
# Create migration
npm run db:generate

# Apply migration
npm run db:migrate

# Test with seed data
npm run db:seed
```

## Next Steps

Your local development environment is now ready! You can start developing your Ever Works application.
