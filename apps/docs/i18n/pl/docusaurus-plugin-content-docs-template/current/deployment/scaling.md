---
id: scaling
title: Skalowanie i Wysoka Dostępność
sidebar_label: Skalowanie
sidebar_position: 4
---

# Skalowanie i Wysoka Dostępność

Ten przewodnik omawia strategie skalowania Ever Works Template od wdrożenia na pojedynczej instancji do produkcyjnej konfiguracji wysokiej dostępności, obejmując konfigurację serverless, connection pooling, optymalizację CDN oraz funkcje edge.

## Architektura Wdrożenia

Szablon obsługuje wiele architektur wdrożenia:

| Architektura | Najlepsza dla | Model Skalowania |
|---|---|---|
| Vercel (Serverless) | Większość wdrożeń | Automatyczne skalowanie poziome |
| Docker (Standalone) | Self-hosted, on-premise | Ręczne lub oparte na orchestratorze |
| Node.js (Bezpośredni) | Tworzenie, proste wdrożenia | Pojedyncza instancja lub klaster PM2 |

## Konfiguracja Serverless (Vercel)

### Wyjście Standalone

Szablon jest skonfigurowany z wyjściem standalone do zoptymalizowanego wdrożenia serverless:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

Tryb standalone tworzy samodzielny build w `.next/standalone/` zawierający tylko pliki niezbędne do uruchomienia aplikacji. Minimalizuje to czasy cold start poprzez zmniejszenie rozmiaru pakietu wdrożenia.

### Konfiguracja Funkcji

Konfiguruj ustawienia funkcji serverless w `vercel.json` lub poprzez konfigurację na poziomie trasy:

```typescript
// app/api/heavy-computation/route.ts
export const maxDuration = 60; // sekundy (Plan Pro: do 300s)
export const dynamic = 'force-dynamic';
```

### Zalecane Ustawienia Funkcji

| Typ Trasy | Maks. Czas | Pamięć | Uwagi |
|---|---|---|---|
| Trasy API (proste) | 10s | 1024 MB | Domyślne dla większości punktów końcowych |
| Trasy API (przetwarzanie danych) | 30s | 1024 MB | Dla operacji wsadowych |
| Cron jobs | 60s | 1024 MB | Wykonywanie zadań w tle |
| Handlery webhook | 30s | 1024 MB | Callbacki płatności, OAuth |
| Strony statyczne | N/D | N/D | Wstępnie renderowane w czasie buildu |

### Optymalizacja Cold Start

Minimalizuj cold starty za pomocą tych technik:

| Technika | Implementacja | Wpływ |
|---|---|---|
| Minimalizuj rozmiar funkcji | `serverExternalPackages` w konfiguracji | Skraca czas inicjalizacji |
| Unikaj importów na poziomie modułu | Dynamiczny `import()` dla ciężkich modułów | Opóźnia ładowanie do momentu potrzeby |
| Używaj edge runtime gdzie możliwe | `export const runtime = 'edge'` | Prawie zerowy cold start |
| Utrzymuj funkcje w gotowości | Punkty końcowe health check z monitorowaniem | Utrzymuje funkcje aktywne |

## Connection Pooling Bazy Danych

### Problem

W środowiskach serverless każde wywołanie funkcji może otwierać nowe połączenie z bazą danych. Bez poolingu może to wyczerpać limit połączeń bazy danych.

### Rozwiązanie: Connection Pooler

Użyj connection poolera między aplikacją a bazą danych:

| Pooler | Dostawca | Konfiguracja |
|---|---|---|
| PgBouncer | Supabase (wbudowany) | Użyj poolowanego ciągu połączenia (port 6543) |
| Neon Pooler | Neon (wbudowany) | Użyj ciągu połączenia `-pooler` |
| PgBouncer | Self-hosted | Wdróż PgBouncer wraz z PostgreSQL |

### Konfiguracja

Używaj różnych ciągów połączeń dla poolowanych i bezpośrednich połączeń:

```bash
# Połączenie poolowane dla zapytań aplikacji (bezpieczne dla serverless)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

# Połączenie bezpośrednie tylko dla migracji
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/db
```

