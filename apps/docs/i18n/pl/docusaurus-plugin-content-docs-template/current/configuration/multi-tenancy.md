---
id: multi-tenancy
title: Konfiguracja Multi-Tenant
sidebar_label: Multi-Tenant
sidebar_position: 13
---

# Konfiguracja Multi-Tenant

Ten dokument wyjaśnia, jak działa obsługa wielu najemców (multi-tenant) w Directory Web Template.

## Przegląd

Szablon używa podejścia **wspólnej bazy danych z izolacją na poziomie wierszy**:

- Jedna baza danych PostgreSQL obsługuje wielu **najemców** (strony katalogowe).
- Każda tabela posiada kolumnę `tenant_id`, która ogranicza dane do konkretnego najemcy.
- Wszystkie zapytania automatycznie filtrują według bieżącego najemcy — brak wycieków danych między najemcami.

## Szybka Konfiguracja

### 1. Ustawienie Zmiennej Środowiskowej

Na platformie wdrożeniowej (Vercel, Docker itp.) lub w pliku `.env.local`:

```bash
TENANT_ID="your-unique-tenant-id"
```

Może to być dowolny unikalny ciąg znaków (np. UUID lub czytelny slug jak `"my-directory"`).

### 2. Wdrożenie

Przy pierwszym uruchomieniu aplikacja:

1. Wykona migracje bazy danych (doda kolumnę `tenant_id`, jeśli nie istnieje)
2. Utworzy wiersz najemcy odpowiadający wartości `TENANT_ID`
3. Zmigruje istniejące dane z NULL w `tenant_id` do Twojego najemcy
4. Załaduje domyślne dane (użytkownik admin, role, uprawnienia)

Nie jest wymagany ręczny SQL — wszystko jest automatyczne.

### 3. Weryfikacja

Sprawdź logi serwera pod kątem:

```
[DB Init] Ensured environment tenant 'your-unique-tenant-id' exists
[Tenant Migration] ✓ users: updated 3 rows
[Tenant Migration] ✅ Migration complete: 15 total rows updated across all tables.
```

## Jak Działa Rozwiązywanie Najemcy

Gdy aplikacja musi określić bieżącego najemcę, używa strategii **kaskadowej**:

| Priorytet | Źródło           | Opis                                                              |
| --------- | ---------------- | ----------------------------------------------------------------- |
| 1         | **Sesja**        | `user.tenantId` z tokena JWT (uwierzytelnieni użytkownicy)        |
| 2         | **Zmienna Env**  | Zmienna środowiskowa `TENANT_ID`                                  |
| 3         | **Nagłówek HTTP**| Nagłówek `x-tenant-domain` (dla routingu subdomen)               |
| 4         | **Baza danych**  | Pierwszy aktywny wiersz najemcy (ostateczny fallback)             |

Funkcja `getTenantId()` z `lib/auth/tenant.ts` implementuje ten łańcuch i jest wywoływana przez każde zapytanie bazodanowe.

## Architektura

### Kluczowe Pliki

| Plik                                     | Przeznaczenie                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `lib/auth/tenant.ts`                     | `getTenantId()` — rozwiązywanie najemcy po stronie serwera z buforowaniem     |
| `lib/config/env.ts`                      | Walidacja zmiennej środowiskowej `TENANT_ID`                                  |
| `lib/db/schema.ts`                       | Tabela najemców + FK `tenant_id` we wszystkich tabelach                       |
| `lib/db/initialize.ts`                   | Automatycznie tworzy najemcę środowiskowego + uruchamia migrację danych podczas startu |
| `lib/db/migrate-tenant-data.ts`          | Przypisuje wiersze z NULL w `tenant_id` do bieżącego najemcy                  |
| `lib/auth/index.ts`                      | Callbacki JWT/sesji wstrzykują `tenantId`                                     |
| `components/context/tenant-provider.tsx` | Kontekst React dla dostępu do najemcy po stronie klienta                      |
| `app/api/tenant/route.ts`                | `GET /api/tenant` — zwraca informacje o bieżącym najemcy                      |

### Przepływ Danych

```
Żądanie Użytkownika → getTenantId() → Rozwiązuje z sesji/env/nagłówków/DB
                                               ↓
                             Wszystkie zapytania DB filtrują według tego tenant_id
                                               ↓
                               Zwracane są tylko dane dla tego najemcy
```

### Integracja z Uwierzytelnianiem

- **Logowanie poświadczeniami**: Użytkownicy admin i klienci otrzymują `tenantId` z kolumny `users.tenant_id`.
- **Logowanie OAuth**: Adapter Drizzle jest opakowany, by wstrzykiwać `tenantId` przy tworzeniu użytkownika.
- **Callback JWT**: Odczytuje `tenantId` z rekordu użytkownika i osadza go w tokenie.
- **Callback sesji**: Propaguje `tenantId` do `session.user.tenantId`.
- **Komponenty klienta**: Używają hooka `useTenant()` z `TenantProvider` do informacji o najemcy.

## Wiele Katalogów (Multi-Tenant)

Aby uruchomić wiele stron katalogowych na jednej bazie danych:

1. **Każda strona** ustawia inny `TENANT_ID` w swoim środowisku:
    - Strona A: `TENANT_ID="directory-a-uuid"`
    - Strona B: `TENANT_ID="directory-b-uuid"`

2. **Wszystkie strony** łączą się z **tą samą bazą danych** (`DATABASE_URL`).

3. **Izolacja danych** jest automatyczna — Strona A widzi tylko wiersze, gdzie `tenant_id = 'directory-a-uuid'`.

4. **Użytkownicy, role, komentarze, subskrypcje** i wszystkie inne dane są w pełni izolowane na najemcę.

## Obsługa Istniejących Danych

Podczas aktualizacji z wersji bez obsługi najemców:

- Kolumna `tenant_id` jest dodawana jako **nullable** (nie psuje istniejących danych)
- Przy pierwszym uruchomieniu `migrateNullTenantIds()` automatycznie przypisuje wiersze NULL do rozwiązanego najemcy
- Ta migracja jest **idempotentna** — bezpieczna do wielokrotnego uruchamiania
- Po migracji wszystkie istniejące dane są widoczne pod bieżącym najemcą

## Routing Subdomen (Zaawansowany)

Dla routingu najemców opartego na subdomenach (np. `najemca-a.example.com`):

1. Skonfiguruj reverse proxy, aby dodawał nagłówek `x-tenant-domain`
2. Utwórz rekordy najemców z polami `domain` lub `slug`:
    ```sql
    INSERT INTO tenant (id, name, domain, slug, status)
    VALUES ('uuid', 'Tenant A', 'tenant-a.example.com', 'tenant-a', 'active');
    ```
3. Strategia `resolveFromHeaders()` dopasuje domenę i rozwiąże najemcę

## Schemat Tabeli Najemców

```sql
CREATE TABLE tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  domain TEXT UNIQUE,
  slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
