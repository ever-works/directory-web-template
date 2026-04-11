---
id: security
title: Beveiliging verharding
sidebar_label: Beveiliging
sidebar_position: 6
---

# Beveiligingsverscherping

De Ever Works-sjabloon bevat standaard meerdere beveiligingslagen. Deze handleiding documenteert de ingebouwde beveiligingen en biedt aanbevelingen voor het verder versterken van uw productie-implementatie.

## Beveiligingsheaders

De sjabloon configureert beveiligingsheaders globaal in `next.config.ts` voor alle routes:

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

### Uitsplitsing koptekst

| Kop | Waarde | Doel |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Voorkomt snuffelaanvallen van het MIME-type |
| `X-Frame-Options` | `DENY` | Blokkeert dat de site wordt ingesloten in iframes (clickjacking-bescherming) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Beperkt verwijzende informatie verzonden naar externe bronnen |
| `X-DNS-Prefetch-Control` | `on` | Schakelt DNS-prefetching in voor prestaties |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Dwingt HTTPS af gedurende ~2 jaar, dekt alle subdomeinen en komt in aanmerking voor de HSTS-preloadlijst |
| `Content-Security-Policy` | Zie hieronder | Beperkt bronnen voor het laden van bronnen |

### Inhoudsbeveiligingsbeleid

De CSP is geconfigureerd als:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| Richtlijn | Waarde | Opmerkingen |
|---|---|---|
| `default-src` | `'self'` | Standaard alleen bronnen van dezelfde oorsprong toestaan ​​|
| `script-src` | `'self' 'unsafe-inline'` + LemonSqueezy | Vereist voor inline scripts en betalingswidget |
| `style-src` | `'self' 'unsafe-inline'` | Vereist voor CSS-in-JS en Tailwind |
| `img-src` | `'self' data: https:` | Staat afbeeldingen van dezelfde oorsprong, gegevens-URI's en elke HTTPS-bron toe |
| `font-src` | `'self'` | Alleen zelfgehoste lettertypen |
| `connect-src` | `'self' https:` | API-aanroepen naar dezelfde oorsprong en elk HTTPS-eindpunt |
| `frame-ancestors` | `'none'` | Voorkomt insluiting in elk iframe (equivalent aan `X-Frame-Options: DENY` ) |

### Beveiliging van SVG-afbeeldingen

SVG-afbeeldingen krijgen extra sandboxing:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

SVG's worden weergegeven als bijlagen waarbij de scripts volledig zijn uitgeschakeld en in een sandbox zijn geplaatst, waardoor op SVG gebaseerde XSS-aanvallen worden voorkomen.

### Extra verharding

De `poweredByHeader` is uitgeschakeld:

```typescript
poweredByHeader: false,
```

Hierdoor wordt de `X-Powered-By: Next.js` -header verwijderd, waardoor technologie-fingerprinting wordt voorkomen.

## Authenticatiebeveiliging

### NextAuth.js-integratie

De sjabloon gebruikt NextAuth.js (Auth.js) voor authenticatie. De belangrijkste beveiligingsfuncties zijn onder meer:

- **JWT- of databasesessies** met configureerbare sessiestrategie
- **CSRF-bescherming** voor alle formulierinzendingen
- **Beveiligde cookieconfiguratie** met `httpOnly` , `secure` en `sameSite` vlaggen
- **Invoervalidatie** met Zod-schema's voor alle formulieracties

### Gevalideerde acties

Serveracties worden beschermd met behulp van gevalideerde actiewrappers gedefinieerd in `lib/auth/middleware.ts` :

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

**Gebruik altijd `validatedActionWithUser` ** voor geverifieerde handelingen. Dit zorgt ervoor dat zowel invoervalidatie als sessieverificatie plaatsvinden voordat er bedrijfslogica wordt uitgevoerd.

## RBAC-handhaving

De sjabloon bevat een volledig op rollen gebaseerd toegangscontrolesysteem in `lib/middleware/permission-check.ts` .

### Toestemmingsformaat

Machtigingen volgen een `resource:action` -patroon:

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### Functies voor toestemmingscontrole