Zaktualizuj `drizzle.config.ts`, aby używał bezpośredniego połączenia dla migracji:

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
} satisfies Config;
```

### Limity Połączeń

| Poziom | Maks. Połączeń | Zalecany Rozmiar Puli |
|---|---|---|
| Hobby (Neon/Supabase) | 50–100 | 10–20 |
| Pro (Neon/Supabase) | 200–500 | 50–100 |
| Enterprise | 1000+ | 100–200 |

### Zarządzanie Połączeniami w Kodzie

Moduł bazy danych szablonu powinien ponownie używać pojedynczej puli połączeń na instancję funkcji:

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Utwórz pulę połączeń raz na instancję serverless
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 10,          // Maksymalna liczba połączeń w puli
  idle_timeout: 20, // Zamknij bezczynne połączenia po 20s
  connect_timeout: 10,
});

export const db = drizzle(client);
```

## CDN i Buforowanie

### Sieć Vercel Edge

Przy wdrożeniu na Vercel sieć Edge automatycznie zapewnia:

- Globalną dystrybucję CDN w ponad 30 regionach
- Automatyczne buforowanie zasobów statycznych
- Buforowanie na brzegu sieci dla stron ISR (Incremental Static Regeneration)
- Ochronę DDoS

### Nagłówki Cache-Control

Konfiguruj buforowanie dla różnych typów treści:

```typescript
// Trasa API z nagłówkami buforowania
export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### Strategia Buforowania wg Typu Treści

| Typ Treści | Strategia Buforowania | TTL | Uwagi |
|---|---|---|---|
| Zasoby statyczne (JS, CSS, obrazy) | Immutable | 1 rok | Nazwy plików z hashem treści |
| Strony publiczne | ISR | 60–300s | Rewalidacja na żądanie |
| Odpowiedzi API (publiczne) | `s-maxage` | 10–60s | Buforowanie na poziomie CDN |
| Odpowiedzi API (uwierzytelnione) | `no-store` | 0 | Nigdy nie przechowuj danych specyficznych dla użytkownika |
| Strony treści CMS | ISR | 300s | Rewalidacja po synchronizacji treści |

### ISR (Incremental Static Regeneration)

Używaj ISR dla stron z dużą ilością treści, które rzadko się zmieniają:

```typescript
// app/[locale]/discover/[page]/page.tsx
export const revalidate = 300; // Regeneruj co 5 minut

export default async function DiscoverPage({ params }) {
  const items = await fetchItems(params.page);
  return <ItemGrid items={items} />;
}
```

### Rewalidacja na Żądanie

Wyzwalaj rewalidację po aktualizacjach treści:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { secret, path } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  revalidatePath(path);
  return Response.json({ revalidated: true });
}
```

## Funkcje Edge

### Kiedy Używać Edge Runtime

Funkcje edge działają na Cloudflare Workers (przez Vercel) i zapewniają prawie zerowe czasy cold start. Używaj ich do:

| Przypadek Użycia | Przykład |
|---|---|
| Routing oparty na geolokalizacji | Przekierowanie użytkowników do regionalnej treści |
| Testy A/B | Kierowanie do wariantów eksperymentu |
| Sprawdzanie uwierzytelniania | Szybka walidacja sesji |
| Transformacja odpowiedzi | Dodawanie nagłówków, modyfikowanie odpowiedzi |
| Proste punkty końcowe API | Lekkie pobieranie danych |

### Ograniczenia Edge Runtime

| Ograniczenie | Szczegóły |
|---|---|
| Brak API Node.js | Nie można używać `fs`, `child_process`, itp. |
| Brak modułów natywnych | Nie można bezpośrednio używać `bcryptjs`, `postgres` |
| Ograniczony czas wykonania | Maks. 30 sekund (Vercel Pro) |
| Ograniczona pamięć | 128 MB |
| Brak Drizzle ORM | Użyj klientów bazy danych kompatybilnych z edge |

### Przykład Funkcji Edge

```typescript
// app/api/geo/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';

  return Response.json({
    country,
    city,
    timestamp: Date.now(),
  });
}
```

## Strategie Skalowania Poziomego

### Bezstanowy Projekt Aplikacji

Szablon jest zaprojektowany jako bezstanowy w warstwie aplikacji:

| Komponent | Lokalizacja Stanu | Wpływ na Skalowanie |
|---|---|---|
| Sesje | Baza danych lub JWT | Brak współdzielonego stanu między instancjami |
| Zadania w tle | Menedżer zadań (na instancję lub Trigger.dev) | Używaj Trigger.dev dla wielu instancji |
| Przesyłanie plików | Zewnętrzne magazyny (S3, Supabase) | Brak zależności od lokalnego systemu plików |
| Treść CMS | Repozytorium Git (klonowane podczas buildu/startu) | Tylko do odczytu, identyczne dla każdej instancji |
| Buforowanie | In-memory (na instancję) lub Redis | Rozważ Redis dla współdzielonego buforowania |

