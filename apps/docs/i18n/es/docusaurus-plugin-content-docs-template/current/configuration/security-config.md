---
id: security-config
title: "Configuración de Seguridad"
sidebar_label: "Conf. de Seguridad"
sidebar_position: 5
---

# Configuración de Seguridad

El template implementa una estrategia de seguridad en profundidad con control de acceso basado en permisos, validación de entrada, respuestas de error seguras y sanitización de URL. Esta guía documenta cada capa de seguridad y cómo configurarla.

## Sistema de Permisos

El template usa un modelo de permisos granular de recurso-acción definido en `lib/permissions/definitions.ts` y aplicado mediante `lib/middleware/permission-check.ts`.

### Formato de Permisos

Los permisos siguen el formato `resource:action`:

```
items:read
items:create
items:update
items:delete
items:review
items:approve
items:reject
categories:read
categories:create
users:assignRoles
analytics:read
system:settings
```

### Funciones de Verificación de Permisos

El middleware de permisos en `lib/middleware/permission-check.ts` proporciona un conjunto completo de helpers de autorización:

```ts
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasResourcePermission,
  canManageResource,
  canReviewItems,
  canManageUsers,
  canManageRoles,
  canViewAnalytics,
  isSuperAdmin
} from '@/lib/middleware/permission-check';

// Check a single permission
hasPermission(userPermissions, 'items:create');

// Check if user has ANY of the given permissions
hasAnyPermission(userPermissions, ['items:review', 'items:approve']);

// Check if user has ALL of the given permissions
hasAllPermissions(userPermissions, ['items:read', 'items:update']);

// Check a resource:action pair (with validation)
hasResourcePermission(userPermissions, 'items', 'delete');

// Get all permissions for a resource
const itemPerms = getResourcePermissions(userPermissions, 'items');
// e.g., ['items:read', 'items:create', 'items:update']

// Check if user can manage (create/update/delete) a resource
canManageResource(userPermissions, 'categories');
```

### Interfaz UserPermissions

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### Verificaciones Específicas por Rol

```ts
// Check if user can review items (review, approve, or reject)
canReviewItems(userPermissions);

// Check if user can manage users
canManageUsers(userPermissions);

// Check if user can manage roles
canManageRoles(userPermissions);

// Check if user can view analytics
canViewAnalytics(userPermissions);
```

### Detección de Super Administrador

La función `isSuperAdmin` verifica dos condiciones:

1. El usuario tiene el rol `'super-admin'` (preferido), O
2. El usuario posee todos los permisos del sistema (fallback)

```ts
export function isSuperAdmin(userPermissions: UserPermissions): boolean {
  if (userPermissions.roles.includes('super-admin')) {
    return true;
  }
  // Fallback: check if user has ALL system permissions
  const allPermissions: Permission[] = [
    'items:read', 'items:create', 'items:update', 'items:delete',
    'items:review', 'items:approve', 'items:reject',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'tags:read', 'tags:create', 'tags:update', 'tags:delete',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:assignRoles',
    'analytics:read', 'analytics:export',
    'system:settings'
  ];
  return hasAllPermissions(userPermissions, allPermissions);
}
```

### Validación de Permisos

```ts
// Validate a permission string is recognized
validatePermission('items:read'); // true
validatePermission('invalid:perm'); // false

// Parse a permission into resource and action
parsePermission('items:create');
// Returns: { resource: 'items', action: 'create' }

// Get a summary grouped by resource
getPermissionSummary(userPermissions);
// Returns: { items: ['read', 'create'], categories: ['read'], ... }
```

## Protección de Rutas de API

Las rutas de API usan autenticación basada en sesión con verificaciones del rol de administrador:

```ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  // Proceed with authorized logic...
}
```

## Validación de Entrada

El template usa esquemas Zod en toda la aplicación para la validación de entrada:

```ts
import { z } from 'zod';

const createNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  userId: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

// In API route
const body = await request.json();
const parsed = createNotificationSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
}
```

