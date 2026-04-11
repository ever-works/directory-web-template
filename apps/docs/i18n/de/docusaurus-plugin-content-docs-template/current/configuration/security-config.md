---
id: security-config
title: "Sicherheitskonfiguration"
sidebar_label: "Sicherheitskonf."
sidebar_position: 5
---

# Sicherheitskonfiguration

Das Template implementiert eine Defense-in-Depth-Sicherheitsstrategie mit berechtigungsbasierter Zugriffskontrolle, Eingabevalidierung, sicheren Fehlerantworten und URL-Bereinigung. Dieser Leitfaden dokumentiert jede Sicherheitsebene und wie sie konfiguriert wird.

## Berechtigungssystem

Das Template verwendet ein granulares Ressource-Aktion-Berechtigungsmodell, das in `lib/permissions/definitions.ts` definiert und durch `lib/middleware/permission-check.ts` durchgesetzt wird.

### Berechtigungsformat

Berechtigungen folgen dem Format `resource:action`:

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

### Berechtigungsprüffunktionen

Die Berechtigungs-Middleware unter `lib/middleware/permission-check.ts` bietet eine umfassende Reihe von Autorisierungshilfsfunktionen:

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

### UserPermissions-Schnittstelle

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### Rollenspezifische Prüfungen

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

### Super-Admin-Erkennung

Die Funktion `isSuperAdmin` prüft zwei Bedingungen:

1. Der Benutzer hat die Rolle `'super-admin'` (bevorzugt), ODER
2. Der Benutzer besitzt alle Systemberechtigungen (Fallback)

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

### Berechtigungsvalidierung

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

## API-Routenschutz

API-Routen verwenden sitzungsbasierte Authentifizierung mit Admin-Rollenprüfungen:

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

## Eingabevalidierung

Das Template verwendet durchgehend Zod-Schemata zur Eingabevalidierung:

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

## URL-Bereinigung

Das Editor-Modul enthält URL-Bereinigung in `lib/editor/utils/utils.ts`:

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

Dies verhindert, dass `javascript:` und andere gefährliche Protokoll-URLs in Editor-Inhalte eingebettet werden.

## Schutz vor Prototype-Pollution

Der `ConfigManager` schützt vor Prototype-Pollution beim Aktualisieren verschachtelter Konfigurationsschlüssel:

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

## Cookie-Sicherheit

Die Cookie-Konfiguration wird über ein Zod-Schema validiert:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

Für die Produktion setzen Sie:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## Next.js-Sicherheits-Header

Die Datei `next.config.ts` konfiguriert Sicherheits-Header. Häufig zu setzende Header:

| Header | Zweck |
|--------|-------|
| `X-Frame-Options` | Clickjacking verhindern |
| `X-Content-Type-Options` | MIME-Typ-Sniffing verhindern |
| `Referrer-Policy` | Referrer-Informationen steuern |
| `X-XSS-Protection` | Browser-XSS-Filterung aktivieren |
| `Strict-Transport-Security` | HTTPS erzwingen |
| `Permissions-Policy` | Browser-Funktionen einschränken |

## Sicherheit der Umgebungsvariablen

Das Konfigurationssystem stellt sicher, dass sensible Variablen nur serverseitig verfügbar sind:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

Variablen mit dem Präfix `NEXT_PUBLIC_` werden dem Client zugänglich gemacht. Alle anderen (geheime Schlüssel, Datenbank-URLs, API-Token) bleiben nur serverseitig:

- `STRIPE_SECRET_KEY` -- nur serverseitig
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- sicher für den Client
- `DATABASE_URL` -- nur serverseitig
- `AUTH_SECRET` -- nur serverseitig

## Best Practices

1. **Eingaben immer validieren** mit Zod-Schemata vor der Verarbeitung
2. **Authentifizierung prüfen** am Anfang jedes API-Route-Handlers
3. **Berechtigungsprüfungen verwenden** für rollenbasierte Zugriffskontrolle
4. **URLs bereinigen** bevor sie in Inhalte eingebettet werden
5. **Geheimnisse nur serverseitig halten** mit dem `server-only`-Importschutz
6. **`COOKIE_SECURE=true` setzen** in der Produktion
7. **Starke Geheimnisse verwenden** für `AUTH_SECRET` und `COOKIE_SECRET` (mindestens 32 Byte Base64)
8. **Das Berechtigungsmodell überprüfen** beim Hinzufügen neuer Ressourcen oder Aktionen

## Verwandte Dateien

| Pfad | Beschreibung |
|------|-------------|
| `lib/middleware/permission-check.ts` | Berechtigungsdurchsetzungsfunktionen |
| `lib/permissions/definitions.ts` | Berechtigungs- und Rollendefinitionen |
| `lib/config/config-service.ts` | Serverseitiger Konfigurations-Singleton |
| `lib/config/schemas/auth.schema.ts` | Auth/Cookie-Konfigurationsschemata |
| `lib/editor/utils/utils.ts` | URL-Bereinigungsdienstprogramme |
| `lib/config-manager.ts` | Konfigurations-YAML-Manager mit Prototype-Pollution-Schutz |
| `auth.config.ts` | NextAuth-Konfiguration |
| `next.config.ts` | Sicherheits-Header und CSP |