### Uwagi dotyczące Wielu Instancji

Przy uruchamianiu wielu instancji (Docker Swarm, Kubernetes lub wiele funkcji Vercel):

1. **Zadania w tle**: Używaj Trigger.dev lub Vercel Cron zamiast `LocalJobManager` aby uniknąć duplikowania.
2. **Połączenia z bazą danych**: Włącz connection pooling, aby uniknąć wyczerpania połączeń.
3. **Przechowywanie sesji**: Używaj sesji opartych na bazie danych zamiast in-memory stores.
4. **Unieważnianie pamięci podręcznej**: Zaimplementuj współdzielony cache (Redis) lub zaakceptuj ewentualną spójność z buforowaniem na instancję.

## Monitorowanie na Skalę

### Kluczowe Metryki do Śledzenia

| Metryka | Narzędzie | Próg |
|---|---|---|
| Czas odpowiedzi (p95) | Sentry, Vercel Analytics | < 500ms |
| Wskaźnik błędów | Sentry | < 1% |
| Liczba połączeń bazy danych | Dashboard bazy danych | < 80% maksimum |
| Cold starty funkcji | Vercel Analytics | Monitoruj częstotliwość |
| Współczynnik trafień pamięci podręcznej | Logi aplikacji | > 80% |
| Użycie pamięci | Metryki Vercel/Docker | < 80% limitu |

### Monitorowanie Wydajności Sentry

Szablon konfiguruje Sentry z próbkowaniem trace:

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Dostosuj `tracesSampleRate` w oparciu o wolumen ruchu:

| Dzienne Żądania | Zalecana Częstość Próbkowania |
|---|---|
| < 10 000 | 1,0 (100%) |
| 10 000–100 000 | 0,1 (10%) |
| 100 000–1 000 000 | 0,01 (1%) |
| > 1 000 000 | 0,001 (0,1%) |

## Testowanie Obciążeniowe

### Zalecane Narzędzia

| Narzędzie | Przypadek Użycia | Złożoność |
|---|---|---|
| `autocannon` | Szybkie benchmarki HTTP | Niska |
| `k6` | Skryptowane testy obciążeniowe | Średnia |
| `Artillery` | Złożone scenariusze | Średnia |
| `Locust` | Oparty na Pythonie, rozproszony | Wysoka |

### Przykład Testu Obciążeniowego

```bash
# Szybki benchmark z autocannon
npx autocannon -c 50 -d 30 https://your-app.vercel.app/api/health

# Skrypt k6 dla bardziej szczegółowych testów
k6 run load-test.js
```

### Lista Kontrolna Testów

| Test | Cel | Kryterium Zaliczenia |
|---|---|---|
| Ładowanie strony głównej | 100 równoczesnych użytkowników | p95 < 1s |
| Punkt końcowy API | 200 żądań/sekundę | p95 < 500ms, 0% błędów |
| Zapytanie wyszukiwania | 50 równoczesnych użytkowników | p95 < 2s |
| Przepływ uwierzytelniania | 20 równoczesnych użytkowników | Wszystkie sukcesem, bez timeoutów |

## Lista Kontrolna Skalowalności

| Kategoria | Element | Priorytet |
|---|---|---|
| **Baza Danych** | Włącz connection pooling | Krytyczny |
| **Baza Danych** | Używaj replik do odczytu dla intensywnych obciążeń | Wysoki |
| **Baza Danych** | Dodaj indeksy dla wolnych zapytań | Wysoki |
| **Buforowanie** | Skonfiguruj nagłówki buforowania CDN | Krytyczny |
| **Buforowanie** | Zaimplementuj ISR dla stron treści | Wysoki |
| **Buforowanie** | Dodaj Redis dla współdzielonego buforowania (jeśli wielo-instancyjne) | Średni |
| **Obliczenia** | Używaj edge runtime dla lekkich tras | Średni |
| **Obliczenia** | Optymalizuj cold starty z zewnętrznymi pakietami | Wysoki |
| **Zadania** | Migruj do Trigger.dev dla wielu instancji | Wysoki |
| **Zadania** | Skonfiguruj Vercel Cron dla zaplanowanych zadań | Wysoki |
| **Monitorowanie** | Skonfiguruj Sentry z odpowiednim próbkowaniem | Krytyczny |
| **Monitorowanie** | Skonfiguruj alerty dla wskaźnika błędów i latencji | Wysoki |
| **Testowanie** | Uruchom testy obciążeniowe przed ważnymi wydaniami | Wysoki |
