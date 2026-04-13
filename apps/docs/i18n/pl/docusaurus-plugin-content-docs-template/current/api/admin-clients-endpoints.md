---
id: admin-clients-endpoints
title: Punkty końcowe API Klientów Administratora
sidebar_label: Admin Clients
sidebar_position: 38
---

# Punkty końcowe API Klientów Administratora

API Klientów udostępnia punkty końcowe do zarządzania profilami klientów, w tym tworzenie, aktualizacje, zaawansowane wyszukiwanie, operacje zbiorcze, analitykę panelu i kompleksowe statystyki. Klienci reprezentują profile użytkowników końcowych powiązane z kontami uwierzytelniającymi. Wszystkie punkty końcowe wymagają uwierzytelniania administratora.

## Ścieżka bazowa

```
/api/admin/clients
```

## Podsumowanie tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
| -------- | --------------------------------------- | ----- | ------------------------------------ |
| `GET` | `/api/admin/clients` | Administrator | Pobierz stronicowaną listę klientów |
| `POST` | `/api/admin/clients` | Administrator | Utwórz nowy profil klienta |
| `GET` | `/api/admin/clients/stats` | Administrator | Pobierz kompleksowe statystyki klientów |
| `GET` | `/api/admin/clients/dashboard` | Administrator | Pobierz połączone dane panelu |
| `GET` | `/api/admin/clients/advanced-search` | Administrator | Zaawansowane wyszukiwanie z wieloma filtrami |
| `PUT` | `/api/admin/clients/bulk` | Administrator | Zbiorcza aktualizacja profili klientów |
| `DELETE` | `/api/admin/clients/bulk` | Administrator | Zbiorcze usuwanie profili klientów |
| `GET` | `/api/admin/clients/{clientId}` | Administrator | Pobierz klienta według ID |
| `PUT` | `/api/admin/clients/{clientId}` | Administrator | Zaktualizuj profil klienta |
| `DELETE` | `/api/admin/clients/{clientId}` | Administrator | Usuń profil klienta |

---

## Wyświetl listę klientów

```
GET /api/admin/clients
```

Zwraca stronicowaną listę profili klientów z podstawowym filtrowaniem.

**Parametry zapytania:**

| Parametr | Typ | Domyślne | Opis |
| ------------- | ------- | ------- | ------------------------------------------------------ |
| `page` | integer | `1` | Numer strony (minimum: 1) |
| `limit` | integer | `10` | Wyniki na stronę (1--100) |
| `search` | string | -- | Wyszukaj według nazwy lub adresu e-mail |
| `status` | string | -- | Filtr: `active`, `inactive`, `suspended`, `trial` |
| `plan` | string | -- | Filtr: `free`, `standard`, `premium` |
| `accountType` | string | -- | Filtr: `individual`, `business`, `enterprise` |
| `provider` | string | -- | Filtruj według dostawcy uwierzytelniania |

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client_123abc",
        "displayName": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Tech Corp Inc",
        "status": "active",
        "plan": "premium",
        "accountType": "business",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastActiveAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10
  }
}
```

---

## Utwórz klienta

```
POST /api/admin/clients
```

Tworzy nowy profil klienta. Jeśli dla podanego adresu e-mail nie istnieje konto użytkownika, automatycznie tworzone jest nowe konto z tymczasowym hasłem. Uruchamia synchronizację CRM, gdy jest włączona.

**Treść żądania:**

| Pole | Typ | Wymagane | Opis |
| ---------------- | ------- | -------- | -------------------------------------------- |
| `email` | string | Tak | Adres e-mail klienta |
| `displayName` | string | Nie | Nazwa wyświetlana (domyślnie prefiks e-mail) |
| `username` | string | Nie | Unikalna nazwa użytkownika |
| `bio` | string | Nie | Biografia klienta |
| `jobTitle` | string | Nie | Stanowisko pracy |
| `company` | string | Nie | Nazwa firmy |
| `industry` | string | Nie | Sektor branżowy |
| `phone` | string | Nie | Numer telefonu |
| `website` | string | Nie | Adres URL strony internetowej |
| `location` | string | Nie | Lokalizacja |
| `accountType` | string | Nie | `individual` (domyślnie), `business`, `enterprise` |
| `status` | string | Nie | `active` (domyślnie), `inactive`, `suspended`, `trial` |
| `plan` | string | Nie | `free` (domyślnie), `standard`, `premium` |

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "id": "client_789ghi",
    "displayName": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "plan": "premium",
    "accountType": "business",
    "createdAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Client created successfully"
}
```

