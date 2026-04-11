---
id: security
title: Sicherheitshärtung
sidebar_label: Sicherheit
sidebar_position: 6
---

# Sicherheitshärtung

Die Ever Works-Vorlage umfasst standardmäßig mehrere Sicherheitsebenen. Dieser Leitfaden dokumentiert die integrierten Schutzmaßnahmen und bietet Empfehlungen zur weiteren Absicherung Ihrer Produktionsbereitstellung.

## Sicherheitsheader

Die Vorlage konfiguriert Sicherheitsheader global in `next.config.ts` für alle Routen:

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

### Header-Aufschlüsselung

| Kopfzeile | Wert | Zweck |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Verhindert Sniffing-Angriffe vom MIME-Typ |
| `X-Frame-Options` | `DENY` | Blockiert die Einbettung der Website in Iframes (Clickjacking-Schutz) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Beschränkt den Versand von Referrer-Informationen an externe Ursprünge |
| `X-DNS-Prefetch-Control` | `on` | Aktiviert DNS-Prefetching für mehr Leistung |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Erzwingt HTTPS für ca. 2 Jahre, deckt alle Subdomains ab und ist für die HSTS-Preload-Liste geeignet |
| `Content-Security-Policy` | Siehe unten | Beschränkt Ressourcenladequellen |

### Inhaltssicherheitsrichtlinie

Der CSP ist wie folgt konfiguriert:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| Richtlinie | Wert | Notizen |
|---|---|---|
| `default-src` | `'self'` | Standardmäßig nur Ressourcen desselben Ursprungs zulassen |
| `script-src` | `'self' 'unsafe-inline'` + LemonSqueezy | Erforderlich für Inline-Skripte und Zahlungs-Widget |
| `style-src` | `'self' 'unsafe-inline'` | Erforderlich für CSS-in-JS und Tailwind |
| `img-src` | `'self' data: https:` | Ermöglicht Bilder vom gleichen Ursprung, Daten-URIs und jeder HTTPS-Quelle |
| `font-src` | `'self'` | Nur selbst gehostete Schriftarten |
| `connect-src` | `'self' https:` | API-Aufrufe an denselben Ursprung und jeden HTTPS-Endpunkt |
| `frame-ancestors` | `'none'` | Verhindert die Einbettung in einen beliebigen Iframe (entspricht `X-Frame-Options: DENY` ) |

### SVG-Bildsicherheit

SVG-Bilder erhalten zusätzliches Sandboxing:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

SVGs werden als Anhänge mit vollständig deaktivierten und in einer Sandbox befindlichen Skripten bereitgestellt, um SVG-basierte XSS-Angriffe zu verhindern.

### Zusätzliche Härtung

Der `poweredByHeader` ist deaktiviert:

```typescript
poweredByHeader: false,
```

Dadurch wird der `X-Powered-By: Next.js` -Header entfernt, wodurch Technologie-Fingerprinting verhindert wird.

## Authentifizierungssicherheit

### NextAuth.js-Integration

Die Vorlage verwendet NextAuth.js (Auth.js) zur Authentifizierung. Zu den wichtigsten Sicherheitsfunktionen gehören:

- **JWT- oder Datenbanksitzungen** mit konfigurierbarer Sitzungsstrategie
- **CSRF-Schutz** für alle Formularübermittlungen
- **Sichere Cookie-Konfiguration** mit den Flags `httpOnly` , `secure` und `sameSite` - **Eingabevalidierung** mit Zod-Schemas für alle Formularaktionen

### Validierte Aktionen

Serveraktionen werden durch validierte Aktions-Wrapper geschützt, die in `lib/auth/middleware.ts` definiert sind:

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

**Verwenden Sie immer `validatedActionWithUser` ** für authentifizierte Vorgänge. Dadurch wird sichergestellt, dass sowohl die Eingabevalidierung als auch die Sitzungsüberprüfung erfolgen, bevor eine Geschäftslogik ausgeführt wird.

## RBAC-Durchsetzung

Die Vorlage enthält ein vollständiges rollenbasiertes Zugriffskontrollsystem in `lib/middleware/permission-check.ts` .

### Berechtigungsformat

Berechtigungen folgen einem `resource:action` -Muster:

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### Berechtigungsprüfungsfunktionen

