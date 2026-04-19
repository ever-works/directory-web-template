---
id: admin-categories-endpoints
title: Punkty końcowe API Kategorii Administratora
sidebar_label: Admin Categories
sidebar_position: 30
---

# Punkty końcowe API Kategorii Administratora

API Kategorii Administratora zapewnia pełne operacje CRUD do zarządzania kategoriami treści, w tym zmianę kolejności i synchronizację opartą na Git z zewnętrznym repozytorium danych. Wszystkie punkty końcowe wymagają uwierzytelniania administratora za pomocą uwierzytelniania opartego na sesji.

## Podsumowanie tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------|-------------|
| `GET` | `/api/admin/categories` | Administrator | Wyświetl kategorie (paginacja) |
| `POST` | `/api/admin/categories` | Administrator | Utwórz nową kategorię |
| `GET` | `/api/admin/categories/all` | Administrator | Pobierz wszystkie kategorie (z pamięci podręcznej treści) |
| `GET` | `/api/admin/categories/{id}` | Administrator | Pobierz pojedynczą kategorię według ID |
| `PUT` | `/api/admin/categories/{id}` | Administrator | Zaktualizuj kategorię |
| `DELETE` | `/api/admin/categories/{id}` | Administrator | Miękkie lub twarde usunięcie kategorii |
| `PUT` | `/api/admin/categories/reorder` | Administrator | Zmień kolejność kategorii według tablicy ID |
| `GET` | `/api/admin/categories/git` | Administrator | Pobierz status repozytorium Git i kategorie |
| `POST` | `/api/admin/categories/git` | Administrator | Utwórz kategorię przez zatwierdzenie Git |

## Uwierzytelnianie

Wszystkie punkty końcowe zarządzania kategoriami sprawdzają aktywną sesję z uprawnieniami administratora:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## Punkty końcowe

### GET `/api/admin/categories`

Zwraca stronicowaną listę kategorii z opcjonalnym filtrowaniem i sortowaniem.

**Parametry zapytania:**

| Parametr | Typ | Domyślne | Opis |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Numer strony (minimum: 1) |
| `limit` | integer | `10` | Elementy na stronę (1--100) |
| `includeInactive` | string | `"false"` | Uwzględnij nieaktywne kategorie |
| `sortBy` | string | `"name"` | Pole sortowania: `"name"` lub `"id"` |
| `sortOrder` | string | `"asc"` | Kierunek sortowania: `"asc"` lub `"desc"` |

**Odpowiedź (200):**

```json
{
  "success": true,
  "categories": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### POST `/api/admin/categories`

Tworzy nową kategorię. Pole `id` jest opcjonalne i zostanie automatycznie wygenerowane z nazwy, jeśli nie zostanie podane. Po pomyślnym wykonaniu unieważnia pamięci podręczne treści.

**Treść żądania:**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

| Pole | Typ | Wymagane | Opis |
|-------|------|----------|-------------|
| `id` | string | Nie | Slug przyjazny dla URL (`^[a-z0-9-]+$`). Generowany automatycznie, jeśli pominięty. |
| `name` | string | Tak | Nazwa wyświetlana (2--100 znaków) |

**Odpowiedź (201):**

```json
{
  "success": true,
  "category": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 0,
    "createdAt": "2024-01-20T15:30:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  "message": "Category created successfully"
}
```

### GET `/api/admin/categories/all`

Zwraca wszystkie kategorie z pamięci podręcznej treści dla danego języka. Przydatne do rozwijanych list i selektorów w panelu administratora.

**Parametry zapytania:**

| Parametr | Typ | Domyślne | Opis |
|-----------|------|---------|-------------|
| `locale` | string | `"en"` | Kod języka do pobierania treści |

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### GET `/api/admin/categories/{id}`

Pobiera pojedynczą kategorię według jej unikalnego identyfikatora.

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/categories/{id}`

