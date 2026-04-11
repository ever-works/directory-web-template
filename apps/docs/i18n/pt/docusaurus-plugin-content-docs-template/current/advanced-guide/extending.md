---
id: extending
title: Estendendo o modelo
sidebar_label: Estendendo
sidebar_position: 9
---

# Estendendo o modelo

Este guia aborda como estender o modelo Ever Works com novas páginas, rotas de API, tabelas de banco de dados, ganchos personalizados, seções administrativas e integrações de terceiros. Cada extensão segue a arquitetura em camadas do modelo.

## Arquitetura de Projeto para Extensões

O modelo usa uma separação estrita de camadas:

```
app/             -- Routes and pages (thin, data-fetching layer)
  [locale]/      -- Localized pages under App Router
  api/           -- API route handlers
components/      -- React components (presentational + interactive)
hooks/           -- Custom React hooks (client-side data fetching)
lib/
  db/            -- Schema definitions, connection, migrations
  repositories/  -- Data access layer (queries)
  services/      -- Business logic layer
  middleware/     -- Permission checks, validation
  permissions/   -- RBAC permission definitions
  validations/   -- Zod schemas for input validation
  background-jobs/ -- Scheduled and triggered tasks
utils/           -- Pure utility functions
types/           -- Shared TypeScript type definitions
messages/        -- Translation files (one per locale)
```

**Princípio chave**: A lógica de negócios pertence a `lib/services/` ou `lib/repositories/` , não a componentes ou manipuladores de rotas de API.

## Adicionando novas páginas

### Página localizada

Crie páginas em `app/[locale]/` para se beneficiar do roteamento automático de localidade:

```typescript
// app/[locale]/projects/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';

export default async function ProjectsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('projects');

  return (
    <div>
      <h1>{t('title')}</h1>
      {/* Page content */}
    </div>
  );
}
```

O layout em `app/[locale]/layout.tsx` envolve automaticamente cada página com:

- `NextIntlClientProvider` para traduções do lado do cliente
- `SettingsProvider` para sinalizadores de recursos e configuração
- `Providers` para tema, React Query e HeroUI
- Metadados de SEO e dados estruturados

### Geração de parâmetros estáticos

Para páginas que devem ser geradas estaticamente, exporte `generateStaticParams` :

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

O layout raiz já gera parâmetros estáticos para a localidade padrão. Locais adicionais são renderizados sob demanda.

## Adicionando novas rotas de API

### Rota REST básica

Crie rotas de API em `app/api/` . Siga o padrão de thin handlers que delegam aos serviços:

```typescript
// app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { projectService } from '@/lib/services/project.service';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projects = await projectService.getUserProjects(session.user.id);
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const project = await projectService.createProject(
    session.user.id,
    parsed.data
  );
  return NextResponse.json(project, { status: 201 });
}
```

### Rota Dinâmica com Parâmetros

```typescript
// app/api/projects/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { projectRepository } from '@/lib/repositories/project.repository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const project = await projectRepository.findById(id);

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}
```

## Adicionando novas tabelas de banco de dados

### Etapa 1: Definir o esquema

Adicione sua tabela a `lib/db/schema.ts` , seguindo os padrões existentes:

```typescript
export const projects = pgTable(
  'projects',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    description: text('description'),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    status: text('status', {
      enum: ['draft', 'active', 'archived']
    }).default('draft'),
    isPublic: boolean('is_public').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    ownerIndex: index('projects_owner_id_idx').on(table.ownerId),
    statusIndex: index('projects_status_idx').on(table.status),
  })
);
```

### Etapa 2: Gerar e aplicar migração

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### Etapa 3: Criar definições de tipo

Derive tipos do esquema usando a inferência de Drizzle:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### Etapa 4: Crie um repositório

```typescript
// lib/repositories/project.repository.ts
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { NewProject, Project } from '@/types/project';

export class ProjectRepository {
  async findById(id: string): Promise<Project | undefined> {
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return result[0];
  }

  async findByOwner(ownerId: string): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, ownerId));
  }

  async create(data: NewProject): Promise<Project> {
    const result = await db
      .insert(projects)
      .values(data)
      .returning();
    return result[0];
  }

  async update(
    id: string,
    data: Partial<NewProject>
  ): Promise<Project> {
    const result = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }
}

export const projectRepository = new ProjectRepository();
```

### Etapa 5: Crie um serviço

```typescript
// lib/services/project.service.ts
import { projectRepository } from '@/lib/repositories/project.repository';
import type { NewProject } from '@/types/project';

export class ProjectService {
  async createProject(
    ownerId: string,
    data: Omit<NewProject, 'ownerId'>
  ) {
    if (!data.name?.trim()) {
      throw new Error('Project name is required');
    }
    return projectRepository.create({ ...data, ownerId });
  }

  async getUserProjects(userId: string) {
    return projectRepository.findByOwner(userId);
  }
}

export const projectService = new ProjectService();
```

