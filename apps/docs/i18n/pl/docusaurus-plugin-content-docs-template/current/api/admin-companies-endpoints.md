---
id: admin-companies-endpoints
title: Punkty końcowe API Firm Administratora
sidebar_label: Admin Companies
sidebar_position: 32
---

# Punkty końcowe API Firm Administratora

API Firm Administratora dostarcza punkty końcowe do zarządzania rekordami firm. Firmy reprezentują organizacje powiązane z wylistowanymi elementami. API obsługuje pełne operacje CRUD z walidacją opartą na Zod, egzekwowaniem unikalności domeny/slug i opcjonalną synchronizacją CRM przy aktualizacjach.

## Podsumowanie tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------|-------------|
| `GET` | `/api/admin/companies` | Administrator | Wyświetl firmy (stronicowane, z wyszukiwaniem) |
| `POST` | `/api/admin/companies` | Administrator | Utwórz nową firmę |
| `GET` | `/api/admin/companies/{id}` | Administrator | Pobierz pojedynczą firmę według UUID |
| `PUT` | `/api/admin/companies/{id}` | Administrator | Zaktualizuj firmę |
| `DELETE` | `/api/admin/companies/{id}` | Administrator | Trwale usuń firmę |

## Uwierzytelnianie

Wszystkie punkty końcowe firm weryfikują, czy sesja ma uprawnienia administratora:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Punkty końcowe

### GET `/api/admin/companies`

Zwraca stronicowaną listę firm z wyszukiwaniem i filtrowaniem statusu. Zwraca również globalne liczby aktywnych i nieaktywnych firm niezależnie od zastosowanych filtrów.

**Parametry zapytania:**

| Parametr | Typ | Domyślne | Opis |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Numer strony (musi być >= 1) |
| `limit` | integer | `10` | Elementy na stronę (1--100) |
| `q` | string | -- | Wyszukaj według nazwy lub domeny (bez rozróżniania wielkości liter) |
| `status` | string | -- | Filtr: `"active"` lub `"inactive"` |

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corporation",
        "website": "https://acme.com",
        "domain": "acme.com",
        "slug": "acme-corporation",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10,
    "activeCount": 40,
    "inactiveCount": 7
  }
}
```

Wartości `meta.activeCount` i `meta.inactiveCount` odzwierciedlają sumy globalne i nie są wpływane przez filtry `q` ani `status`. Pozwala to interfejsowi użytkownika wyświetlać liczby zakładek obok filtrowanych wyników.

### POST `/api/admin/companies`

Tworzy nowy rekord firmy. Dane żądania są walidowane schematem Zod (`createCompanySchema`). Wartości domeny i slug są normalizowane do małych liter. Przed wstawieniem sprawdzana jest unikalność zarówno `domain`, jak i `slug`.

**Treść żądania:**

```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "domain": "acme.com",
  "slug": "acme-corporation",
  "status": "active"
}
```

| Pole | Typ | Wymagane | Opis |
|-------|------|----------|-------------|
| `name` | string | Tak | Nazwa firmy (1--255 znaków) |
| `website` | string (URI) | Nie | Pełny adres URL strony internetowej |
| `domain` | string | Nie | Znormalizowana domena (maks. 255 znaków) |
| `slug` | string | Nie | Identyfikator przyjazny dla URL (`^[a-z0-9-]+$`, maks. 255) |
| `status` | string | Nie | `"active"` lub `"inactive"` (domyślnie: `"active"`) |

**Walidacja:** Używa walidacji schematem Zod. W przypadku błędu zwraca szczegółowe błędy na poziomie pola:

```json
{
  "error": "Validation error",
  "details": [
    { "field": "name", "message": "Company name is required" }
  ]
}
```

**Odpowiedź (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### GET `/api/admin/companies/{id}`

Pobiera pojedynczą firmę według jej UUID.

**Parametry ścieżki:**

| Parametr | Typ | Opis |
|-----------|------|-------------|
| `id` | string (UUID) | Unikalny identyfikator firmy |

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### PUT `/api/admin/companies/{id}`

Aktualizuje istniejącą firmę. Obsługuje częściowe aktualizacje -- zmieniane są tylko podane pola. Walidowane przez `updateCompanySchema`. Unikalność domeny i slug jest ponownie weryfikowana, gdy te pola ulegają zmianie. Po pomyślnej aktualizacji dane firmy są opcjonalnie synchronizowane z systemem CRM.

**Parametry ścieżki:**

| Parametr | Typ | Opis |
|-----------|------|-------------|
| `id` | string (UUID) | Unikalny identyfikator firmy |

**Treść żądania:**

```json
{
  "name": "Acme Corporation Updated",
  "website": "https://acme.com",
  "status": "active"
}
```

Wszystkie pola są opcjonalne. Aktualizowane będą tylko dostarczone pola.

**Synchronizacja CRM:**

Gdy `TWENTY_CRM_ENABLED` nie jest ustawione na `"false"`, zaktualizowana firma jest automatycznie synchronizowana z systemem Twenty CRM. Ta synchronizacja jest nieblokująca -- jeśli się nie powiedzie, API nadal zwraca sukces dla aktualizacji bazy danych:

```typescript
const syncService = createTwentyCrmSyncServiceFromEnv();
const companyPayload = mapCompanyToTwentyCompany(company);
await syncService.upsertCompany(companyPayload);
```

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation Updated",
    "status": "active",
    "updatedAt": "2024-01-20T16:30:00.000Z"
  }
}
```

