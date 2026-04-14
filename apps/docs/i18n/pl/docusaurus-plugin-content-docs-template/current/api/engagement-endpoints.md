---
id: engagement-endpoints
title: "Punkty końcowe API Zaangażowania"
sidebar_label: "Zaangażowanie"
---

# Punkty końcowe API Zaangażowania

API Zaangażowania udostępnia punkty końcowe do pobierania metryk zaangażowania (wyświetlenia, głosy, oceny, ulubione, komentarze) i obliczania wyników popularności elementów. Te punkty końcowe napędzają funkcje sortowania, rankingu i analizy szablonu.

**Pliki źródłowe:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## Podsumowanie punktów końcowych

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| GET | `/api/items/engagement` | Brak | Pobierz metryki zaangażowania dla wielu elementów |
| GET | `/api/items/popularity-scores` | Brak | Pobierz elementy posortowane według obliczonego wyniku popularności |

Oba punkty końcowe używają `dynamic = 'force-dynamic'`, aby zapewnić świeże dane przy każdym żądaniu.

---

## GET `/api/items/engagement`

Pobiera metryki zaangażowania dla wielu elementów identyfikowanych przez ich slugi. Zwraca mapę slugów do metryk.

### Parametry zapytania

| Parametr | Typ | Wymagane | Domyślne | Opis |
|----------|-----|----------|----------|------|
| `slugs` | string | **Tak** | -- | Rozdzielona przecinkami lista slugów elementów |

### Ograniczenia

- Parametr `slugs` jest **wymagany**. Pominięcie go zwraca błąd 400.
- Maksymalnie **200 slugów** na żądanie. Przekroczenie tego limitu zwraca błąd 400.

### Kształt odpowiedzi

#### 200 -- Metryki pobrane

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 200 -- Puste (brak slugów po parsowaniu)

```json
{
  "metrics": {}
}
```

#### 400 -- Brakujące slugi

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Za dużo slugów

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Błąd serwera

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Przykład użycia

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Dostęp do metryk poszczególnych elementów
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## GET `/api/items/popularity-scores`

Punkt końcowy debug/analityczny zwracający elementy posortowane według obliczonego wyniku popularności. Algorytm oceniania używa skalowania logarytmicznego i uwzględnia wiele sygnałów zaangażowania oraz aktualność.

### Parametry zapytania

| Parametr | Typ | Wymagane | Domyślne | Opis |
|----------|-----|----------|----------|------|
| `limit` | integer | Nie | `20` | Liczba elementów do zwrócenia (maks. 100) |
| `locale` | string | Nie | `"en"` | Locale dla pobierania danych elementów |

### Algorytm oceniania

Wynik popularności jest obliczany jako suma poważonych składników:

| Składnik | Waga | Formuła |
|----------|------|--------|
| Bonus wyróżnienia | +10 000 | Płaski bonus dla wyróżnionych elementów |
| Wyświetlenia | 1000x | `log10(views + 1) * 1000` |
| Głosy | 1200x | `log10(max(votes, 0) + 1) * 1200` |
| Średnia ocena | 500x | `avgRating * 500` |
| Ulubione | 1100x | `log10(favorites + 1) * 1100` |
| Komentarze | 1000x | `log10(comments + 1) * 1000` |
| Aktualność (poniżej 30 dni) | do +1000 | Liniowy zanik przez 30 dni |
| Aktualność (30-90 dni) | do +500 | Liniowy zanik przez następne 60 dni |
| Aktualność (90-180 dni) | do +250 | Liniowy zanik przez następne 90 dni |

Elementy bez danych zaangażowania otrzymują heurystyczny wynik zapasowy oparty na liczbie tagów, długości nazwy, obecności ikony i istnieniu kodu promocyjnego.

### Kształt odpowiedzi

#### 200 -- Wyniki pobrane

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```
