---
id: security-config
title: "Beveiligingsconfiguratie"
sidebar_label: "Beveil.configuratie"
sidebar_position: 5
---

# Beveiligingsconfiguratie

Het template implementeert een defense-in-depth beveiligingsstrategie met op rechten gebaseerde toegangscontrole, invoervalidatie, veilige foutreacties en URL-opschoning. Deze gids documenteert elke beveiligingslaag en hoe deze te configureren.

## Rechtensysteem

Het template gebruikt een granulaire resource-actie rechtenmodel gedefinieerd in `lib/permissions/definitions.ts` en afgedwongen via `lib/middleware/permission-check.ts`.

### Rechtenformat

Rechten volgen het format `resource:action`:

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

### Rechtencontrolefuncties

De rechtenmiddleware in `lib/middleware/permission-check.ts` biedt een uitgebreide set autorisatiehulpfuncties:

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

### UserPermissions-interface

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### Rolspecifieke Controles

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

### Super-Admin-detectie

De functie `isSuperAdmin` controleert twee voorwaarden:

1. De gebruiker heeft de rol `'super-admin'` (voorkeur), OF
2. De gebruiker bezit alle systeemrechten (fallback)

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

### Rechtenvalidatie

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

## API-routebeveiliging

API-routes gebruiken sessiegebaseerde authenticatie met admin-rolcontroles:

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

## Invoervalidatie

Het template gebruikt doorlopend Zod-schema's voor invoervalidatie:

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

## URL-opschoning

De editormodule bevat URL-opschoning in `lib/editor/utils/utils.ts`:

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

Dit voorkomt dat `javascript:` en andere gevaarlijke protocol-URL's worden ingebed in editorinhoud.

## Beveiliging tegen Prototype-vervuiling

De `ConfigManager` beschermt tegen prototype-vervuiling bij het bijwerken van geneste configuratiesleutels:

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

## Cookiebeveiliging

De cookieconfiguratie wordt gevalideerd via een Zod-schema:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

Stel voor productie in:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## Next.js-beveiligingsheaders

Het bestand `next.config.ts` configureert beveiligingsheaders. Veelgebruikte headers om in te stellen:

| Header | Doel |
|--------|------|
| `X-Frame-Options` | Clickjacking voorkomen |
| `X-Content-Type-Options` | MIME-type sniffing voorkomen |
| `Referrer-Policy` | Referrer-informatie beheren |
| `X-XSS-Protection` | Browser-XSS-filtering inschakelen |
| `Strict-Transport-Security` | HTTPS afdwingen |
| `Permissions-Policy` | Browserfuncties beperken |

## Beveiliging van omgevingsvariabelen

Het configuratiesysteem zorgt ervoor dat gevoelige variabelen alleen server-side beschikbaar zijn:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

Variabelen met het prefix `NEXT_PUBLIC_` worden blootgesteld aan de client. Alle andere (geheime sleutels, database-URL's, API-tokens) blijven uitsluitend server-side:

- `STRIPE_SECRET_KEY` -- alleen server-side
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- veilig voor client
- `DATABASE_URL` -- alleen server-side
- `AUTH_SECRET` -- alleen server-side

## Best Practices

1. **Valideer altijd invoer** met Zod-schema's voor verwerking
2. **Controleer authenticatie** bovenaan elke API-route-handler
3. **Gebruik rechtencontroles** voor rolgebaseerde toegangscontrole
4. **Reinig URL's** voordat ze in inhoud worden ingebed
5. **Houd geheimen server-only** met de `server-only`-importbeveiliging
6. **Stel `COOKIE_SECURE=true` in** in productie
7. **Gebruik sterke geheimen** voor `AUTH_SECRET` en `COOKIE_SECRET` (minimaal 32 bytes base64)
8. **Bekijk het rechtenmodel** bij het toevoegen van nieuwe resources of acties

## Gerelateerde bestanden

| Pad | Beschrijving |
|-----|-------------|
| `lib/middleware/permission-check.ts` | Rechtenhandhavingsfuncties |
| `lib/permissions/definitions.ts` | Rechten- en roldefinities |
| `lib/config/config-service.ts` | Server-only configuratie-singleton |
| `lib/config/schemas/auth.schema.ts` | Auth/cookie-configuratieschema's |
| `lib/editor/utils/utils.ts` | URL-opschoningsutilities |
| `lib/config-manager.ts` | Configuratie-YAML-manager met prototype-vervuilingsbeveiliging |
| `auth.config.ts` | NextAuth-configuratie |
| `next.config.ts` | Beveiligingsheaders en CSP |
