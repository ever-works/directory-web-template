---
id: security
title: Wzmocnienie zabezpieczeń
sidebar_label: Bezpieczeństwo
sidebar_position: 6
---

# Wzmocnienie bezpieczeństwa

Szablon Ever Works domyślnie zawiera wiele warstw zabezpieczeń. Ten przewodnik dokumentuje wbudowane zabezpieczenia i zawiera zalecenia dotyczące dalszego ulepszania wdrożenia produkcyjnego.

## Nagłówki zabezpieczeń

Szablon konfiguruje nagłówki zabezpieczeń globalnie w `next.config.ts` dla wszystkich tras:

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

### Podział nagłówka

| Nagłówek | Wartość | Cel |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Zapobiega atakom typu sniffing typu MIME |
| `X-Frame-Options` | `DENY` | Blokuje osadzanie witryny w ramkach iframe (ochrona przed kliknięciami) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Ogranicza informacje o stronie odsyłającej wysyłane do źródeł zewnętrznych |
| `X-DNS-Prefetch-Control` | `on` | Włącza wstępne pobieranie DNS w celu zwiększenia wydajności |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Wymusza HTTPS przez ~2 lata, obejmuje wszystkie subdomeny, kwalifikuje się do listy wstępnego ładowania HSTS |
| `Content-Security-Policy` | Zobacz poniżej | Ogranicza źródła ładowania zasobów |

### Polityka bezpieczeństwa treści

Dostawca CSP jest skonfigurowany jako:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| Dyrektywa | Wartość | Notatki |
|---|---|---|
| `default-src` | `'self'` | Domyślnie zezwalaj tylko na zasoby z tego samego źródła |
| `script-src` | `'self' 'unsafe-inline'` + Wyciskacz Cytrynowy | Wymagane w przypadku skryptów wbudowanych i widgetu płatności |
| `style-src` | `'self' 'unsafe-inline'` | Wymagane dla CSS-in-JS i Tailwind |
| `img-src` | `'self' data: https:` | Zezwala na obrazy z tego samego źródła, identyfikatorów URI danych i dowolnego źródła HTTPS |
| `font-src` | `'self'` | Tylko czcionki hostowane samodzielnie |
| `connect-src` | `'self' https:` | Wywołania API do tego samego źródła i dowolnego punktu końcowego HTTPS |
| `frame-ancestors` | `'none'` | Zapobiega osadzaniu w dowolnej ramce iframe (odpowiednik `X-Frame-Options: DENY` ) |

### Bezpieczeństwo obrazu SVG

Obrazy SVG podlegają dodatkowej piaskownicy:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

Pliki SVG są podawane jako załączniki ze skryptami całkowicie wyłączonymi i umieszczonymi w piaskownicy, co zapobiega atakom XSS opartym na SVG.

### Dodatkowe hartowanie `poweredByHeader` jest wyłączone:

```typescript
poweredByHeader: false,
```

Spowoduje to usunięcie nagłówka `X-Powered-By: Next.js` , zapobiegając odciskowi palca technologii.

## Bezpieczeństwo uwierzytelniania

### Integracja NextAuth.js

Szablon używa NextAuth.js (Auth.js) do uwierzytelniania. Kluczowe funkcje bezpieczeństwa obejmują:

- **Sesje JWT lub bazy danych** z konfigurowalną strategią sesji
- **Ochrona CSRF** przy wszystkich przesłanych formularzach
- **Bezpieczna konfiguracja plików cookie** z flagami `httpOnly` , `secure` i `sameSite` - **Weryfikacja danych wejściowych** przy użyciu schematów Zoda we wszystkich akcjach formularzy

### Sprawdzone działania

Akcje serwera są chronione za pomocą sprawdzonych opakowań akcji zdefiniowanych w `lib/auth/middleware.ts` :

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

**Zawsze używaj `validatedActionWithUser` ** do operacji uwierzytelnionych. Dzięki temu przed wykonaniem jakiejkolwiek logiki biznesowej nastąpi zarówno weryfikacja danych wejściowych, jak i weryfikacja sesji.

## Egzekwowanie kontroli RBAC

Szablon zawiera pełny system kontroli dostępu opartej na rolach w `lib/middleware/permission-check.ts` .

###Format uprawnień

Uprawnienia mają wzór `resource:action` :

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### Funkcje sprawdzania uprawnień

