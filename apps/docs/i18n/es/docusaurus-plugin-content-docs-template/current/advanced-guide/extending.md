---
id: extending
title: Ampliando la plantilla
sidebar_label: Extensión
sidebar_position: 9
---

# Ampliando la plantilla

Esta guía cubre cómo ampliar la plantilla Ever Works con nuevas páginas, rutas API, tablas de bases de datos, enlaces personalizados, secciones de administración e integraciones de terceros. Cada extensión sigue la arquitectura en capas de la plantilla.

## Arquitectura de proyecto para extensiones

La plantilla utiliza una estricta separación de capas:

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

**Principio clave**: la lógica empresarial pertenece a `lib/services/` o `lib/repositories/` , no a los componentes ni a los controladores de ruta API.

## Agregar nuevas páginas

### Página localizada

Cree páginas en `app/[locale]/` para beneficiarse del enrutamiento local automático:

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

El diseño en `app/[locale]/layout.tsx` ajusta automáticamente cada página con:

- `NextIntlClientProvider` para traducciones del lado del cliente
- `SettingsProvider` para indicadores de funciones y configuración
- `Providers` para tema, React Query y HeroUI
- Metadatos SEO y datos estructurados.

### Generación de parámetros estáticos

Para páginas que deben generarse estáticamente, exporte `generateStaticParams` :

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

El diseño raíz ya genera parámetros estáticos para la configuración regional predeterminada. Las configuraciones regionales adicionales se representan bajo demanda.

## Agregar nuevas rutas API

### Ruta DESCANSO Básica

Cree rutas API en `app/api/` . Siga el patrón de manejadores ligeros que delegan en servicios:

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

### Ruta dinámica con parámetros

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

## Agregar nuevas tablas de base de datos

### Paso 1: definir el esquema

Añade tu tabla a `lib/db/schema.ts` , siguiendo los patrones existentes:

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

### Paso 2: Generar y aplicar la migración

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### Paso 3: Crear definiciones de tipo

Derive tipos del esquema usando la inferencia de Drizzle:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### Paso 4: crear un repositorio

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

### Paso 5: crear un servicio

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

## Agregar ganchos personalizados

### Gancho de obtención de datos de consulta de reacción

Cree enlaces en el directorio `hooks/` siguiendo la convención de nomenclatura existente ( `use-<resource>.ts` ):

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

La plantilla tiene más de 100 ganchos en el directorio `hooks/` . Estudie ganchos existentes como `use-admin-items.ts` o `use-favorites.ts` para patrones que incluyen paginación, actualizaciones optimistas y manejo de errores.

## Agregar nuevas secciones de administración

### Paso 1: Definir permisos

Actualización `lib/permissions/definitions.ts` :

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

### Paso 2: crear la página de administración

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

El sistema de verificación de permisos en `lib/middleware/permission-check.ts` proporciona ayuda:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### Paso 3: Agregar a la navegación de administrador

Agregue su sección a la barra lateral de administración o al componente de navegación para que aparezca en el panel de administración.

## Agregar traducciones

### Paso 1: Agregar claves a los archivos locales

Agregue claves a `messages/en.json` y todos los demás archivos locales:

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

La plantilla admite 21 configuraciones regionales. Como mínimo, agregue claves a `en.json` . La configuración de solicitud en `i18n/request.ts` usa `deepmerge` para fusionar mensajes específicos de la configuración regional con los valores predeterminados en inglés:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Las claves que falten en configuraciones regionales que no sean inglesas volverán al valor en inglés.

### Paso 2: Uso en componentes

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

## Lista de verificación de extensión

| Capa | Tarea | Ubicación |
|-------|------|----------|
| Esquema | Definir tabla | `lib/db/schema.ts` |
| Migración | Generar SQL | `pnpm db:generate` |
| Tipos | Tipos de TypeScript | `types/` |
| Repositorio | Acceso a datos | `lib/repositories/` |
| Servicio | Lógica empresarial | `lib/services/` |
| Validación | Esquemas Zod | `lib/validations/` |
| API | Puntos finales REST | `app/api/` |
| Ganchos | Obtención de datos del cliente | `hooks/` |
| Componentes | Elementos de la interfaz de usuario | `components/` |
| Páginas | Páginas de ruta | `app/[locale]/` |
| Administrador | Página de gestión | `app/[locale]/admin/` |
| Permisos | RBAC | `lib/permissions/definitions.ts` |
| Traducciones | llaves i18n | `messages/` |
| Verificar | Verificación de tipo y pelusa | `pnpm tsc --noEmit && pnpm lint` |

## Mejores prácticas

1. **Siga los patrones existentes**: estudie elementos, categorías y usuarios antes de crear nuevas funciones.
2. **Mantenga las rutas reducidas**: valide la entrada, llame a un servicio, devuelva la respuesta
3. **Validar con Zod**: todas las entradas externas pasan por los esquemas de Zod
4. **Prefiere componentes del servidor**: solo agrega `"use client"` cuando se necesita interactividad
5. **Utilice importaciones dinámicas para módulos de servidor**: evita problemas de agrupación de paquetes web en instrumentación y trabajos en segundo plano.
6. **Confirmar archivos de migración**: otros desarrolladores y CI los necesitan
7. **Escriba todo** - evite `any` ; derivar tipos del esquema Drizzle con `InferSelectModel` 8. **Agregar traducciones**: nunca codifique cadenas en inglés en los componentes