| Funktion | Zweck | Beispiel |
|---|---|---|
| `hasPermission` | Einzelberechtigung prüfen | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | Überprüfen Sie, ob der Benutzer mindestens ein | hat `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| `hasAllPermissions` | Überprüfen Sie, ob der Benutzer alle aufgelistet hat | `hasAllPermissions(user, ['users:read', 'users:update'])` |
| `hasResourcePermission` | Nach Ressource + Aktionszeichenfolgen prüfen | `hasResourcePermission(user, 'items', 'delete')` |
| `canManageResource` | Aktivieren Sie „Erstellen/Aktualisieren/Löschen |“. `canManageResource(user, 'categories')` |
| `canReviewItems` | Überprüfungsberechtigungen für Artikel prüfen | `canReviewItems(user)` |
| `canManageUsers` | Benutzerverwaltungsberechtigungen prüfen | `canManageUsers(user)` |
| `canManageRoles` | Rollenverwaltungsberechtigungen prüfen | `canManageRoles(user)` |
| `canViewAnalytics` | Analysezugriff prüfen | `canViewAnalytics(user)` |
| `isSuperAdmin` | Auf Superadministratorrolle oder alle Berechtigungen prüfen | `isSuperAdmin(user)` |

### Verwenden von Berechtigungen in API-Routen

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

### Super Admin-Erkennung

Die `isSuperAdmin` -Funktion nutzt einen dualen Ansatz für maximale Sicherheit:

1. **Rollenprüfung**: Prüft, ob der Benutzer die Rolle `super-admin` hat
2. **Berechtigungs-Fallback**: Überprüft, ob der Benutzer über alle definierten Systemberechtigungen verfügt

Dadurch wird sichergestellt, dass kein teilweiser Berechtigungssatz versehentlich Superadministratorzugriff gewähren kann.

## Ratenbegrenzung

### API-Routenschutz

Implementieren Sie eine Ratenbegrenzung für öffentlich zugängliche API-Routen, um Missbrauch zu verhindern:

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

Erwägen Sie für Produktionsbereitstellungen die Verwendung von:
- **Vercel Edge Middleware** mit Ratenbegrenzung auf `@vercel/edge` - **Upstash Redis** für verteilte Ratenbegrenzung über serverlose Instanzen
- **Cloudflare-Ratenbegrenzung** auf der CDN-Ebene

### Cron Endpoint Protection

Cron-API-Endpunkte sollten ein gemeinsames Geheimnis verifizieren, um unbefugten Aufruf zu verhindern:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

Der Wert `CRON_SECRET` wird über Umgebungsvariablen festgelegt und während der Bereitstellung konfiguriert (siehe den Vercel-Bereitstellungsworkflow der CI/CD-Pipeline).

## Eingabevalidierung

### Zod-Schema-Validierung

Alle Formulareingaben und API-Nutzlasten sollten mit Zod-Schemas validiert werden:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### SQL-Injection-Prävention

Die Vorlage verwendet Drizzle ORM für alle Datenbankabfragen, das alle Werte automatisch parametrisiert. Erstellen Sie niemals unformatierte SQL-Strings mit Benutzereingaben.

### XSS-Prävention

- Serverkomponenten werden auf dem Server gerendert und stellen dem Client kein Roh-HTML zur Verfügung.
– Alle benutzergenerierten Inhalte sollten mithilfe der integrierten Escape-Funktion von React maskiert werden (JSX maskiert Zeichenfolgen automatisch).
– Der CSP-Header blockiert Inline-Skripte von nicht vertrauenswürdigen Quellen.

## Sicherheit der Umgebungsvariablen

### Erforderliche Geheimnisse

| Variable | Zweck | Generation |
|---|---|---|
| `AUTH_SECRET` | Signiert JWT-Token und Sitzungscookies | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Verschlüsselt Cookie-Werte | `openssl rand -base64 32` |
| `CRON_SECRET` | Authentifiziert Cron-Endpunkt-Anfragen | `openssl rand -base64 32` |
| `DATABASE_URL` | Datenbankverbindungszeichenfolge | Bereitgestellt vom Datenbankhost |

### Best Practices

1. **Übergeben Sie niemals Geheimnisse** an die Versionskontrolle. Verwenden Sie `.env.local` für die Entwicklung und Geheimnisse auf Plattformebene für die Produktion.
2. **Rotieren Sie die Geheimnisse regelmäßig**, insbesondere `AUTH_SECRET` und `COOKIE_SECRET` .
3. **Verwenden Sie separate Geheimnisse pro Umgebung** – Teilen Sie Produktionsgeheimnisse nicht mit Staging oder Entwicklung.
4. **Beschränken Sie den Zugriff** auf Produktionsumgebungsvariablen mithilfe des RBAC Ihrer Plattform (Vercel-Teamrollen, GitHub-Umgebungsschutzregeln).

## Sicherheitscheckliste für die Produktion

| Kategorie | Artikel | Status |
|---|---|---|
| **Kopfzeilen** | Alle in `next.config.ts` | konfigurierten Sicherheitsheader Eingebaut |
| **Kopfzeilen** | `poweredByHeader` deaktiviert | Eingebaut |
| **Kopfzeilen** | HSTS-Vorladung aktiviert mit 2 Jahren Maximalalter | Eingebaut |
| **Auth** | `AUTH_SECRET` ist ein starker Zufallswert | Handbuch |
| **Auth** | Sitzungscookies verwenden `httpOnly` , `secure` , `sameSite` | Eingebaut |
| **Auth** | Alle Serveraktionen verwenden `validatedActionWithUser` | Rezension |
| **RBAC** | Berechtigungen werden auf jeder geschützten Route überprüft | Rezension |
| **RBAC** | Der Superadministratorzugriff erfordert eine explizite Rollenzuweisung | Eingebaut |
| **Eingabe** | Zod-Validierung für alle Formulareingaben und API-Nutzlasten | Rezension |
| **Eingabe** | Keine unformatierten SQL-Abfragen (nur Drizzle ORM) | Rezension |
| **Cron** | Cron-Endpunkte überprüfen `CRON_SECRET` | Rezension |
| **Geheimnisse** | Alle Geheimnisse rotiert und umgebungsspezifisch | Handbuch |
| **CSP** | Inhaltssicherheitsrichtlinie für Produktionsdomänen überprüft | Handbuch |
| **Abs** | Die CodeQL-Analyse wird wöchentlich auf der Codebasis ausgeführt | Eingebaut |
| **Abs** | Geprüfte Abhängigkeiten ( `pnpm audit` ) | Handbuch |

## Sicherheitsprobleme melden

Wenn Sie eine Sicherheitslücke entdecken, melden Sie diese privat:

- **E-Mail**: security@ever.co
- **Öffnen Sie kein öffentliches GitHub-Problem wegen Sicherheitslücken.
- Wenn möglich, Reproduktionsschritte und Folgenabschätzung einbeziehen.