| Funkcja | Cel | Przykład |
|---|---|---|
| `hasPermission` | Sprawdź pojedyncze pozwolenie | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | Sprawdź, czy użytkownik ma przynajmniej jedno | `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| `hasAllPermissions` | Sprawdź, czy użytkownik ma wszystkie wymienione | `hasAllPermissions(user, ['users:read', 'users:update'])` |
| `hasResourcePermission` | Sprawdź według zasobów + ciągów akcji | `hasResourcePermission(user, 'items', 'delete')` |
| `canManageResource` | Sprawdź utwórz/aktualizuj/usuń | `canManageResource(user, 'categories')` |
| `canReviewItems` | Sprawdź uprawnienia do przeglądania przedmiotu | `canReviewItems(user)` |
| `canManageUsers` | Sprawdź uprawnienia do zarządzania użytkownikami | `canManageUsers(user)` |
| `canManageRoles` | Sprawdź uprawnienia do zarządzania rolami | `canManageRoles(user)` |
| `canViewAnalytics` | Sprawdź dostęp do analityki | `canViewAnalytics(user)` |
| `isSuperAdmin` | Sprawdź rolę superadministratora lub wszystkie uprawnienia | `isSuperAdmin(user)` |

### Używanie uprawnień w trasach API

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

### Wykrywanie superadministratora

Funkcja `isSuperAdmin` wykorzystuje podwójne podejście w celu zapewnienia maksymalnego bezpieczeństwa:

1. **Sprawdzanie roli**: Sprawdza, czy użytkownik posiada `super-admin` rolę
2. **Przywrócenie uprawnień**: Sprawdza, czy użytkownik posiada wszystkie zdefiniowane uprawnienia systemowe

Dzięki temu żaden częściowy zestaw uprawnień nie może przypadkowo przyznać dostępu superadministratora.

## Ograniczenie szybkości

### Ochrona tras API

Zaimplementuj ograniczanie szybkości dla publicznych tras API, aby zapobiec nadużyciom:

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

W przypadku wdrożeń produkcyjnych rozważ użycie:
- **Vercel Edge Middleware** z ograniczeniem szybkości do `@vercel/edge` - **Upstash Redis** do rozproszonego ograniczania szybkości w instancjach bezserwerowych
- **Ograniczenie szybkości Cloudflare** w warstwie CDN

### Ochrona punktu końcowego Cron

Punkty końcowe API Cron powinny zweryfikować wspólny sekret, aby zapobiec nieautoryzowanemu wywołaniu:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

Wartość `CRON_SECRET` jest ustawiana za pomocą zmiennych środowiskowych i konfigurowana podczas wdrażania (patrz przepływ pracy wdrażania potoku CI/CD w Vercel).

## Walidacja danych wejściowych

### Walidacja schematu Zoda

Wszystkie dane wejściowe formularzy i ładunki API powinny zostać sprawdzone za pomocą schematów Zoda:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### Zapobieganie wstrzykiwaniu SQL

Szablon wykorzystuje Drizzle ORM do wszystkich zapytań do bazy danych, który automatycznie parametryzuje wszystkie wartości. Nigdy nie konstruuj surowych ciągów SQL na podstawie danych wejściowych użytkownika.

### Zapobieganie XSS

- Komponenty serwera renderują się na serwerze i nie udostępniają klientowi surowego kodu HTML.
- Cała zawartość wygenerowana przez użytkownika powinna być kodowana za pomocą wbudowanej funkcji ucieczki React (JSX automatycznie usuwa ciągi znaków).
- Nagłówek CSP blokuje wbudowane skrypty z niezaufanych źródeł.

## Bezpieczeństwo zmiennej środowiskowej

### Wymagane tajemnice

| Zmienna | Cel | Pokolenie |
|---|---|---|
| `AUTH_SECRET` | Podpisuje tokeny JWT i pliki cookie sesji | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Szyfruje wartości plików cookie | `openssl rand -base64 32` |
| `CRON_SECRET` | Uwierzytelnia żądania punktu końcowego cron | `openssl rand -base64 32` |
| `DATABASE_URL` | Parametry połączenia z bazą danych | Dostarczone przez hosta bazy danych |

### Najlepsze praktyki

1. **Nigdy nie udostępniaj sekretów** kontroli wersji. Użyj `.env.local` do programowania i tajnych informacji na poziomie platformy do produkcji.
2. **Regularnie wymieniaj sekrety**, zwłaszcza `AUTH_SECRET` i `COOKIE_SECRET` .
3. **Użyj oddzielnych sekretów dla każdego środowiska** — nie udostępniaj sekretów produkcyjnych podczas testowania lub programowania.
4. **Ogranicz dostęp** do zmiennych środowiskowych środowiska produkcyjnego za pomocą RBAC swojej platformy (role zespołu Vercel, zasady ochrony środowiska GitHub).

## Lista kontrolna bezpieczeństwa dla produkcji

| Kategoria | Pozycja | Stan |
|---|---|---|
| **Nagłówki** | Wszystkie nagłówki zabezpieczeń skonfigurowane w `next.config.ts` | Wbudowany |
| **Nagłówki** | `poweredByHeader` wyłączone | Wbudowany |
| **Nagłówki** | Wstępne ładowanie HSTS włączone z maksymalnym wiekiem 2 lat | Wbudowany |
| **Autoryzacja** | `AUTH_SECRET` jest silną wartością losową | Instrukcja |
| **Autoryzacja** | Sesyjne pliki cookie wykorzystują `httpOnly` , `secure` , `sameSite` | Wbudowany |
| **Autoryzacja** | Wszystkie akcje serwera używają `validatedActionWithUser` | Recenzja |
| **RBAC** | Uprawnienia sprawdzane na każdej chronionej trasie | Recenzja |
| **RBAC** | Dostęp superadministratora wymaga wyraźnego przypisania roli | Wbudowany |
| **Wejście** | Weryfikacja Zoda dla wszystkich danych wejściowych formularzy i ładunków API | Recenzja |
| **Wejście** | Brak surowych zapytań SQL (tylko Drizzle ORM) | Recenzja |
| **Cron** | Punkty końcowe Cron sprawdzają `CRON_SECRET` | Recenzja |
| **Sekrety** | Wszystkie sekrety zmienione i specyficzne dla środowiska | Instrukcja |
| **CSP** | Polityka bezpieczeństwa treści sprawdzona dla domen produkcyjnych | Instrukcja |
| **Deps** | Analiza CodeQL odbywa się co tydzień w bazie kodu | Wbudowany |
| **Deps** | Sprawdzone zależności ( `pnpm audit` ) | Instrukcja |

## Zgłaszanie problemów związanych z bezpieczeństwem

Jeśli odkryjesz lukę w zabezpieczeniach, zgłoś ją prywatnie:

- **E-mail**: security@ever.co
- **Nie** otwieraj publicznego problemu GitHub ze względu na luki w zabezpieczeniach.
- Jeśli to możliwe, uwzględnij etapy reprodukcji i ocenę wpływu.
