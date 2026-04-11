# Configuración de Desarrollo Local

Esta guía te ayudará a configurar un entorno de desarrollo local completo para Ever Works.

## Requisitos Previos

Asegúrate de tener instalado lo siguiente:

- **Node.js 20.x o superior** - [Descargar](https://nodejs.org/)
- **pnpm** - [Instalar](https://pnpm.io/installation) (el gestor de paquetes del monorepo)
- **Git** - [Descargar](https://git-scm.com/)
- **PostgreSQL** (opcional) - [Descargar](https://postgresql.org/)
- **Docker** (opcional) - [Descargar](https://docker.com/)

## Configuración del Entorno de Desarrollo

### 1. Clonar e Instalar

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Install all dependencies from the monorepo root
pnpm install
```

### 2. Configuración del Entorno

Copia el archivo de entorno de ejemplo al directorio de la aplicación web:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Configura tu archivo `apps/web/.env.local`:

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

### 3. Configuración de Base de Datos (Opcional)

#### Opción A: PostgreSQL Local

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

#### Opción B: Docker PostgreSQL

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

#### Opción C: Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Obtén la cadena de conexión en Configuración → Base de datos
3. Actualiza `DATABASE_URL` en `apps/web/.env.local`
4. Ejecuta las migraciones desde `apps/web/`: `pnpm run db:migrate`

### 4. Configuración del Repositorio de Contenido

#### Haz un Fork del Repositorio de Datos

1. Visita [awesome-data](https://github.com/ever-works/awesome-data)
2. Haz clic en "Fork" para crear tu copia
3. Actualiza `DATA_REPOSITORY` en `apps/web/.env.local`

#### Genera un Token de GitHub

1. Ve a GitHub Settings → Developer settings → Personal access tokens
2. Genera un nuevo token (clásico)
3. Selecciona los ámbitos: `repo`, `read:user`, `user:email`
4. Copia el token generado y agrégalo a `GH_TOKEN` en `apps/web/.env.local`
5. **Importante**: Nunca hagas commit de tu token al control de versiones

### 5. Iniciar el Servidor de Desarrollo

```bash
# From the monorepo root — starts all apps (web, docs, etc.)
pnpm run dev

# Or start only the web app
pnpm run dev:web
```

Tu aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Scripts de Desarrollo

### Scripts Principales (desde la raíz del monorepo)

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

### Scripts de Base de Datos (ejecutar desde `apps/web/`)

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

### Scripts de Contenido (ejecutar desde `apps/web/`)

```bash
cd apps/web

# Sync content from Git
pnpm run content:sync

# Validate content files
pnpm run content:validate

# Generate content types
pnpm run content:types
```

## Herramientas de Desarrollo

### Configuración de VS Code

Instala las extensiones recomendadas:

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

Configura los ajustes de VS Code (`.vscode/settings.json`):

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

### DevTools del Navegador

#### React Developer Tools

- Instala [React DevTools](https://react.dev/learn/react-developer-tools)
- Inspecciona el árbol de componentes y props
- Perfila el rendimiento de los componentes

#### Redux DevTools (para Zustand)

- Instala [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- Monitorea cambios de estado
- Depuración con viaje en el tiempo

### Herramientas de Base de Datos

#### Drizzle Studio

```bash
cd apps/web && pnpm run db:studio
```

- Explorador visual de la base de datos
- Interfaz de construcción de consultas
- Visualización del esquema

#### pgAdmin (para PostgreSQL)

- Instala [pgAdmin](https://www.pgadmin.org/)
- Conéctate a la base de datos local
- Herramientas avanzadas de consulta

## Hot Reloading

El servidor de desarrollo soporta hot reloading para:

- **Componentes React** - Actualizaciones instantáneas
- **Rutas API** - Reinicio automático
- **Tailwind CSS** - Actualizaciones de estilos en vivo
- **TypeScript** - Verificación de tipos en tiempo real

### Solución de Problemas de Hot Reload

Si el hot reload deja de funcionar:

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Restart development server
pnpm run dev
```

## Variables de Entorno

### Desarrollo vs Producción

Crea diferentes archivos de entorno dentro de `apps/web/`:

```bash
apps/web/.env.local          # Local development
apps/web/.env.development    # Development environment
apps/web/.env.staging        # Staging environment
apps/web/.env.production     # Production environment
```

### Validación de Variables de Entorno

La aplicación valida las variables de entorno al iniciar:

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

## Configuración de Pruebas

### Pruebas Unitarias

```bash
# Run tests (from monorepo root)
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### Pruebas E2E

Las pruebas E2E viven en el paquete de workspace `apps/web-e2e/` (`@ever-works/web-e2e`).

```bash
# From the monorepo root
pnpm run --filter @ever-works/web-e2e test:e2e

# Or from the E2E directory
cd apps/web-e2e
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui
```

## Depuración

### Depuración del Lado del Servidor

Agrega a `package.json`:

```json
{
	"scripts": {
		"dev:debug": "NODE_OPTIONS='--inspect' next dev"
	}
}
```

Luego adjunta el depurador en VS Code o Chrome DevTools.

### Depuración del Lado del Cliente

Usa el DevTools del navegador o agrega puntos de interrupción:

```typescript
// Add debugger statement
debugger;

// Or use console methods
console.log('Debug info:', data);
console.table(items);
console.group('API Response');
```

### Depuración de API

Habilita el registro de API:

```bash
# In apps/web/.env.local
DEBUG=api:*
LOG_LEVEL=debug
```

## Monitoreo de Rendimiento

### Análisis de Bundle

```bash
# Analyze bundle size (from apps/web/)
cd apps/web && pnpm run analyze
```

### Perfilado de Rendimiento

```bash
# Enable React profiling
NEXT_PUBLIC_REACT_PROFILING=true pnpm run dev:web
```

## Problemas Comunes de Desarrollo

### Puerto Ya en Uso

```bash
# Use different port
pnpm run dev:web -- -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Problemas de Resolución de Módulos

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

### Errores de TypeScript

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check types manually
pnpm run type-check
```

### Problemas de Conexión con la Base de Datos

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d everworks_dev
```

## Flujo de Trabajo de Desarrollo

### 1. Desarrollo de Funcionalidad

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

### 2. Verificaciones de Calidad de Código

```bash
# Run all checks
pnpm run check

# Individual checks
pnpm run lint
pnpm run type-check
pnpm run test
pnpm run format:check
```

### 3. Cambios en la Base de Datos

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

## Próximos Pasos

¡Tu entorno de desarrollo local está listo! Puedes comenzar a desarrollar tu aplicación Ever Works.
