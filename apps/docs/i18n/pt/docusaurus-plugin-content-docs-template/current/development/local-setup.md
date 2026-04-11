# Configuração de Desenvolvimento Local

Este guia ajudará você a configurar um ambiente de desenvolvimento local completo para o Ever Works.

## Pré-requisitos

Certifique-se de ter os seguintes itens instalados:

- **Node.js 20.x ou superior** - [Download](https://nodejs.org/)
- **pnpm** - [Instalar](https://pnpm.io/installation) (o gerenciador de pacotes do monorepo)
- **Git** - [Download](https://git-scm.com/)
- **PostgreSQL** (opcional) - [Download](https://postgresql.org/)
- **Docker** (opcional) - [Download](https://docker.com/)

## Configuração do Ambiente de Desenvolvimento

### 1. Clonar e Instalar

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Install all dependencies from the monorepo root
pnpm install
```

### 2. Configuração do Ambiente

Copie o arquivo de ambiente de exemplo para o diretório do aplicativo web:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Configure seu arquivo `apps/web/.env.local`:

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

### 3. Configuração do Banco de Dados (Opcional)

#### Opção A: PostgreSQL Local

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

#### Opção B: Docker PostgreSQL

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

#### Opção C: Supabase

1. Crie um projeto em [Supabase](https://supabase.com)
2. Obtenha a string de conexão em Configurações → Banco de Dados
3. Atualize `DATABASE_URL` em `apps/web/.env.local`
4. Execute as migrações em `apps/web/`: `pnpm run db:migrate`

### 4. Configuração do Repositório de Conteúdo

#### Faça um Fork do Repositório de Dados

1. Visite [awesome-data](https://github.com/ever-works/awesome-data)
2. Clique em "Fork" para criar sua cópia
3. Atualize `DATA_REPOSITORY` em `apps/web/.env.local`

#### Gere um Token do GitHub

1. Acesse GitHub Settings → Developer settings → Personal access tokens
2. Gere um novo token (clássico)
3. Selecione os escopos: `repo`, `read:user`, `user:email`
4. Copie o token gerado e adicione-o a `GH_TOKEN` em `apps/web/.env.local`
5. **Importante**: Nunca faça commit do seu token no controle de versão

### 5. Iniciar o Servidor de Desenvolvimento

```bash
# From the monorepo root — starts all apps (web, docs, etc.)
pnpm run dev

# Or start only the web app
pnpm run dev:web
```

Seu aplicativo estará disponível em [http://localhost:3000](http://localhost:3000).

## Scripts de Desenvolvimento

### Scripts Principais (a partir da raiz do monorepo)

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

### Scripts de Banco de Dados (execute em `apps/web/`)

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

### Scripts de Conteúdo (execute em `apps/web/`)

```bash
cd apps/web

# Sync content from Git
pnpm run content:sync

# Validate content files
pnpm run content:validate

# Generate content types
pnpm run content:types
```

## Ferramentas de Desenvolvimento

### Configuração do VS Code

Instale as extensões recomendadas:

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

Configure as configurações do VS Code (`.vscode/settings.json`):

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

### DevTools do Navegador

#### React Developer Tools

- Instale o [React DevTools](https://react.dev/learn/react-developer-tools)
- Inspecione a árvore de componentes e props
- Faça perfil do desempenho dos componentes

#### Redux DevTools (para Zustand)

- Instale o [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- Monitore mudanças de estado
- Depuração com viagem no tempo

### Ferramentas de Banco de Dados

#### Drizzle Studio

```bash
cd apps/web && pnpm run db:studio
```

- Navegador visual do banco de dados
- Interface de construção de consultas
- Visualização de esquema

#### pgAdmin (para PostgreSQL)

- Instale o [pgAdmin](https://www.pgadmin.org/)
- Conecte-se ao banco de dados local
- Ferramentas avançadas de consulta

## Hot Reloading

O servidor de desenvolvimento suporta hot reloading para:

- **Componentes React** - Atualizações instantâneas
- **Rotas de API** - Reinicialização automática
- **Tailwind CSS** - Atualizações de estilo em tempo real
- **TypeScript** - Verificação de tipos em tempo real

### Solução de Problemas de Hot Reload

Se o hot reload parar de funcionar:

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Restart development server
pnpm run dev
```

## Variáveis de Ambiente

### Desenvolvimento vs Produção

Crie diferentes arquivos de ambiente dentro de `apps/web/`:

```bash
apps/web/.env.local          # Local development
apps/web/.env.development    # Development environment
apps/web/.env.staging        # Staging environment
apps/web/.env.production     # Production environment
```

### Validação de Variáveis de Ambiente

O aplicativo valida as variáveis de ambiente na inicialização:

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

## Configuração de Testes

### Testes Unitários

```bash
# Run tests (from monorepo root)
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### Testes E2E

Os testes E2E ficam no pacote de workspace `apps/web-e2e/` (`@ever-works/web-e2e`).

```bash
# From the monorepo root
pnpm run --filter @ever-works/web-e2e test:e2e

# Or from the E2E directory
cd apps/web-e2e
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui
```

## Depuração

### Depuração do Lado do Servidor

Adicione ao `package.json`:

```json
{
	"scripts": {
		"dev:debug": "NODE_OPTIONS='--inspect' next dev"
	}
}
```

Em seguida, conecte o depurador no VS Code ou Chrome DevTools.

### Depuração do Lado do Cliente

Use o DevTools do navegador ou adicione pontos de interrupção:

```typescript
// Add debugger statement
debugger;

// Or use console methods
console.log('Debug info:', data);
console.table(items);
console.group('API Response');
```

### Depuração de API

Habilite o log de API:

```bash
# In apps/web/.env.local
DEBUG=api:*
LOG_LEVEL=debug
```

## Monitoramento de Desempenho

### Análise de Bundle

```bash
# Analyze bundle size (from apps/web/)
cd apps/web && pnpm run analyze
```

### Perfil de Desempenho

```bash
# Enable React profiling
NEXT_PUBLIC_REACT_PROFILING=true pnpm run dev:web
```

## Problemas Comuns de Desenvolvimento

### Porta Já Em Uso

```bash
# Use different port
pnpm run dev:web -- -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Problemas de Resolução de Módulo

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

### Erros de TypeScript

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check types manually
pnpm run type-check
```

### Problemas de Conexão com o Banco de Dados

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d everworks_dev
```

## Fluxo de Trabalho de Desenvolvimento

### 1. Desenvolvimento de Funcionalidade

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

### 2. Verificações de Qualidade de Código

```bash
# Run all checks
pnpm run check

# Individual checks
pnpm run lint
pnpm run type-check
pnpm run test
pnpm run format:check
```

### 3. Mudanças no Banco de Dados

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

## Próximos Passos

Seu ambiente de desenvolvimento local está pronto! Você pode começar a desenvolver seu aplicativo Ever Works.