### DELETE `/api/admin/companies/{id}`

Trwale usuwa firmę. Jest to twarde usunięcie -- rekord jest usuwany z bazy danych. Powiązane linki element-firma są usuwane przez ograniczenia CASCADE.

**Parametry ścieżki:**

| Parametr | Typ | Opis |
|-----------|------|-------------|
| `id` | string (UUID) | Unikalny identyfikator firmy |

**Odpowiedź (200):**

```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

:::caution
Usunięcie firmy jest trwałe i nie można go cofnąć. Wszystkie powiązania elementów z usuniętą firmą zostaną usunięte przez reguły CASCADE bazy danych.
:::

## Reguły walidacji

Dane firmy są walidowane przy użyciu schematów Zod zdefiniowanych w `lib/validations/company.ts`:

| Pole | Reguła |
|-------|------|
| `name` | Wymagane, 1--255 znaków |
| `website` | Opcjonalne, musi być prawidłowym formatem URI |
| `domain` | Opcjonalne, maks. 255 znaków, znormalizowane do małych liter |
| `slug` | Opcjonalne, maks. 255 znaków, tylko małe litery alfanumeryczne i myślniki |
| `status` | Opcjonalne, musi być `"active"` lub `"inactive"` |

## Kody błędów

| Status | Błąd | Przyczyna |
|--------|-------|-------|
| `400` | Błąd walidacji | Błąd walidacji schematu Zod (zawiera szczegóły pola) |
| `400` | Nieprawidłowy parametr strony | Strona nie jest dodatnią liczbą całkowitą |
| `400` | Nieprawidłowy parametr limitu | Limit poza zakresem 1--100 |
| `401` | Brak autoryzacji | Brak lub sesja bez uprawnień administratora |
| `404` | Nie znaleziono firmy | Brak firmy o podanym UUID |
| `409` | Firma z tą domeną już istnieje | Naruszenie unikalności domeny |
| `409` | Firma z tym slugiem już istnieje | Naruszenie unikalności slug |
| `500` | Nie udało się utworzyć/zaktualizować/usunąć firmy | Błąd serwera lub bazy danych |

## Powiązana dokumentacja

- [Przegląd punktów końcowych administratora](./admin-endpoints.md)
- [Wzorce odpowiedzi](./response-patterns.md)
- [Walidacja żądań](./request-validation.md)