Aktualizuje nazwę istniejącej kategorii. Po pomyślnym wykonaniu unieważnia pamięci podręczne treści.

**Treść żądania:**

```json
{ "name": "Productivity Tools" }
```

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### DELETE `/api/admin/categories/{id}`

Usuwa kategorię. Domyślnie wykonuje miękkie usunięcie (dezaktywację). Użyj parametru zapytania `hard=true` do trwałego usunięcia. Po pomyślnym wykonaniu unieważnia pamięci podręczne treści.

**Parametry zapytania:**

| Parametr | Typ | Domyślne | Opis |
|-----------|------|---------|-------------|
| `hard` | string | `"false"` | Ustaw na `"true"` dla trwałego usunięcia |

**Odpowiedź (200):**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### PUT `/api/admin/categories/reorder`

Zmienia kolejność kategorii na podstawie tablicy identyfikatorów kategorii. Pozycja każdego ID w tablicy określa nową kolejność wyświetlania.

**Treść żądania:**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**Reguły walidacji:**
- `categoryIds` musi być niepustą tablicą
- Wszystkie wartości muszą być ciągami znaków

**Odpowiedź (200):**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### GET `/api/admin/categories/git`

Pobiera status repozytorium Git i kategorie ze skonfigurowanego repozytorium danych GitHub. Wymaga zmiennych środowiskowych `DATA_REPOSITORY` i `GITHUB_TOKEN`.

**Odpowiedź (200):**

```json
{
  "success": true,
  "status": {
    "repository": "ever-co/awesome-time-tracking-data",
    "branch": "main",
    "lastCommit": "abc123def456",
    "lastCommitDate": "2024-01-20T10:30:00.000Z",
    "isUpToDate": true
  },
  "categories": [],
  "message": "Git repository status retrieved successfully"
}
```

### POST `/api/admin/categories/git`

Tworzy nową kategorię i zatwierdza ją bezpośrednio w repozytorium danych GitHub. Wymaga zmiennych środowiskowych `DATA_REPOSITORY` i `GH_TOKEN`.

**Treść żądania:**

```json
{ "id": "productivity", "name": "Productivity" }
```

Zarówno `id`, jak i `name` są wymagane do tworzenia opartego na Git.

**Odpowiedź (200):**

```json
{
  "success": true,
  "category": { "id": "productivity", "name": "Productivity" },
  "message": "Category created and committed to Git repository"
}
```

## Kody błędów

| Status | Błąd | Przyczyna |
|--------|-------|-------|
| `400` | Nieprawidłowe parametry paginacji | Strona < 1 lub limit poza zakresem 1--100 |
| `400` | Nazwa kategorii jest wymagana | Brak `name` w żądaniu tworzenia |
| `400` | categoryIds musi być tablicą | Nieprawidłowy ładunek zmiany kolejności |
| `401` | Brak autoryzacji. Wymagany dostęp administratora. | Brak sesji lub sesja bez uprawnień administratora |
| `404` | Nie znaleziono kategorii | Nieprawidłowe ID kategorii |
| `409` | Kategoria o tej nazwie już istnieje | Zduplikowana nazwa przy tworzeniu/aktualizacji |
| `500` | DATA_REPOSITORY nie jest skonfigurowane | Brak zmiennej środowiskowej dla punktów końcowych Git |
| `500` | Token GitHub nie jest skonfigurowany | Brak `GITHUB_TOKEN` lub `GH_TOKEN` |

## Unieważnianie pamięci podręcznej

Wszystkie operacje zapisu (tworzenie, aktualizacja, usuwanie, zmiana kolejności) wywołują `invalidateContentCaches()`, aby zmiany były natychmiast widoczne w całej aplikacji.

## Powiązana dokumentacja

- [Przegląd punktów końcowych administratora](./admin-endpoints.md)
- [Publiczne punkty końcowe kategorii](./category-endpoints.md)
- [Wzorce odpowiedzi](./response-patterns.md)
- [Walidacja żądań](./request-validation.md)
