---
id: reports-endpoints
title: "Punkty końcowe raportów"
sidebar_label: "Raporty"
---

# Punkty końcowe raportów

System raportów umożliwia uwierzytelnionym użytkownikom oznaczanie nieodpowiednich treści oraz dostarcza administratorom narzędzia do przeglądania, moderowania i rozwiązywania raportów. Raporty obsługują typy treści, w tym elementy i komentarze, z wbudowaną ochroną przed duplikatami.

## Przegląd

| Punkt końcowy | Metoda | Uwierzytelnianie | Opis |
|---|---|---|---|
| `/api/reports` | POST | Użytkownik | Prześlij raport treści |
| `/api/admin/reports` | GET | Administrator | Wyświetl listę raportów z filtrowaniem |
| `/api/admin/reports/stats` | GET | Administrator | Pobierz statystyki raportów |
| `/api/admin/reports/[id]` | GET | Administrator | Pobierz pojedynczy raport |
| `/api/admin/reports/[id]` | PUT | Administrator | Zaktualizuj status i rozwiązanie raportu |

## Publiczne punkty końcowe

### Prześlij raport

```
POST /api/reports
```

Uwierzytelnieni użytkownicy mogą zgłaszać elementy lub komentarze zawierające nieodpowiednie treści. Każdy użytkownik może zgłosić tę samą treść tylko raz (zapobieganie duplikatom za pomocą sprawdzenia `hasUserReportedContent`). Zablokowani użytkownicy (zawieszeni lub zbanowani) nie mogą przesyłać raportów.

**Uwierzytelnianie:** Wymagane (oparte na sesji)

**Treść żądania:**

```json
{
  "contentType": "item",
  "contentId": "awesome-productivity-tool",
  "reason": "spam",
  "details": "This tool is promoting malicious software"
}
```

| Pole | Typ | Wymagane | Opis |
|---|---|---|---|
| `contentType` | string | Tak | Typ treści: `"item"` lub `"comment"` |
| `contentId` | string | Tak | ID lub slug zgłaszanej treści |
| `reason` | string | Tak | Jeden z: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |
| `details` | string | Nie | Dodatkowy kontekst dotyczący raportu |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "awesome-productivity-tool",
    "reason": "spam",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Odpowiedzi błędów:**

| Status | Warunek |
|---|---|
| 400 | Nieprawidłowy typ treści, brak ID treści lub nieprawidłowy powód |
| 401 | Użytkownik nie jest uwierzytelniony |
| 403 | Wymagany profil klienta lub użytkownik jest zawieszony/zbanowany |
| 404 | Nie znaleziono profilu klienta |
| 409 | Użytkownik już zgłosił tę treść |
| 500 | Wewnętrzny błąd serwera |

**Źródło:** `template/app/api/reports/route.ts`

## Punkty końcowe administratora

Wszystkie punkty końcowe administratora wymagają, aby `session.user.isAdmin` było prawdą.

### Lista raportów

```
GET /api/admin/reports
```

Zwraca paginowaną listę raportów treści wraz z informacjami o zgłaszającym. Obsługuje filtrowanie według statusu, typu treści i powodu, a także wyszukiwanie tekstu w ID treści, szczegółach oraz nazwie/e-mailu zgłaszającego.

**Parametry zapytania:**

| Parametr | Typ | Domyślne | Opis |
|---|---|---|---|
| `page` | integer | 1 | Numer strony (minimum 1) |
| `limit` | integer | 10 | Wyniki na stronę (1-100) |
| `search` | string | - | Wyszukaj w ID treści, szczegółach, nazwie/e-mailu zgłaszającego |
| `status` | string | - | Filtr: `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `contentType` | string | - | Filtr: `"item"`, `"comment"` |
| `reason` | string | - | Filtr: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "rpt_abc123",
        "contentType": "item",
        "contentId": "some-item-slug",
        "reason": "spam",
        "status": "pending",
        "details": "Suspicious content",
        "reportedBy": "client_456",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

**Źródło:** `template/app/api/admin/reports/route.ts`

### Pobierz statystyki raportów

```
GET /api/admin/reports/stats
```

Zwraca zbiorcze statystyki raportów, w tym liczby według statusu, typu treści i powodu.

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "total": 156,
    "pendingCount": 23,
    "resolvedCount": 120,
    "byStatus": {
      "pending": 23,
      "reviewed": 10,
      "resolved": 120,
      "dismissed": 3
    },
    "byContentType": {
      "item": 100,
      "comment": 56
    },
    "byReason": {
      "spam": 80,
      "inappropriate": 45,
      "harassment": 20,
      "other": 11
    }
  }
}
```

