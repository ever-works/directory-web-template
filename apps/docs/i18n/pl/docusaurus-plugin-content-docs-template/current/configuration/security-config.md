---
id: security-config
title: "Konfiguracja Bezpieczeństwa"
sidebar_label: "Konf. Bezpieczeństwa"
sidebar_position: 5
---

# Konfiguracja Bezpieczeństwa

Szablon implementuje strategię bezpieczeństwa defense-in-depth z kontrolą dostępu opartą na uprawnieniach, walidacją danych wejściowych, bezpiecznymi odpowiedziami na błędy oraz oczyszczaniem adresów URL. Ten przewodnik dokumentuje każdą warstwę bezpieczeństwa i sposób jej konfiguracji.

## System Uprawnień

Szablon używa granularnego modelu uprawnień zasobów-akcji zdefiniowanego w `lib/permissions/definitions.ts` i egzekwowanego przez `lib/middleware/permission-check.ts`.

### Format Uprawnień

Uprawnienia mają format `resource:action`:

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

### Funkcje Sprawdzania Uprawnień

Middleware uprawnień w `lib/middleware/permission-check.ts` zapewnia obszerny zestaw pomocników autoryzacji:

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

### Interfejs UserPermissions

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### Sprawdzenia Specyficzne dla Roli

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

### Wykrywanie Super Admina

Funkcja `isSuperAdmin` sprawdza dwa warunki:

1. Użytkownik ma rolę `'super-admin'` (preferowane), LUB
2. Użytkownik posiada wszystkie uprawnienia systemowe (fallback)

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

### Walidacja Uprawnień

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

## Ochrona Tras API

Trasy API używają uwierzytelniania opartego na sesji z kontrolą roli administratora:

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

## Walidacja Danych Wejściowych

Szablon używa schematów Zod w całej aplikacji do walidacji danych wejściowych:

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

## Oczyszczanie URL

Moduł edytora zawiera oczyszczanie adresów URL w `lib/editor/utils/utils.ts`:

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

Zapobiega to osadzaniu `javascript:` i innych niebezpiecznych protokołów URL w treści edytora.

## Ochrona przed Zatruciem Prototypu

`ConfigManager` chroni przed zatruciem prototypu podczas aktualizacji zagnieżdżonych kluczy konfiguracji:

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

## Bezpieczeństwo Ciasteczek

Konfiguracja ciasteczek jest walidowana za pomocą schematu Zod:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

Dla środowiska produkcyjnego ustaw:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## Nagłówki Bezpieczeństwa Next.js

Plik `next.config.ts` konfiguruje nagłówki bezpieczeństwa. Powszechnie stosowane nagłówki:

| Nagłówek | Cel |
|----------|-----|
| `X-Frame-Options` | Zapobieganie clickjackingowi |
| `X-Content-Type-Options` | Zapobieganie MIME type sniffing |
| `Referrer-Policy` | Kontrola informacji referrer |
| `X-XSS-Protection` | Włączenie filtrowania XSS przeglądarki |
| `Strict-Transport-Security` | Wymuszanie HTTPS |
| `Permissions-Policy` | Ograniczanie funkcji przeglądarki |

## Bezpieczeństwo Zmiennych Środowiskowych

System konfiguracji zapewnia, że wrażliwe zmienne są dostępne tylko po stronie serwera:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

Zmienne z prefiksem `NEXT_PUBLIC_` są udostępniane klientowi. Wszystkie pozostałe (klucze tajne, adresy URL baz danych, tokeny API) pozostają wyłącznie po stronie serwera:

- `STRIPE_SECRET_KEY` -- tylko po stronie serwera
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- bezpieczne dla klienta
- `DATABASE_URL` -- tylko po stronie serwera
- `AUTH_SECRET` -- tylko po stronie serwera

## Najlepsze Praktyki

1. **Zawsze walidować dane wejściowe** za pomocą schematów Zod przed przetworzeniem
2. **Sprawdzać uwierzytelnianie** na początku każdego handlera tras API
3. **Używać kontroli uprawnień** do kontroli dostępu opartej na rolach
4. **Oczyszczać adresy URL** przed ich osadzaniem w treści
5. **Trzymać sekrety tylko po stronie serwera** używając zabezpieczenia importu `server-only`
6. **Ustawiać `COOKIE_SECURE=true`** w środowisku produkcyjnym
7. **Używać silnych sekretów** dla `AUTH_SECRET` i `COOKIE_SECRET` (minimum 32 bajty base64)
8. **Przeglądać model uprawnień** przy dodawaniu nowych zasobów lub akcji

## Powiązane Pliki

| Ścieżka | Opis |
|---------|------|
| `lib/middleware/permission-check.ts` | Funkcje egzekwowania uprawnień |
| `lib/permissions/definitions.ts` | Definicje uprawnień i ról |
| `lib/config/config-service.ts` | Singleton konfiguracji tylko serwera |
| `lib/config/schemas/auth.schema.ts` | Schematy konfiguracji auth/cookie |
| `lib/editor/utils/utils.ts` | Narzędzia do oczyszczania URL |
| `lib/config-manager.ts` | Manager YAML konfiguracji z ochroną przed zatruciem prototypu |
| `auth.config.ts` | Konfiguracja NextAuth |
| `next.config.ts` | Nagłówki bezpieczeństwa i CSP |
