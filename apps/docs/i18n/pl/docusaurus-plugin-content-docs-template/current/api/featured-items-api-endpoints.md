---
id: featured-items-api-endpoints
title: "Punkty końcowe API Wyróżnionych Elementów"
sidebar_label: "API Wyróżnionych Elementów"
---

# Punkty końcowe API Wyróżnionych Elementów

API Wyróżnionych Elementów udostępnia publiczny punkt końcowy do pobierania wyróżnionych elementów wyświetlanych na stronie internetowej. Wyróżnione elementy są zarządzane za pomocą panelu administracyjnego i przechowywane w bazie danych z obsługą kolejności, aktywacji i dat wygaśnięcia.

**Źródło:** `template/app/api/featured-items/route.ts`

---

## Pobieranie Wyróżnionych Elementów

Zwraca listę aktywnych wyróżnionych elementów do publicznego wyświetlania. Automatycznie filtruje nieaktywne i (opcjonalnie) wygaśnięte elementy.

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/featured-items` |
| **Uwierzytelnianie** | Brak (publiczny) |

### Parametry zapytania

| Parametr | Typ | Wymagane | Domyślne | Opis |
|----------|-----|----------|----------|------|
| `limit` | `integer` | Nie | `6` | Maksymalna liczba wyróżnionych elementów do zwrócenia (1-50) |
| `includeExpired` | `boolean` | Nie | `false` | Czy uwzględniać elementy po ich dacie `featured_until` |

### Odpowiedź

**Status 200** -- Wyróżnione elementy pobrane pomyślnie.

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
  "count": 1
}
```

### Pola odpowiedzi

| Pole | Typ | Opis |
|------|-----|------|
| `data` | `array` | Tablica obiektów wyróżnionych elementów |
| `count` | `number` | Liczba zwróconych wyróżnionych elementów |
| `data[].id` | `string` | ID rekordu wyróżznionego elementu |
| `data[].itemSlug` | `string` | Identyfikator slug elementu |
| `data[].itemName` | `string` | Nazwa wyświetlana elementu |
| `data[].itemDescription` | `string \| null` | Opis wyróżznionego elementu |
| `data[].itemIconUrl` | `string \| null` | URL ikony elementu |
| `data[].itemImageUrl` | `string \| null` | URL banerów wyróżnienia |
| `data[].featuredOrder` | `number` | Kolejność wyświetlania (wyższa = bardziej widoczny) |
| `data[].isActive` | `boolean` | Czy element jest aktualnie wyróżzniony |
| `data[].featuredAt` | `string` (ISO 8601) | Kiedy element został wyróżzniony |
| `data[].featuredUntil` | `string \| null` (ISO 8601) | Data wygaśnięcia (`null` = brak wygaśnięcia) |
| `data[].createdAt` | `string` (ISO 8601) | Znacznik czasu tworzenia rekordu |
| `data[].updatedAt` | `string \| null` (ISO 8601) | Znacznik czasu ostatniej aktualizacji |

### Sortowanie

Elementy są sortowane według:
1. `featuredOrder` malejąco (wyższy priorytety jako pierwsze)
2. `featuredAt` malejąco (najnowiej wyróżznione jako pierwsze)

### Logika filtrowania

Punkt końcowy stosuje następujące filtry:

1. **Tylko aktywne:** Zwracane są wyłącznie elementy z `isActive = true`.
2. **Sprawdzanie wygaśnięcia** (gdy `includeExpired` jest `false`):
   - Elementy z `featuredUntil = null` są zawsze uwzględniane (bez wygaśnięcia).
   - Elementy z `featuredUntil >= aktualny czas` są uwzględniane (jeszcze nie wygaśnięte).
   - Elementy z `featuredUntil < aktualny czas` są wykluczone.

### Odpowiedź błędu

**Status 500**

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Przykłady curl

```bash
# Pobierz domyślne wyróżnione elementy (top 6, wyklucz wygaśnięte)
curl -s http://localhost:3000/api/featured-items

# Pobierz top 3 wyróżnione elementy
curl -s "http://localhost:3000/api/featured-items?limit=3"

# Uwzględnij wygaśnięte wyróżnione elementy
curl -s "http://localhost:3000/api/featured-items?includeExpired=true"

# Kombinacja parametrów
curl -s "http://localhost:3000/api/featured-items?limit=10&includeExpired=true"
```
