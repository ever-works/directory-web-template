---
id: security
title: Refuerzo de seguridad
sidebar_label: Seguridad
sidebar_position: 6
---

# Refuerzo de seguridad

La plantilla Ever Works incluye varias capas de seguridad de forma predeterminada. Esta guía documenta las protecciones integradas y proporciona recomendaciones para reforzar aún más su implementación de producción.

## Encabezados de seguridad

La plantilla configura encabezados de seguridad globalmente en `next.config.ts` para todas las rutas:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: "..." },
      ],
    },
  ];
},
```

### Desglose del encabezado

| Encabezado | Valor | Propósito |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Previene ataques de rastreo tipo MIME |
| `X-Frame-Options` | `DENY` | Bloquea el sitio para que no se incruste en iframes (protección contra clickjacking) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita la información del referente enviada a orígenes externos |
| `X-DNS-Prefetch-Control` | `on` | Habilita la captación previa de DNS para mejorar el rendimiento |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Aplica HTTPS durante aproximadamente 2 años, cubre todos los subdominios y es elegible para la lista de precarga de HSTS |
| `Content-Security-Policy` | Ver abajo | Restringe las fuentes de carga de recursos |

### Política de seguridad de contenido

El CSP está configurado como:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| Directiva | Valor | Notas |
|---|---|---|
| `default-src` | `'self'` | Permitir solo recursos del mismo origen de forma predeterminada |
| `script-src` | `'self' 'unsafe-inline'` + LemonSqueezy | Requerido para scripts en línea y widget de pago |
| `style-src` | `'self' 'unsafe-inline'` | Requerido para CSS-in-JS y Tailwind |
| `img-src` | `'self' data: https:` | Permite imágenes del mismo origen, URI de datos y cualquier fuente HTTPS |
| `font-src` | `'self'` | Solo fuentes autohospedadas |
| `connect-src` | `'self' https:` | Llamadas API al mismo origen y a cualquier punto final HTTPS |
| `frame-ancestors` | `'none'` | Evita la incrustación en cualquier iframe (equivalente a `X-Frame-Options: DENY` ) |

### Seguridad de imágenes SVG

Las imágenes SVG reciben sandboxing adicional:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

Los SVG se sirven como archivos adjuntos con scripts completamente deshabilitados y protegidos, lo que evita ataques XSS basados ​​en SVG.

### Endurecimiento adicional

El `poweredByHeader` está deshabilitado:

```typescript
poweredByHeader: false,
```

Esto elimina el encabezado `X-Powered-By: Next.js` , evitando la toma de huellas digitales de la tecnología.

## Seguridad de autenticación

### Integración de NextAuth.js

La plantilla utiliza NextAuth.js (Auth.js) para la autenticación. Las características clave de seguridad incluyen:

- **JWT o sesiones de base de datos** con estrategia de sesión configurable
- **Protección CSRF** en todos los envíos de formularios
- **Configuración de cookies segura** con indicadores `httpOnly` , `secure` y `sameSite` - **Validación de entrada** con esquemas Zod en todas las acciones del formulario

### Acciones validadas

Las acciones del servidor están protegidas mediante envoltorios de acciones validados definidos en `lib/auth/middleware.ts` :

```typescript
// Validate input with Zod before processing
export function validatedAction<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData);
  };
}

// Validate input AND require authentication
export function validatedActionWithUser<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("User is not authenticated");
    }
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData, session.user);
  };
}
```

**Utilice siempre `validatedActionWithUser` ** para operaciones autenticadas. Esto garantiza que tanto la validación de entrada como la verificación de la sesión se produzcan antes de que se ejecute cualquier lógica empresarial.

## Aplicación de la RBAC

La plantilla incluye un sistema completo de control de acceso basado en roles en `lib/middleware/permission-check.ts` .

### Formato de permiso

Los permisos siguen un patrón `resource:action` :

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### Funciones de verificación de permisos

| Función | Propósito | Ejemplo |
|---|---|---|
| `hasPermission` | Verificar permiso único | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | Compruebe si el usuario tiene al menos uno | `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| `hasAllPermissions` | Compruebe si el usuario tiene todos los listados | `hasAllPermissions(user, ['users:read', 'users:update'])` |
| `hasResourcePermission` | Verificar por recurso + cadenas de acción | `hasResourcePermission(user, 'items', 'delete')` |
| `canManageResource` | Marque crear/actualizar/eliminar | `canManageResource(user, 'categories')` |
| `canReviewItems` | Verificar permisos de revisión de artículos | `canReviewItems(user)` |
| `canManageUsers` | Verificar permisos de gestión de usuarios | `canManageUsers(user)` |
| `canManageRoles` | Verifique los permisos de administración de roles | `canManageRoles(user)` |
| `canViewAnalytics` | Verificar acceso a análisis | `canViewAnalytics(user)` |
| `isSuperAdmin` | Verifique la función de superadministrador o todos los permisos | `isSuperAdmin(user)` |

### Uso de permisos en rutas API

