---
id: view-tracking
title: Zobacz śledzenie i zaangażowanie
sidebar_label: Zobacz śledzenie
sidebar_position: 35
---

# Zobacz śledzenie i zaangażowanie

Szablon zawiera system śledzenia wyświetleń dbający o prywatność, który rejestruje unikalne dzienne wyświetlenia każdego elementu. Obsługuje liczbę wyświetleń na stronach elementów, analizę pulpitów nawigacyjnych, rankingi popularnych elementów i punktację popularności.

## Przegląd architektury

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## Potok przetwarzania

Gdy użytkownik odwiedza stronę ze szczegółami elementu, komponent `ItemViewTracker` uruchamia żądanie POST. Serwer przetwarza go poprzez wieloetapowy potok:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

###Format odpowiedzi

```json
{ "success": true, "counted": true }
```

| Odpowiedź | Znaczenie |
|--------------|--------|
| `counted: true` | Zarejestrowano nowy widok |
| `counted: false` | Duplikat na dzisiaj (ta sama przeglądarka + przedmiot + data) |
| `counted: false, reason: "bot"` | Wykryto klienta użytkownika bota |
| `counted: false, reason: "owner"` | Uwierzytelniony użytkownik przeglądający swój własny przedmiot |

## Śledzenie po stronie klienta `ItemViewTracker` to komponent klienta, który uruchamia pojedyncze żądanie POST na zamontowaniu:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

Moduł śledzący wykorzystuje podejście najlepszego wysiłku: awarie są dyskretnie ignorowane, więc śledzenie wyświetleń nigdy nie zakłóca doświadczenia użytkownika.

## Wykrywanie botów

Moduł `lib/utils/bot-detection.ts` przechowuje listę znanych wzorców klientów użytkownika botów, w tym roboty indeksujące wyszukiwarek, narzędzia monitorujące i zautomatyzowani klienci. Po wykryciu bota punkt końcowy zwraca pomyślną odpowiedź z wartością `counted: false` bez dotykania bazy danych.

## Identyfikacja widza

Wyświetlenia są przypisywane identyfikatorowi przeglądającego przechowywanemu we własnym pliku cookie obsługującym tylko protokół HTTP:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### Właściwości prywatności

- **Brak danych osobowych** – plik cookie zawiera wyłącznie losowy identyfikator UUID, a nie tożsamość użytkownika.
- **Tylko HTTP** – JavaScript nie może odczytać pliku cookie, co uniemożliwia eksfiltrację śledzenia w oparciu o XSS.
- **Niedbałość tej samej witryny** – plik cookie nie jest wysyłany w przypadku żądań pochodzących z różnych źródeł.
- **Flaga bezpieczeństwa** — wymuszona w środowisku produkcyjnym w celu wymagania protokołu HTTPS.
- **Brak usług stron trzecich** – wszystkie dane śledzenia pozostają w Twojej bazie danych.

## Codzienna deduplikacja

Podstawowa logika nagrywania wykorzystuje `ON CONFLICT DO NOTHING` PostgreSQL:

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

Tabela `itemViews` ma unikalne ograniczenie dotyczące `(itemId, viewerId, viewedDateUtc)` . Pierwszy widok dnia dla pary przeglądający-element wstawia wiersz i zwraca `true` . Kolejne wyświetlenia tego samego dnia są dyskretnie pomijane. Data jest obliczana w formacie UTC `YYYY-MM-DD` w celu zapewnienia spójnej deduplikacji niezależnie od strefy czasowej.

## Wykluczenie właściciela

Gdy uwierzytelniony użytkownik przegląda swój własny przedmiot, wyświetlenie nie jest liczone:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

Uniemożliwia to właścicielom przedmiotów sztuczne zwiększanie liczby wyświetleń.

## Zapytania agregujące

Plik `item-view.queries.ts` eksportuje kilka funkcji do celów analitycznych:

| Funkcja | Typ zwrotu | Opis |
|--------------|------------|------------|
| `getTotalViewsCount(slugs)` | `number` | Łączna liczba wyświetleń wszystkich ślimaków przedmiotów |
| `getRecentViewsCount(slugs, days)` | `number` | Wyświetlenia w przesuwanym oknie (domyślnie 7 dni) |
| `getDailyViewsData(slugs, days)` | `Map<string, number>` | Mapa z kluczem daty dla wykresów przebiegu w czasie |
| `getViewsPerItem(slugs)` | `Map<string, number>` | Łączna liczba wyświetleń rankingów na element |

## Integracja z analityką

### Punktacja popularności

Liczniki wyświetleń są uwzględniane w logarytmicznym algorytmie punktacji popularności używanym przez system kart współdzielonych:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

Dzięki temu elementy z dużą liczbą wyświetleń zajmują wyższą pozycję w trybie sortowania „Popularne”, jednocześnie zapobiegając niekontrolowanym wynikom przedmiotów wirusowych.

### Panel klienta

Panel klienta pod adresem `/client/dashboard` wyświetla:
- Łączna liczba wyświetleń wszystkich przesłanych elementów
- Wyświetlenia w ciągu ostatnich 7 dni ze wskaźnikami trendu
- Dzienny wykres wyświetleń poprzez `getDailyViewsData` ### Panel administracyjny

Panel administratora używa `GET /api/admin/dashboard/stats` do wyświetlania metryk obejmujących całą witrynę. Punkt końcowy analizy geograficznej zapewnia rozkład geograficzny widoków.

## Obsługa błędów

Błędy śledzenia widoku są obsługiwane w trybie cichym w środowisku produkcyjnym:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

Tryb programistyczny rejestruje błędy w celu debugowania. Produkcja tłumi sygnał wyjściowy konsoli, aby uniknąć hałasu.

## Konfiguracja

Śledzenie widoków działa automatycznie, bez wymaganych zmiennych środowiskowych. System z wdziękiem ulega degradacji:

- **Brak bazy danych** — punkt końcowy zwraca 503, a klient ignoruje błąd.
- **Tryb symulacji bazy danych** — po włączeniu widoki są śledzone w oparciu o symulowane dane.
- **Flagi funkcji** – liczba wyświetleń jest wyświetlana warunkowo na podstawie ustawień szablonu.

## Dostępność

- `ItemViewTracker` nie renderuje żadnych elementów DOM, zapewniając zerowy wpływ na układ strony i czytniki ekranu.
- Liczniki wyświetleń wyświetlane na kartach korzystają z atrybutów `aria-label` w kontekście czytnika ekranu.
- Wykresy widoku pulpitu nawigacyjnego zawierają nagłówki opisowe i tekst podsumowania.

## Powiązana dokumentacja

- [Komponenty panelu kontrolnego](/docs/template/components/dashboard-components) -- Wyświetlanie statystyk
- [Komponenty karty udostępnionej](/docs/template/components/shared-card-components) -- Punktacja popularności
– [Admin Analytics](/docs/template/features/admin-analytics) – Dane dotyczące widoku całej witryny
– [Głosowanie i komentarze](/docs/template/features/voting-comments) – Inne funkcje angażujące