## Sanitización de URL

El módulo de editor incluye sanitización de URL en `lib/editor/utils/utils.ts`:

```ts
export function isAllowedUri(uri: string | undefined, protocols?: ProtocolConfig): boolean {
  const allowedProtocols = [
    "http", "https", "ftp", "ftps", "mailto", "tel",
    "callto", "sms", "cid", "xmpp"
  ];
  // Validates URI against whitelist and strips ATTR_WHITESPACE
  // ...
}

export function sanitizeUrl(inputUrl: string, baseUrl: string, protocols?: ProtocolConfig): string {
  try {
    const url = new URL(inputUrl, baseUrl);
    if (isAllowedUri(url.href, protocols)) return url.href;
  } catch { /* invalid URL */ }
  return "#";
}
```

Esto impide que `javascript:` y otras URL con protocolos peligrosos queden embebidas en el contenido del editor.

## Protección contra Contaminación de Prototipo

El `ConfigManager` protege contra la contaminación de prototipo al actualizar claves de configuración anidadas:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

async updateNestedKey(keyPath: string, value: any): Promise<boolean> {
  const keys = keyPath.split('.');
  for (const key of keys) {
    if (this.isPrototypePollutingKey(key)) {
      return false; // Silently reject
    }
  }
  // ...
}
```

## Seguridad de Cookies

La configuración de cookies se valida mediante un esquema Zod:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

Para producción, establezca:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## Cabeceras de Seguridad Next.js

El archivo `next.config.ts` configura las cabeceras de seguridad. Cabeceras comunes a establecer:

| Cabecera | Propósito |
|----------|-----------|
| `X-Frame-Options` | Prevenir clickjacking |
| `X-Content-Type-Options` | Prevenir MIME type sniffing |
| `Referrer-Policy` | Controlar información del referrer |
| `X-XSS-Protection` | Habilitar filtrado XSS del navegador |
| `Strict-Transport-Security` | Aplicar HTTPS |
| `Permissions-Policy` | Restringir funciones del navegador |

## Seguridad de Variables de Entorno

El sistema de configuración garantiza que las variables sensibles sean exclusivamente del lado del servidor:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

Las variables con el prefijo `NEXT_PUBLIC_` se exponen al cliente. Todas las demás (claves secretas, URLs de base de datos, tokens de API) permanecen exclusivamente del lado del servidor:

- `STRIPE_SECRET_KEY` -- solo del lado del servidor
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- seguro para el cliente
- `DATABASE_URL` -- solo del lado del servidor
- `AUTH_SECRET` -- solo del lado del servidor

## Mejores Prácticas

1. **Siempre validar la entrada** con esquemas Zod antes del procesamiento
2. **Verificar la autenticación** al inicio de cada handler de ruta de API
3. **Usar verificaciones de permisos** para el control de acceso basado en roles
4. **Sanitizar URLs** antes de incrustarlas en el contenido
5. **Mantener los secretos solo del lado del servidor** usando la protección de importación `server-only`
6. **Establecer `COOKIE_SECURE=true`** en producción
7. **Usar secretos fuertes** para `AUTH_SECRET` y `COOKIE_SECRET` (mínimo 32 bytes base64)
8. **Revisar el modelo de permisos** al agregar nuevos recursos o acciones

## Archivos Relacionados

| Ruta | Descripción |
|------|-------------|
| `lib/middleware/permission-check.ts` | Funciones de aplicación de permisos |
| `lib/permissions/definitions.ts` | Definiciones de permisos y roles |
| `lib/config/config-service.ts` | Singleton de configuración solo servidor |
| `lib/config/schemas/auth.schema.ts` | Esquemas de configuración de auth/cookie |
| `lib/editor/utils/utils.ts` | Utilidades de sanitización de URL |
| `lib/config-manager.ts` | Manager YAML de configuración con protección contra contaminación de prototipo |
| `auth.config.ts` | Configuración de NextAuth |
| `next.config.ts` | Cabeceras de seguridad y CSP |
