---
id: internal-endpoints
title: "Wewnętrzne i Systemowe Punkty końcowe"
sidebar_label: "Wewnętrzne i Systemowe"
---

# Wewnętrzne i Systemowe Punkty końcowe

Te punkty końcowe zapewniają operacje na poziomie systemu: inicjalizację bazy danych, konfigurację flag funkcji, sprawdzenia stanu, informacje o wersji i synchronizację repozytorium. Większość jest używana przez platformę samodzielnie, a nie przez końcowych użytkowników.

**Pliki źródłowe:**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## Podsumowanie punktów końcowych

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| GET | `/api/internal/db-init` | Tylko środowisko programistyczne | Wyzwol inicjalizację bazy danych |
| GET | `/api/config/features` | Brak | Pobierz flagi dostępności funkcji |
| GET | `/api/health/database` | Brak | Sprawdzenie stanu bazy danych |
| GET | `/api/version` | Brak | Pobierz informacje o wersji aplikacji |
| GET | `/api/version/sync` | Brak | Pobierz stan synchronizacji |
| POST | `/api/version/sync` | Brak | Wyzwol ręczną synchronizację repozytorium |

---

## GET `/api/internal/db-init`

Wyzwala automatyczną migrację i seed bazy danych, jeśli baza nie została jeszcze zainicjowana.

### Bezpieczeństwo

Ten punkt końcowy jest **dostępny tylko w trybie programistycznym**. W produkcji zwraca 403.

### Odpowiedź: 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Odpowiedź: 403 (Produkcja)

```json
{
  "error": "Not available in production"
}
```

---

## GET `/api/config/features`

Zwraca aktualne flagi dostępności funkcji na podstawie konfiguracji systemu (głównie dostępności bazy danych). Jest to **publiczny punkt końcowy** używany przez interfejs użytkownika do łagodnej obsługi brakujących funkcji.

### Odpowiedź: 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### Odpowiedź: 200 (Brak bazy danych)

Gdy baza danych nie jest skonfigurowana, wszystkie funkcje są wyłączone:

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### Buforowanie

Pomyślne odpowiedzi są buforowane przez 5 minut ze stale-while-revalidate:

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

Odpowiedzi błędów używają `Cache-Control: no-cache`.

---

## GET `/api/health/database`

Lekkie sprawdzenie stanu testujące połączenie z bazą danych poprzez wykonanie `SELECT 1`.

### Odpowiedź: 200 (Zdrowe)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Odpowiedź: 500 (Niezdrowe)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Przypadki użycia

- Sondy życia i gotowości Kubernetes/Docker
- Pulpity monitorowania
- Skrypty weryfikacji wdrożeń
- Sprawdzenia stanu load balancerów

---

## GET `/api/version`

Pobiera kompleksowe informacje o wersji z repozytorium Git treści, w tym szczegóły najnowszego commitu, informacje o autorze, gałąź i stan synchronizacji.

### Odpowiedź: 200

```json
{
  "commit": "a1b2c3d",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new feature for user management",
  "author": "John Doe",
  "repository": "https://github.com/user/repo.git",
  "lastSync": "2024-01-15T10:35:00.000Z",
  "branch": "main"
}
```

### Nagłówki odpowiedzi

| Nagłówek | Wartość | Opis |
|---------|---------|------|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | 1-minutowe buforowanie po stronie klienta |
| `ETag` | `"a1b2c3d-1705312200000"` | Na podstawie skrótu commitu |
| `Last-Modified` | `Mon, 15 Jan 2024 10:30:00 GMT` | Znacznik czasu commitu |

### Odpowiedzi błędów

Wszystkie błędy zawierają ustrukturyzowany format z kodem błędu:

| Status | Kod | Warunek |
|--------|-----|---------|
| 404 | `REPOSITORY_NOT_FOUND` | Katalog Git nie istnieje |
| 404 | `NO_COMMITS` | Repozytorium nie ma commitów |
| 500 | `GIT_ERROR` | Nie można odczytać informacji o commicie |
| 500 | `VALIDATION_ERROR` | Danych commitu brakuje wymaganych pól |
