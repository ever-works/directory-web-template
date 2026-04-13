---
id: featured-items-endpoints
title: "Punkty końcowe API Wyróżnionych Elementów"
sidebar_label: "Wyróżnione Elementy"
---

# Punkty końcowe API Wyróżnionych Elementów

API Wyróżnionych Elementów udostępnia publiczny punkt końcowy do pobierania elementów, które zostały wyróżznione do widocznej prezentacji na stronie. Wyróżnione elementy obsługują kolejność, daty wygaśnięcia i stany aktywny/nieaktywny.

**Plik źródłowy:** `template/app/api/featured-items/route.ts`

## Podsumowanie tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| GET | `/api/featured-items` | Brak | Pobierz aktywne wyróżnione elementy do publicznego wyświetlania |

---

## GET `/api/featured-items`

Zwraca listę aktywnych wyróżnionych elementów do publicznego wyświetlania. Automatycznie filtruje nieaktywne elementy i opcjonalnie wyklucza wygaśnięte elementy na podstawie ich daty `featuredUntil`. Elementy są sortowane według kolejności wyróżnienia (malejąco) i daty wyróżnienia (malejąco).

### Parametry zapytania

| Parametr | Typ | Wymagane | Domyślne | Opis |
|----------|-----|----------|----------|------|
| `limit` | integer | Nie | 6 | Maksymalna liczba elementów do zwrócenia (1-50) |
| `includeExpired` | boolean | Nie | `false` | Czy uwzględniać elementy po ich dacie `featuredUntil` |

### Wymaganie bazy danych

Punkt końcowy sprawdza dostępność bazy danych przed przetwarzaniem. Jeśli baza danych nie jest skonfigurowana, sprawdzenie `checkDatabaseAvailability()` zwraca odpowiednią odpowiedź błędu.

### Kształt odpowiedzi

#### 200 -- Wyróżnione elementy pobrane

```json
{
  "success": true,
  "data": [
    {
      "id": "featured_123abc",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemDescription": "Boost your productivity with this amazing tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemImageUrl": "https://example.com/featured/tool-banner.jpg",
      "featuredOrder": 10,
      "isActive": true,
      "featuredAt": "2024-01-20T10:30:00.000Z",
      "featuredUntil": "2024-02-20T10:30:00.000Z",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "count": 2
}
```

#### 200 -- Brak wyróżnionych elementów

```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

#### 500 -- Błąd serwera

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Model danych

Każdy rekord wyróżznionego elementu zawiera:

| Pole | Typ | Opis |
|------|-----|------|
| `id` | string | Unikalny ID rekordu wyróżznionego elementu |
| `itemSlug` | string | Slug wyróżznionego elementu |
| `itemName` | string | Nazwa wyświetlana |
| `itemDescription` | string (nullable) | Opis do wyróżznionego wyświetlania |
| `itemIconUrl` | string (nullable) | URL ikony elementu |
| `itemImageUrl` | string (nullable) | URL obrazu banera wyróżnienia |
| `featuredOrder` | integer | Priorytet wyświetlania (wyższy = bardziej widoczny) |
| `isActive` | boolean | Czy aktualnie wyróżzniony |
| `featuredAt` | datetime | Kiedy element został wyróżzniony |
| `featuredUntil` | datetime (nullable) | Data wygaśnięcia (null oznacza brak wygaśnięcia) |
| `createdAt` | datetime | Znacznik czasu tworzenia rekordu |
| `updatedAt` | datetime (nullable) | Znacznik czasu ostatniej aktualizacji |

### Zachowanie wygaśnięcia

- Elementy z `featuredUntil: null` nigdy nie wygasą i są zawsze uwzględniane.
- Elementy z datą `featuredUntil` w przeszłości są domyślnie wykluczone.
- Ustawienie `includeExpired=true` omija filtrowanie wygaśnięcia (przydatne do widoków administracyjnych).

### Przykład użycia

```ts
// Pobierz top 3 wyróżnione elementy dla sekcji hero na stronie głównej
const res = await fetch('/api/featured-items?limit=3');
const { data, count } = await res.json();

if (count > 0) {
  data.forEach(item => {
    console.log(`Wyróżzniony: ${item.itemName} (kolejność: ${item.featuredOrder})`);
  });
}
```

### Uwagi

- Błędy są rejestrowane tylko w trybie programistycznym (`NODE_ENV === 'development'`).
- Jest to **publiczny punkt końcowy** -- uwierzytelnianie nie jest wymagane.
- Wyróżnione elementy są zarządzane przez administratorów za pośrednictwem panelu administracyjnego.