| Functie | Doel | Voorbeeld |
|---|---|---|
| `hasPermission` | Controleer enkele toestemming | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | Controleer of de gebruiker minstens één | `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| `hasAllPermissions` | Controleer of de gebruiker alles heeft vermeld | `hasAllPermissions(user, ['users:read', 'users:update'])` |
| `hasResourcePermission` | Controleer op resource + actiereeksen | `hasResourcePermission(user, 'items', 'delete')` |
| `canManageResource` | Vink aanmaken/bijwerken/verwijderen | aan `canManageResource(user, 'categories')` |
| `canReviewItems` | Controleer de machtigingen voor het beoordelen van items | `canReviewItems(user)` |
| `canManageUsers` | Controleer de rechten voor gebruikersbeheer | `canManageUsers(user)` |
| `canManageRoles` | Controleer de rechten voor rolbeheer | `canManageRoles(user)` |
| `canViewAnalytics` | Toegang tot analyses controleren | `canViewAnalytics(user)` |
| `isSuperAdmin` | Controleer op de rol van superbeheerder of alle machtigingen | `isSuperAdmin(user)` |

### Machtigingen gebruiken in API-routes

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

### Detectie van superbeheerders

De `isSuperAdmin` -functie gebruikt een dubbele aanpak voor maximale veiligheid:

1. **Rolcontrole**: Controleert of de gebruiker de rol `super-admin` heeft
2. **Reservetoestemming**: Controleert of de gebruiker over alle gedefinieerde systeemrechten beschikt

Dit zorgt ervoor dat geen enkele gedeeltelijke machtigingenset per ongeluk superbeheerderstoegang kan verlenen.

## Snelheidslimiet

### API-routebeveiliging

Implementeer snelheidsbeperkingen voor openbare API-routes om misbruik te voorkomen:

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

Voor productie-implementaties kunt u overwegen het volgende te gebruiken:
- **Vercel Edge Middleware** met een snelheidslimiet van `@vercel/edge` - **Upstash Redis** voor gedistribueerde snelheidsbeperking over serverloze instanties
- **Cloudflare Rate Limiting** op de CDN-laag

### Cron-eindpuntbescherming

Cron API-eindpunten moeten een gedeeld geheim verifiëren om ongeautoriseerde aanroep te voorkomen:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

De `CRON_SECRET` wordt ingesteld via omgevingsvariabelen en geconfigureerd tijdens de implementatie (zie de Vercel-implementatieworkflow van de CI/CD-pijplijn).

## Invoervalidatie

### Zod-schemavalidatie

Alle formulierinvoer en API-payloads moeten worden gevalideerd met Zod-schema's:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### Preventie van SQL-injectie

De sjabloon gebruikt Drizzle ORM voor alle databasequery's, waardoor alle waarden automatisch worden geparametriseerd. Maak nooit onbewerkte SQL-tekenreeksen met gebruikersinvoer.

### XSS-preventie

- Servercomponenten worden weergegeven op de server en stellen geen onbewerkte HTML bloot aan de client.
- Alle door de gebruiker gegenereerde inhoud moet worden geëscaped met behulp van de ingebouwde escaping van React (JSX ontsnapt automatisch aan strings).
- De CSP-header blokkeert inline-scripts van niet-vertrouwde bronnen.

## Omgevingsvariabele beveiliging

### Vereiste geheimen

| Variabel | Doel | Generatie |
|---|---|---|
| `AUTH_SECRET` | Ondertekent JWT-tokens en sessiecookies | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Versleutelt cookiewaarden | `openssl rand -base64 32` |
| `CRON_SECRET` | Authenticeert cron-eindpuntverzoeken | `openssl rand -base64 32` |
| `DATABASE_URL` | Databaseverbindingsreeks | Aangeboden door databasehost |

### Beste praktijken

1. **Geef nooit geheimen** door aan versiebeheer. Gebruik `.env.local` voor ontwikkeling en geheimen op platformniveau voor productie.
2. **Rouleer geheimen regelmatig**, vooral `AUTH_SECRET` en `COOKIE_SECRET` .
3. **Gebruik afzonderlijke geheimen per omgeving** -- deel geen productiegeheimen met staging of ontwikkeling.
4. **Beperk de toegang** tot variabelen in de productieomgeving met behulp van de RBAC van uw platform (Vercel-teamrollen, GitHub-omgevingsbeschermingsregels).

## Beveiligingschecklist voor productie

| Categorie | Artikel | Staat |
|---|---|---|
| **Koppen** | Alle beveiligingsheaders geconfigureerd in `next.config.ts` | Ingebouwd |
| **Koppen** | `poweredByHeader` uitgeschakeld | Ingebouwd |
| **Koppen** | HSTS-voorbelasting ingeschakeld met een maximale leeftijd van 2 jaar | Ingebouwd |
| **Authentificatie** | `AUTH_SECRET` is een sterke willekeurige waarde | Handleiding |
| **Authentificatie** | Sessiecookies gebruiken `httpOnly` , `secure` , `sameSite` | Ingebouwd |
| **Authentificatie** | Alle serveracties gebruiken `validatedActionWithUser` | Beoordeling |
| **RBAC** | Toestemmingen gecontroleerd op elke beschermde route | Beoordeling |
| **RBAC** | Voor toegang tot superbeheerders is expliciete roltoewijzing vereist | Ingebouwd |
| **Invoer** | Zod-validatie op alle formulierinvoer en API-payloads | Beoordeling |
| **Invoer** | Geen onbewerkte SQL-query's (alleen Drizzle ORM) | Beoordeling |
| **Cron** | Cron-eindpunten verifiëren `CRON_SECRET` | Beoordeling |
| **Geheimen** | Alle geheimen gerouleerd en omgevingsspecifiek | Handleiding |
| **CSP** | Contentbeveiligingsbeleid herzien voor productiedomeinen | Handleiding |
| **Deps** | CodeQL-analyse wordt wekelijks uitgevoerd op de codebase | Ingebouwd |
| **Deps** | Afhankelijkheden gecontroleerd ( `pnpm audit` ) | Handleiding |

## Beveiligingsproblemen melden

Als u een beveiligingsprobleem ontdekt, rapporteer dit dan privé:

- **E-mail**: security@ever.co
- **Open** geen openbaar GitHub-probleem vanwege beveiligingsproblemen.
- Neem waar mogelijk reproductiestappen en effectbeoordelingen op.
