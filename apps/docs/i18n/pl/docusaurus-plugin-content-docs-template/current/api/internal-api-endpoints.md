---
id: internal-api-endpoints
title: "Wewnętrzne Punkty końcowe API"
sidebar_label: "Wewnętrzne API"
---

# Wewnętrzne Punkty końcowe API

Wewnętrzne API udostępnia punkty końcowe na poziomie systemu używane do operacji infrastrukturalnych. Te punkty końcowe są ograniczone do trybu programistycznego i nie są dostępne w środowisku produkcyjnym.

**Katalog źródłowy:** `template/app/api/internal/`

---

## Inicjalizacja Bazy Danych

Wyzwala automatyczną migrację i seed bazy danych, jeśli baza nie została jeszcze zainicjowana.

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/internal/db-init` |
| **Uwierzytelnianie** | Tylko tryb programistyczny |
| **Środowisko uruchomieniowe** | `nodejs` |
| **Buforowanie** | `force-dynamic` |
| **Źródło** | `internal/db-init/route.ts` |

### Bezpieczeństwo

Ten punkt końcowy jest **dostępny tylko w trybie programistycznym** (`NODE_ENV === 'development'`). W środowisku produkcyjnym zwraca odpowiedź `403 Forbidden`.

### Odpowiedź

**Status 200** -- Inicjalizacja bazy danych zakończona.

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

**Status 403** -- Środowoisko produkcyjne (dostęp zabroniony).

```json
{
  "error": "Not available in production"
}
```

**Status 500** -- Inicjalizacja nie powiodła się.

```json
{
  "success": false,
  "error": "Database initialization failed"
}
```

### Co Robi

Po wywołaniu punkt końcowy dynamicznie importuje i wykonuje `initializeDatabase()` z `@/lib/db/initialize`, która:

1. Uruchamia oczekujące migracje bazy danych Drizzle.
2. Seeduje początkowe dane, jeśli baza danych jest pusta (np. domyślny użytkownik administrator, początkowa konfiguracja).
3. Zapewnia aktualność schematu bazy danych dla środowiska programistycznego.

### Przykład curl

```bash
# Inicjalizuj bazę danych (tylko tryb programistyczny)
curl -s http://localhost:3000/api/internal/db-init
```

### Użycie w TypeScript

```typescript
// Zazwyczaj wywoływane podczas konfiguracji środowiska programistycznego
async function initializeDevDatabase(): Promise<void> {
  const res = await fetch('/api/internal/db-init');
  const data = await res.json();

  if (data.success) {
    console.log('Database initialized successfully');
  } else {
    console.error('Database initialization failed:', data.error);
  }
}
```

### Uwagi implementacyjne

- Funkcja `initializeDatabase()` jest dynamicznie importowana przy użyciu `await import()`, aby uniknąć ładowania kodu inicjalizacji bazy danych w pakietach produkcyjnych.
- Trasa jest skonfigurowana z `export const runtime = 'nodejs'`, aby zapewnić działanie w środowisku uruchomieniowym Node.js (nie Edge), ponieważ operacje na bazie danych wymagają pełnych API Node.js.
- Trasa używa `export const dynamic = 'force-dynamic'`, aby zapobiec buforowaniu odpowiedzi przez Next.js.
- Obsługa błędów używa `safeErrorResponse()` do zwracania ogólnych komunikatów błędów przy jednoczesnym rejestrowaniu szczegółowych błędów po stronie serwera.
- Ten punkt końcowy jest przeznaczony do użytku podczas lokalnej konfiguracji programistycznej i w potokach CI/CD. Nigdy nie powinien być eksponowany w produkcji.

### Powiązane polecenia

Dla ręcznych operacji na bazie danych poza API użyj poleceń CLI:

```bash
# Wygeneruj pliki migracji
pnpm db:generate

# Uruchom migracje
pnpm db:migrate

# Seeduj bazę danych
pnpm db:seed

# Otwórz studio bazy danych
pnpm db:studio
```