---

## Pobierz statystyki klientów

```
GET /api/admin/clients/stats
```

Zwraca kompleksową analitykę wszystkich klientów, pogrupowaną według przeglądu, wzrostu, planów, typów kont, zaangażowania, demografii i dostawców uwierzytelniania.

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 1247,
      "activeClients": 1156,
      "inactiveClients": 67,
      "suspendedClients": 24,
      "trialClients": 89
    },
    "growth": {
      "newClientsToday": 3,
      "newClientsThisWeek": 18,
      "newClientsThisMonth": 45,
      "growthRate": 3.8
    },
    "plans": {
      "free": 856,
      "standard": 267,
      "premium": 124,
      "conversionRate": 31.4
    },
    "accountTypes": {
      "individual": 789,
      "business": 356,
      "enterprise": 102
    },
    "engagement": {
      "averageSubmissions": 12.5,
      "totalSubmissions": 15587,
      "activeThisWeek": 892,
      "activeThisMonth": 1034
    },
    "demographics": {
      "topCountries": [{ "country": "United States", "count": 456 }],
      "topCompanies": [{ "company": "Tech Corp Inc", "count": 25 }],
      "topIndustries": [{ "industry": "Technology", "count": 234 }]
    },
    "providers": { "google": 567, "github": 234, "email": 446 }
  }
}
```

---

## Panel

```
GET /api/admin/clients/dashboard
```

Zwraca połączoną odpowiedź ze stronicowaną listą klientów, zagregowanymi statystykami i metadanymi paginacji. Obsługuje wszystkie podstawowe filtry oraz parametry zakresu dat.

**Dodatkowe parametry zapytania:**

| Parametr | Typ | Opis |
| --------------- | ------ | ------------------------------------------ |
| `createdAfter` | string | Data ISO lub `YYYY-MM-DD` -- utworzono po |
| `createdBefore` | string | Data ISO lub `YYYY-MM-DD` -- utworzono przed |

---

## Zaawansowane wyszukiwanie

```
GET /api/admin/clients/advanced-search
```

Wykonuje wielowymiarowe wyszukiwanie w profilach klientów. Oprócz podstawowych filtrów listy obsługuje wyszukiwania według konkretnych pól, zakresy liczbowe, flagi logiczne i zakresy dat. Zwraca metadane wyszukiwania, w tym zastosowane filtry i czas wykonania.

**Dodatkowe parametry zapytania:**

| Parametr | Typ | Opis |
| ------------------ | ------- | ---------------------------------------------- |
| `sortBy` | string | `createdAt`, `updatedAt`, `name`, `email`, `company`, `totalSubmissions` |
| `sortOrder` | string | `asc` lub `desc` |
| `createdAfter` | string | Filtr dat ISO |
| `createdBefore` | string | Filtr dat ISO |
| `emailDomain` | string | Filtruj według domeny e-mail (np. `example.com`) |
| `companySearch` | string | Wyszukaj w nazwach firm |
| `locationSearch` | string | Wyszukaj w lokalizacjach |
| `industrySearch` | string | Wyszukaj w branżach |
| `minSubmissions` | integer | Minimalna liczba zgłoszeń |
| `maxSubmissions` | integer | Maksymalna liczba zgłoszeń |
| `emailVerified` | boolean | Filtruj według statusu weryfikacji e-mail |
| `twoFactorEnabled` | boolean | Filtruj według statusu 2FA |
| `hasAvatar` | boolean | Filtruj klientów z/bez avatara |
| `hasWebsite` | boolean | Filtruj klientów z/bez strony internetowej |
| `hasPhone` | boolean | Filtruj klientów z/bez numeru telefonu |

**Odpowiedź (200):**

```json
{
  "success": true,
  "data": {
    "clients": [{ "id": "client_123abc", "..." : "..." }],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 },
    "searchMetadata": {
      "appliedFilters": { "status": "active", "plan": "premium" },
      "searchTime": 45.2
    }
  }
}
```

---

## Operacje zbiorcze

### Zbiorcza aktualizacja

```
PUT /api/admin/clients/bulk
```

Aktualizuje wiele profili klientów w jednym żądaniu. Każdy obiekt klienta musi zawierać pole `id` oraz pola do aktualizacji. Pojedyncze błędy nie przerywają całej partii.

**Treść żądania:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### Zbiorcze usuwanie

```
DELETE /api/admin/clients/bulk
```

Trwale usuwa wiele profili klientów. Każdy obiekt w tablicy musi zawierać pole `id`.

**Treść żądania:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**Odpowiedź (200) -- oba punkty końcowe zbiorcze:**

```json
{
  "success": true,
  "message": "Bulk update completed: 2 successful, 1 failed",
  "results": [{ "index": 0, "success": true }],
  "errors": [{ "index": 2, "error": "Client not found" }],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Pobierz / Zaktualizuj / Usuń klienta

### Pobierz klienta

```
GET /api/admin/clients/{clientId}
```

Zwraca kompletny profil klienta, w tym nazwę wyświetlaną, firmę, plan, typ konta i znaczniki czasu aktywności.

### Zaktualizuj klienta

```
PUT /api/admin/clients/{clientId}
```

Częściowa aktualizacja -- modyfikowane są tylko podane pola. Uruchamia synchronizację CRM, gdy firma lub dane profilu ulegają zmianie.

**Treść żądania (wszystkie pola opcjonalne):**

```json
{
  "displayName": "John Doe Updated",
  "username": "johndoe_updated",
  "bio": "Senior Developer",
  "jobTitle": "Lead Developer",
  "company": "Tech Corp Inc",
  "status": "active",
  "plan": "premium",
  "accountType": "business"
}
```

### Usuń klienta

```
DELETE /api/admin/clients/{clientId}
```

Trwale usuwa profil klienta. Tej akcji nie można cofnąć.

**Odpowiedź (200):**

```json
{ "success": true, "message": "Client deleted successfully" }
```

---

## Reguły walidacji

| Pole | Reguła |
| ------------- | ---------------------------------------------------------- |
| `email` | Wymagane do tworzenia; prawidłowy format e-mail |
| `status` | Musi być `active`, `inactive`, `suspended` lub `trial` |
| `plan` | Musi być `free`, `standard` lub `premium` |
| `accountType` | Musi być `individual`, `business` lub `enterprise` |
| `clients` | Zbiorczo: niepusta tablica z wymaganym `id` na każdym obiekcie |

## Kody błędów

| Status | Znaczenie |
| ------ | ------------------------------------------------------ |
| `400` | Błąd walidacji, brak adresu e-mail, błąd tworzenia użytkownika |
| `401` | Wymagane uwierzytelnianie |
| `403` | Wymagane uprawnienia administratora |
| `404` | Nie znaleziono klienta |
| `500` | Wewnętrzny błąd serwera |

## Powiązana dokumentacja

- [API Użytkowników Administratora](./admin-users-endpoints.md) -- zarządzanie kontami użytkowników
- [API Ról Administratora](./admin-roles-endpoints.md) -- zarządzanie rolami i uprawnieniami
- [Uwierzytelnianie](../architecture/nextauth-configuration.md) -- zarządzanie sesjami i zabezpieczenia