**Źródło:** `template/app/api/admin/reports/stats/route.ts`

### Pobierz raport według ID

```
GET /api/admin/reports/[id]
```

Pobiera pojedynczy raport z pełnymi szczegółami, w tym informacjami o zgłaszającym i recenzencie.

**Parametry ścieżki:**

| Parametr | Typ | Opis |
|---|---|---|
| `id` | string | ID raportu |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "some-item-slug",
    "reason": "spam",
    "status": "reviewed",
    "details": "Suspicious content",
    "reportedBy": "client_456",
    "reviewedBy": "admin_789",
    "reviewNote": "Confirmed as spam",
    "resolution": "content_removed",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-21T09:00:00.000Z"
  }
}
```

| Status | Warunek |
|---|---|
| 403 | Nie jest administratorem |
| 404 | Nie znaleziono raportu |

**Źródło:** `template/app/api/admin/reports/[id]/route.ts`

### Aktualizuj raport

```
PUT /api/admin/reports/[id]
```

Aktualizuje status, rozwiązanie i notatkę recenzenta raportu. Po ustawieniu rozwiązania system automatycznie wykonuje odpowiednie działanie moderacyjne (usunięcie treści, ostrzeżenie użytkownika, zawieszenie lub zbanowanie).

**Treść żądania:**

```json
{
  "status": "resolved",
  "resolution": "content_removed",
  "reviewNote": "Confirmed spam content, removed from listing"
}
```

| Pole | Typ | Wymagane | Opis |
|---|---|---|---|
| `status` | string | Nie | `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `resolution` | string | Nie | `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"` |
| `reviewNote` | string | Nie | Notatki administratora dotyczące recenzji |

**Działania moderacyjne według rozwiązania:**

Następujące automatyczne działania są wyzwalane na podstawie wartości rozwiązania:

| Rozwiązanie | Działanie |
|---|---|
| `content_removed` | Wywołuje `removeContent()` w celu usunięcia zgłoszonego elementu lub komentarza |
| `user_warned` | Wywołuje `warnUser()` w celu wydania ostrzeżenia właścicielowi treści |
| `user_suspended` | Wywołuje `suspendUser()` w celu zawieszenia konta właściciela treści |
| `user_banned` | Wywołuje `banUser()` w celu trwałego zbanowania właściciela treści |
| `no_action` | Nie są podejmowane żadne działania moderacyjne |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "id": "rpt_abc123",
    "status": "resolved",
    "resolution": "content_removed",
    "reviewNote": "Confirmed spam content"
  },
  "moderationResult": {
    "success": true,
    "message": "Content removed successfully"
  }
}
```

| Status | Warunek |
|---|---|
| 400 | Nieprawidłowy status lub wartość rozwiązania; nie znaleziono właściciela treści dla działań na poziomie użytkownika |
| 403 | Nie jest administratorem |
| 404 | Nie znaleziono raportu |

**Źródło:** `template/app/api/admin/reports/[id]/route.ts`

## Model danych

Raporty używają następujących enumów zdefiniowanych w `lib/db/schema`:

- **ReportContentType:** `"item"`, `"comment"`
- **ReportReason:** `"spam"`, `"harassment"`, `"inappropriate"`, `"other"`
- **ReportStatus:** `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"`
- **ReportResolution:** `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"`

## Integracja z moderacją

Gdy raport jest rozwiązywany z rozwiązaniem na poziomie użytkownika (`user_warned`, `user_suspended`, `user_banned`), system:

1. Wyszukuje właściciela treści przez `getContentOwner()`
2. Wykonuje odpowiednią funkcję moderacyjną z `lib/services/moderation.service`
3. Używa `reviewNote` jako powodu dla działania moderacyjnego
4. Rejestruje ID administratora jako recenzenta

Jeśli działanie moderacyjne nie powiedzie się, aktualizacja raportu nadal zakończy się sukcesem, ale błąd zostanie zarejestrowany. Pole `moderationResult` w odpowiedzi wskazuje, czy działanie zakończyło się sukcesem.
