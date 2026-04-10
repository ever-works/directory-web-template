---
id: security-config
title: "Configurazione Sicurezza"
sidebar_label: "Conf. Sicurezza"
sidebar_position: 5
---

# Configurazione Sicurezza

Il template implementa una strategia di sicurezza defense-in-depth con controllo degli accessi basato sui permessi, validazione degli input, risposte agli errori sicure e sanitizzazione degli URL. Questa guida documenta ogni livello di sicurezza e come configurarlo.

## Sistema di Autorizzazioni

Il template utilizza un modello di permessi granulare risorsa-azione definito in `lib/permissions/definitions.ts` e applicato tramite `lib/middleware/permission-check.ts`.

### Formato delle Autorizzazioni

I permessi seguono il formato `resource:action`:

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

### Funzioni di Controllo Autorizzazioni

Il middleware per i permessi in `lib/middleware/permission-check.ts` fornisce un set completo di helper per l'autorizzazione:

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

### Interfaccia UserPermissions

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### Controlli Specifici per Ruolo

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

### Rilevamento Super Admin

La funzione `isSuperAdmin` verifica due condizioni:

1. L'utente ha il ruolo `'super-admin'` (preferito), OPPURE
2. L'utente possiede ogni permesso di sistema (fallback)

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

### Validazione Autorizzazioni

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

## Protezione delle Route API

Le route API utilizzano l'autenticazione basata su sessione con controlli del ruolo admin:

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

## Validazione dell'Input

Il template utilizza schemi Zod in tutta l'applicazione per la validazione degli input:

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

## Sanificazione URL

Il modulo editor include la sanificazione degli URL in `lib/editor/utils/utils.ts`:

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

Questo impedisce che `javascript:` e altri URL con protocolli pericolosi vengano incorporati nei contenuti dell'editor.

## Protezione da Prototype Pollution

Il `ConfigManager` protegge dalla prototype pollution durante l'aggiornamento di chiavi di configurazione annidate:

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

## Sicurezza dei Cookie

La configurazione dei cookie viene validata tramite schema Zod:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

Per la produzione, impostare:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## Header di Sicurezza Next.js

Il file `next.config.ts` configura gli header di sicurezza. Header comuni da impostare:

| Header | Scopo |
|--------|-------|
| `X-Frame-Options` | Prevenire il clickjacking |
| `X-Content-Type-Options` | Prevenire il MIME type sniffing |
| `Referrer-Policy` | Controllare le informazioni del referrer |
| `X-XSS-Protection` | Abilitare il filtro XSS del browser |
| `Strict-Transport-Security` | Applicare HTTPS |
| `Permissions-Policy` | Limitare le funzionalità del browser |

## Sicurezza delle Variabili d'Ambiente

Il sistema di configurazione garantisce che le variabili sensibili siano solo lato server:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

Le variabili con prefisso `NEXT_PUBLIC_` sono esposte al client. Tutte le altre (chiavi segrete, URL del database, token API) rimangono esclusivamente lato server:

- `STRIPE_SECRET_KEY` -- solo lato server
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- sicuro per il client
- `DATABASE_URL` -- solo lato server
- `AUTH_SECRET` -- solo lato server

## Best Practice

1. **Validare sempre l'input** con schemi Zod prima dell'elaborazione
2. **Controllare l'autenticazione** all'inizio di ogni handler di route API
3. **Usare i controlli dei permessi** per il controllo degli accessi basato sui ruoli
4. **Sanitizzare gli URL** prima di incorporarli nei contenuti
5. **Mantenere i segreti solo lato server** usando la protezione `server-only`
6. **Impostare `COOKIE_SECURE=true`** in produzione
7. **Usare segreti forti** per `AUTH_SECRET` e `COOKIE_SECRET` (minimo 32 byte base64)
8. **Revisionare il modello dei permessi** quando si aggiungono nuove risorse o azioni

## File Correlati

| Percorso | Descrizione |
|----------|-------------|
| `lib/middleware/permission-check.ts` | Funzioni di applicazione dei permessi |
| `lib/permissions/definitions.ts` | Definizioni di permessi e ruoli |
| `lib/config/config-service.ts` | Singleton di configurazione solo server |
| `lib/config/schemas/auth.schema.ts` | Schemi di configurazione auth/cookie |
| `lib/editor/utils/utils.ts` | Utility di sanificazione URL |
| `lib/config-manager.ts` | Manager YAML di configurazione con protezione da prototype pollution |
| `auth.config.ts` | Configurazione NextAuth |
| `next.config.ts` | Header di sicurezza e CSP |
