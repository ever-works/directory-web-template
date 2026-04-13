---
id: items-engagement-endpoints
title: "Dokumentacja API Zaangażowania Elementów"
sidebar_label: "Zaangażowanie Elementów"
---

# Dokumentacja API Zaangażowania Elementów

## Przegląd

Punkty końcowe Zaangażowania Elementów zapewniają dostęp do metryk zaangażowania i wyników popularności elementów katalogu. Obejmują one liczbę wyświetleń, głosów, ocen, ulubionych i komentarzy. Punkt końcowy wyników popularności dodatkowo oblicza ważony ranking uwzględniający metryki zaangażowania, status wyróżnienia i aktualność treści.

## Punkty końcowe

### GET /api/items/engagement

Pobiera metryki zaangażowania dla wielu elementów według ich slugów w jednym żądaniu wsadowym.

**Żądanie**

| Parametr | Typ    | W     | Opis |
|----------|--------|-------|------|
| slugs    | string | query | Rozdzielona przecinkami lista slugów elementów (wymagane, maks. 200) |

**Odpowiedź**
```typescript
{
  metrics: Record<string, {
    views: number;
    votes: number;
    avgRating: number;
    favorites: number;
    comments: number;
  }>;
}
```

**Przykład**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### GET /api/items/popularity-scores

Punkt końcowy debugowania zwracający elementy posortowane według obliczonego wyniku popularności ze szczegółowym rozbiciem czynników oceny. Przydatny do zrozumienia sposobu rankowania elementów przez algorytm sortowania.

**Żądanie**

| Parametr | Typ    | W     | Opis |
|----------|--------|-------|------|
| limit    | number | query | Liczba elementów do zwrócenia (domyślnie: 20, maks.: 100) |
| locale   | string | query | Kod języka dla elementów (domyślnie: "en") |

**Odpowiedź**
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Total computed score (rounded)
    scoreBreakdown: {
      featured: number;          // 10000 if featured, 0 otherwise
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Decays over 180 days
    };
    engagement: {
      views: number;
      votes: number;
      avgRating: number;
      favorites: number;
      comments: number;
    } | null;
    ageInDays: number;
  }>;
}
```

**Przykład**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## Uwierzytelnianie

Oba punkty końcowe są **publiczne** -- uwierzytelnianie nie jest wymagane. Są oznaczone jako `force-dynamic`, aby zapewnić świeże dane przy każdym żądaniu.

## Odpowiedzi błędów

| Status | Opis |
|--------|------|
| 400 | Brakujący wymagany parametr `slugs` lub podano więcej niż 200 slugów (punkt końcowy zaangażowania) |
| 500 | Wewnętrzny błąd serwera -- awaria zapytania do bazy danych |

## Ograniczanie liczby żądań

Brak jawnego ograniczania liczby żądań. Punkt końcowy zaangażowania ogranicza rozmiar wsadu do 200 slugów na żądanie, aby zapobiec nadużyciom. Oba punkty końcowe omijają buforowanie Next.js poprzez `export const dynamic = 'force-dynamic'`.

## Powiązane punkty końcowe

- [Punkty końcowe Config Feature](./config-feature-endpoints) -- Sprawdź, czy funkcje ocen/ulubionych/komentarzy są włączone