## Adicionando ganchos personalizados

### Gancho de busca de dados de consulta React

Crie ganchos no diretório `hooks/` seguindo a convenção de nomenclatura existente ( `use-<resource>.ts` ):

```typescript
// hooks/use-projects.ts
'use client';

import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';
import type { Project, NewProject } from '@/types/project';

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NewProject, 'ownerId'>) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

O modelo possui mais de 100 ganchos no diretório `hooks/` . Estude ganchos existentes como `use-admin-items.ts` ou `use-favorites.ts` para padrões incluindo paginação, atualizações otimistas e tratamento de erros.

## Adicionando novas seções administrativas

### Etapa 1: Definir permissões

Atualização `lib/permissions/definitions.ts` :

```typescript
export const PERMISSIONS = {
  // ... existing permissions
  projects: {
    read: 'projects:read',
    create: 'projects:create',
    update: 'projects:update',
    delete: 'projects:delete',
  },
} as const;
```

### Etapa 2: Crie a página de administração

```typescript
// app/[locale]/admin/projects/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/middleware/permission-check';

export default async function AdminProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');

  const userPerms = {
    userId: session.user.id,
    roles: session.user.roles || [],
    permissions: session.user.permissions || [],
  };

  if (!hasPermission(userPerms, 'projects:read')) {
    redirect('/unauthorized');
  }

  return (
    <div>
      <h1>Project Management</h1>
      {/* Admin data table, filters, actions */}
    </div>
  );
}
```

O sistema de verificação de permissão em `lib/middleware/permission-check.ts` fornece ajudantes:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### Etapa 3: Adicionar à navegação do administrador

Adicione sua seção à barra lateral do administrador ou ao componente de navegação para que apareça no painel do administrador.

## Adicionando traduções

### Etapa 1: Adicionar chaves aos arquivos de localidade

Adicione chaves a `messages/en.json` e todos os outros arquivos de localidade:

```json
{
  "projects": {
    "title": "Projects",
    "create": "Create Project",
    "name": "Project Name",
    "description": "Description",
    "status": {
      "draft": "Draft",
      "active": "Active",
      "archived": "Archived"
    }
  }
}
```

O modelo oferece suporte a 21 localidades. No mínimo, adicione chaves a `en.json` . A configuração da solicitação em `i18n/request.ts` usa `deepmerge` para mesclar mensagens específicas de localidade com padrões em inglês:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Chaves ausentes em localidades que não sejam o inglês retornarão ao valor em inglês.

### Etapa 2: uso em componentes

```typescript
import { useTranslations } from 'next-intl';

export function ProjectForm() {
  const t = useTranslations('projects');
  return (
    <form>
      <label>{t('name')}</label>
      <input type="text" placeholder={t('name')} />
    </form>
  );
}
```

## Lista de verificação de extensão

| Camada | Tarefa | Localização |
|-------|------|----------|
| Esquema | Definir tabela | `lib/db/schema.ts` |
| Migração | Gerar SQL | `pnpm db:generate` |
| Tipos | Tipos de TypeScript | `types/` |
| Repositório | Acesso a dados | `lib/repositories/` |
| Serviço | Lógica de negócios | `lib/services/` |
| Validação | Esquemas Zod | `lib/validations/` |
| API | Pontos de extremidade REST | `app/api/` |
| Ganchos | Busca de dados do cliente | `hooks/` |
| Componentes | Elementos da interface do usuário | `components/` |
| Páginas | Páginas de rota | `app/[locale]/` |
| Administrador | Página de gerenciamento | `app/[locale]/admin/` |
| Permissões | RBAC | `lib/permissions/definitions.ts` |
| Traduções | chaves i18n | `messages/` |
| Verifique | Digite check e lint | `pnpm tsc --noEmit && pnpm lint` |

## Melhores práticas

1. **Siga os padrões existentes** – estude itens, categorias e usuários antes de criar novos recursos
2. **Mantenha as rotas estreitas** – valide a entrada, chame um serviço, retorne a resposta
3. **Validar com Zod** – todas as entradas externas passam por esquemas Zod
4. **Prefira componentes de servidor** – adicione `"use client"` apenas quando a interatividade for necessária
5. **Use importações dinâmicas para módulos de servidor** - evita problemas de empacotamento de webpack em instrumentação e trabalhos em segundo plano
6. **Comprometer arquivos de migração** – outros desenvolvedores e CI precisam deles
7. **Digite tudo** -- evite `any` ; derivar tipos do esquema Drizzle com `InferSelectModel` 8. **Adicionar traduções** - nunca codifique strings em inglês em componentes