```typescript
import { hasPermission, UserPermissions } from '@/lib/middleware/permission-check';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPerms: UserPermissions = {
    userId: session.user.id,
    roles: session.user.roles,
    permissions: session.user.permissions,
  };

  if (!hasPermission(userPerms, 'items:create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with authorized logic
}
```

### Detección de superadministrador

La función `isSuperAdmin` utiliza un enfoque dual para máxima seguridad:

1. **Verificación de rol**: Comprueba si el usuario tiene el rol `super-admin` .
2. **Reserva de permisos**: verifica que el usuario posee todos los permisos definidos del sistema.

Esto garantiza que ningún conjunto de permisos parcial pueda otorgar accidentalmente acceso de superadministrador.

## Limitación de velocidad

### Protección de ruta API

Implemente una limitación de velocidad para las rutas API públicas para evitar abusos:

```typescript
// Example using a simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

Para implementaciones de producción, considere usar:
- **Vercel Edge Middleware** con limitación de velocidad `@vercel/edge` - **Upstash Redis** para limitación de velocidad distribuida en instancias sin servidor
- **Límite de velocidad de Cloudflare** en la capa CDN

### Protección de punto final cron

Los puntos finales de la API de Cron deben verificar un secreto compartido para evitar invocaciones no autorizadas:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

El `CRON_SECRET` se establece mediante variables de entorno y se configura durante la implementación (consulte el flujo de trabajo de implementación de Vercel de la canalización de CI/CD).

## Validación de entrada

### Validación del esquema Zod

Todas las entradas de formularios y cargas útiles de API deben validarse con esquemas Zod:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### Prevención de inyección SQL

La plantilla utiliza Drizzle ORM para todas las consultas de la base de datos, que parametriza todos los valores automáticamente. Nunca construya cadenas SQL sin formato con la entrada del usuario.

### Prevención XSS

- Los componentes del servidor se procesan en el servidor y no exponen HTML sin formato al cliente.
- Todo el contenido generado por el usuario debe escaparse utilizando el escape integrado de React (JSX escapa automáticamente las cadenas).
- El encabezado CSP bloquea los scripts en línea de fuentes que no son de confianza.

## Seguridad de variables de entorno

### Secretos requeridos

| Variables | Propósito | Generación |
|---|---|---|
| `AUTH_SECRET` | Firma tokens JWT y cookies de sesión | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Cifra los valores de las cookies | `openssl rand -base64 32` |
| `CRON_SECRET` | Autentica solicitudes de punto final cron | `openssl rand -base64 32` |
| `DATABASE_URL` | Cadena de conexión a la base de datos | Proporcionado por el host de la base de datos |

### Mejores prácticas

1. **Nunca confirmes secretos** para el control de versiones. Utilice `.env.local` para desarrollo y secretos a nivel de plataforma para producción.
2. **Rote los secretos periódicamente**, especialmente `AUTH_SECRET` y `COOKIE_SECRET` .
3. **Utilice secretos separados por entorno**: no comparta secretos de producción con la puesta en escena o el desarrollo.
4. **Limite el acceso** a las variables del entorno de producción utilizando el RBAC de su plataforma (roles de equipo de Vercel, reglas de protección del entorno de GitHub).

## Lista de verificación de seguridad para la producción

| Categoría | Artículo | Estado |
|---|---|---|
| **Encabezados** | Todos los encabezados de seguridad configurados en `next.config.ts` | Incorporado |
| **Encabezados** | `poweredByHeader` deshabilitado | Incorporado |
| **Encabezados** | Precarga HSTS habilitada con una edad máxima de 2 años | Incorporado |
| **Autenticación** | `AUTH_SECRET` es un valor aleatorio fuerte | manuales |
| **Autenticación** | Las cookies de sesión utilizan `httpOnly` , `secure` , `sameSite` | Incorporado |
| **Autenticación** | Todas las acciones del servidor utilizan `validatedActionWithUser` | Revisión |
| **RBAC** | Permisos verificados en cada ruta protegida | Revisión |
| **RBAC** | El acceso de superadministrador requiere una asignación de roles explícita | Incorporado |
| **Entrada** | Validación de Zod en todas las entradas de formularios y cargas útiles de API | Revisión |
| **Entrada** | Sin consultas SQL sin formato (solo Drizzle ORM) | Revisión |
| **Cron** | Verificación de puntos finales cron `CRON_SECRET` | Revisión |
| **Secretos** | Todos los secretos rotados y específicos del entorno | manuales |
| **CSP** | Política de seguridad de contenido revisada para dominios de producción | manuales |
| **Departamentos** | El análisis de CodeQL se ejecuta semanalmente en el código base | Incorporado |
| **Departamentos** | Dependencias auditadas ( `pnpm audit` ) | manuales |

## Informar problemas de seguridad

Si descubre una vulnerabilidad de seguridad, infórmelo de forma privada:

- **Correo electrónico**: seguridad@ever.co
- **No** abra una incidencia pública de GitHub en busca de vulnerabilidades de seguridad.
- Incluir pasos de reproducción y evaluación de impacto cuando sea posible.
