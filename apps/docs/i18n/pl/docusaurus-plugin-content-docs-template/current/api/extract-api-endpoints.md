---
id: extract-api-endpoints
title: "Punkty końcowe API Ekstrakcji"
sidebar_label: "API Ekstrakcji"
---

# Punkty końcowe API Ekstrakcji

API Ekstrakcji udostępnia bezpieczny punkt końcowy proxy do wyodrębniania metadanych elementów (nazwa, opis, kategorie itp.) z podanego URL. Przekazuje żądania do Ever Works Platform API w celu ekstrakcji treści opartej na AI.

**Źródło:** `template/app/api/extract/route.ts`

---

## Wyodrębnianie Metadanych z URL

Wyodrębnia metadane elementów z podanego URL poprzez przekierowanie żądania do Platform API.

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `POST` |
| **Ścieżka** | `/api/extract` |
| **Uwierzytelnianie** | Brak (publiczny, ale wymaga skonfigurowania `PLATFORM_API_URL`) |

### Treść żądania

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `url` | `string` (URI) | Tak | URL, z którego należy wyodrębnić metadane |
| `existingCategories` | `string[]` | Nie | Istniejące nazwy kategorii pomocne przy kategoryzacji AI |

### Odpowiedzi

**Status 200** -- Ekstrakcja zakończona pomyślnie.

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description extracted from the page.",
    "category": "Productivity",
    "tags": ["automation", "workflow"]
  }
}
```

Kształt pola `data` zależy od odpowiedzi Platform API -- zazwyczaj zawiera pola `name`, `description` i sugerowane pola kategoryzacji.

**Status 200** -- Funkcja wyłączona (Platform API nie skonfigurowane).

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

:::note
Gdy `PLATFORM_API_URL` nie jest ustawione, punkt końcowy zwraca status `200` z `featureDisabled: true` zamiast błędu. Umożliwia to interfejsowi użytkownika płynne ukrycie funkcji ekstrakcji.
:::

**Status 400** -- Nieprawidłowe żądanie.

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Status 500** -- Błąd serwera podczas ekstrakcji.

```json
{
  "success": false,
  "error": "Internal server error during extraction"
}
```

### Walidacja

Treść żądania jest walidowana za pomocą Zod:

- `url` musi być poprawnym ciągiem URL.
- `existingCategories` jest opcjonalną tablicą ciągów.

### Przykłady curl

```bash
# Wyodrębnij metadane z URL
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/some-project",
    "existingCategories": ["Developer Tools", "Open Source"]
  }'

# Minimalne żądanie (tylko URL)
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/product" }'
```

### Użycie w TypeScript

```typescript
interface ExtractRequest {
  url: string;
  existingCategories?: string[];
}
```
