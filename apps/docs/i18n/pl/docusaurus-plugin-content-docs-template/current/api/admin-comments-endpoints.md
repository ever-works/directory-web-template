---
id: admin-comments-endpoints
title: Punkty końcowe API Komentarzy Administratora
sidebar_label: Admin Comments
sidebar_position: 31
---

# Punkty końcowe API Komentarzy Administratora

API Komentarzy Administratora zapewnia możliwości moderacji do zarządzania komentarzami użytkowników. Administratorzy mogą wyświetlać listę, przeglądać, aktualizować i miękko usuwać komentarze. Wszystkie punkty końcowe używają środowiska uruchomieniowego Node.js i wymagają dostępności bazy danych. Sprawdzenia uwierzytelniania zwracają `403 Forbidden` dla użytkowników bez uprawnień administratora.

## Podsumowanie tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------|-------------|
| `GET` | `/api/admin/comments` | Administrator | Wyświetl komentarze (stronicowane, z wyszukiwaniem) |
| `GET` | `/api/admin/comments/{id}` | Administrator | Pobierz pojedynczy komentarz z informacjami o użytkowniku |
| `PUT` | `/api/admin/comments/{id}` | Administrator | Zaktualizuj treść komentarza |
| `DELETE` | `/api/admin/comments/{id}` | Administrator | Miękkie usunięcie komentarza |

## Uwierzytelnianie

Punkty końcowe moderacji komentarzy weryfikują status administratora i zwracają `403 Forbidden` (nie `401`) dla użytkowników bez uprawnień administratora:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}
```

## Wymaganie bazy danych

Punkty końcowe komentarzy sprawdzają dostępność bazy danych przed przetworzeniem żądań:

```typescript
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

Jeśli baza danych nie jest skonfigurowana, przed jakimkolwiek sprawdzeniem uwierzytelniania zwracana jest odpowiednia odpowiedź błędu.

## Punkty końcowe

### GET `/api/admin/comments`

Zwraca stronicowaną listę komentarzy ze skojarzonymi informacjami o użytkowniku. Obsługuje pełnotekstowe wyszukiwanie w treści komentarzy, nazwach użytkowników i adresach e-mail użytkowników. Zwracane są tylko nieusunięte komentarze.

**Parametry zapytania:**

| Parametr | Typ | Domyślne | Opis |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Numer strony dla paginacji |
| `limit` | integer | `10` | Komentarzy na stronę (1--100) |
| `search` | string | `""` | Wyszukaj w treści, nazwie użytkownika lub adresie e-mail |

**Zachowanie wyszukiwania:**

Zapytanie wyszukiwania jest dopasowywane bez rozróżniania wielkości liter (używając `ILIKE`) do:
- Treści komentarza
- Nazwy wyświetlanej użytkownika
- Adresu e-mail użytkownika

Znaki specjalne `%`, `_` i `\` są escapowane, aby zapobiec wstrzyknięciu wzorca SQL.

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "This is a great product! Highly recommended.",
        "rating": 5,
        "userId": "user_456def",
        "itemId": "item_789ghi",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "user": {
          "id": "user_456def",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "image": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

### GET `/api/admin/comments/{id}`

Pobiera konkretny komentarz według jego ID z pełnymi informacjami o profilu użytkownika. Zawiera lewe złączenie z tabelą `clientProfiles` w celu uzyskania danych użytkownika.

**Parametry ścieżki:**

| Parametr | Typ | Opis |
|-----------|------|-------------|
| `id` | string | Unikalny identyfikator komentarza |

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is a great product! Highly recommended.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
}
```

**Wartość zastępcza użytkownika:** Jeśli profil użytkownika nie zostanie znaleziony (usunięty użytkownik), zwracany jest obiekt zastępczy:

```json
{
  "user": {
    "id": "",
    "name": "Unknown User",
    "email": "",
    "image": null
  }
}
```

### PUT `/api/admin/comments/{id}`

Aktualizuje treść konkretnego komentarza. Można modyfikować tylko pole `content`. Komentarz musi istnieć i nie może być miękko usunięty.

**Parametry ścieżki:**

| Parametr | Typ | Opis |
|-----------|------|-------------|
| `id` | string | Unikalny identyfikator komentarza |

**Treść żądania:**

```json
{
  "content": "This is an updated comment with more details."
}
```

| Pole | Typ | Wymagane | Opis |
|-------|------|----------|-------------|
| `content` | string | Tak | Nowy tekst komentarza (nie może być pusty po usunięciu spacji) |

**Reguły walidacji:**
- `content` jest wymagane i nie może być puste ani składać się wyłącznie ze spacji
- Docelowy komentarz musi istnieć i nie może mieć znacznika czasu `deletedAt`

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is an updated comment with more details.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:15:00.000Z",
    "user": { "id": "user_456def", "name": "John Doe", "email": "john.doe@example.com", "image": null }
  },
  "message": "Comment updated successfully"
}
```

### DELETE `/api/admin/comments/{id}`

Wykonuje miękkie usunięcie komentarza poprzez ustawienie znacznika czasu `deletedAt`. Komentarz musi istnieć i nie może być już usunięty. Miękko usunięte komentarze są wykluczone ze wszystkich zapytań listy.

**Parametry ścieżki:**

| Parametr | Typ | Opis |
|-----------|------|-------------|
| `id` | string | Unikalny identyfikator komentarza |

**Odpowiedź (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Model danych komentarza

| Pole | Typ | Nullable | Opis |
|-------|------|----------|-------------|
| `id` | string | Nie | Unikalny identyfikator komentarza |
| `content` | string | Nie | Treść tekstowa komentarza |
| `rating` | integer | Tak | Wartość oceny (1--5) |
| `userId` | string | Nie | ID autora użytkownika |
| `itemId` | string | Nie | ID powiązanego elementu |
| `createdAt` | datetime | Tak | Znacznik czasu tworzenia |
| `updatedAt` | datetime | Tak | Znacznik czasu ostatniej aktualizacji |
| `deletedAt` | datetime | Tak | Znacznik czasu miękkiego usunięcia (null jeśli aktywny) |

## Kody błędów

| Status | Błąd | Przyczyna |
|--------|-------|-------|
| `400` | Treść jest wymagana | Pusta lub brakująca treść przy aktualizacji |
| `403` | Zabronione | Użytkownik bez uprawnień administratora próbuje uzyskać dostęp |
| `404` | Nie znaleziono komentarza | Nieprawidłowe ID lub już miękko usunięty |
| `500` | Wewnętrzny błąd serwera | Awaria bazy danych lub serwera |

## Uwagi implementacyjne

- Komentarze używają **miękkiego usuwania** -- pole `deletedAt` jest ustawiane zamiast usuwania wiersza. Zachowuje to integralność danych i umożliwia potencjalne odzyskanie.
- Wszystkie zapytania listy filtrują za pomocą `isNull(comments.deletedAt)`, aby wykluczyć usunięte komentarze.
- Dane użytkownika są pobierane przez `LEFT JOIN` na `clientProfiles`, zapewniając, że komentarze usuniętych użytkowników są nadal dostępne.
- `runtime` jest ustawiony na `"nodejs"` dla tych tras (nie Edge).

## Powiązana dokumentacja

- [Przegląd punktów końcowych administratora](./admin-endpoints.md)
- [Publiczne punkty końcowe komentarzy](./comment-endpoints.md)
- [Wzorce odpowiedzi](./response-patterns.md)
- [Walidacja żądań](./request-validation.md)
