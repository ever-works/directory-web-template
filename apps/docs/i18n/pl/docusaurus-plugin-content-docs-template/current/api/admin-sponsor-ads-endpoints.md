---
id: admin-sponsor-ads-endpoints
title: Punkty końcowe API Ogłoszeń Sponsorowanych Administratora
sidebar_label: Admin Sponsor Ads
sidebar_position: 39
---

# Punkty końcowe API Ogłoszeń Sponsorowanych Administratora

API ogłoszeń sponsorowanych administratora zarządza moderacją płatnych ogłoszeń sponsorowanych, w tym zatwierdzaniem, odrzucaniem i anulowaniem. Wszystkie punkty końcowe wymagają uwierzytelniania administratora.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/admin/sponsor-ads` | Administrator | Wyświetl ogłoszenia z filtrami i statystykami |
| `GET` | `/api/admin/sponsor-ads/[id]` | Administrator | Pobierz szczegóły ogłoszenia |
| `DELETE` | `/api/admin/sponsor-ads/[id]` | Administrator | Usuń ogłoszenie |
| `POST` | `/api/admin/sponsor-ads/[id]/approve` | Administrator | Zatwierdź ogłoszenie |
| `POST` | `/api/admin/sponsor-ads/[id]/reject` | Administrator | Odrzuć ogłoszenie |
| `POST` | `/api/admin/sponsor-ads/[id]/cancel` | Administrator | Anuluj ogłoszenie |

---

## Wyświetl ogłoszenia

```
GET /api/admin/sponsor-ads
```

Zwraca paginowaną listę ogłoszeń sponsorowanych z opcjonalnymi filtrami i zagregowanymi statystykami.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Parametry zapytania

Parametry są walidowane przez Zod przed przetworzeniem:

| Parametr | Typ | Wymagane | Opis |
|-----------|-----|----------|------|
| `page` | integer | Nie | Numer strony (domyślnie: 1) |
| `limit` | integer | Nie | Elementy na stronie (domyślnie: 10) |
| `status` | string | Nie | Filtruj według statusu: `pending_payment`, `pending`, `active`, `expired`, `rejected`, `cancelled` |
| `search` | string | Nie | Wyszukaj w tytule lub nazwie ogłoszeniodawcy |
| `sort` | string | Nie | Sortuj według: `createdAt`, `startDate`, `endDate` |
| `order` | string | Nie | `asc` lub `desc` |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "id": "ad-id",
        "title": "Sponsor Ad Title",
        "advertiserName": "Company Name",
        "status": "pending",
        "startDate": "2024-02-01",
        "endDate": "2024-02-28",
        "createdAt": "2024-01-20T10:00:00.000Z"
      }
    ],
    "meta": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "totalPages": 3
    },
    "stats": {
      "total": 25,
      "pending": 5,
      "active": 12,
      "expired": 6,
      "rejected": 2
    }
  }
}
```

---

## Pobierz ogłoszenie

```
GET /api/admin/sponsor-ads/[id]
```

Pobiera pełne szczegóły ogłoszenia sponsorowanego.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad-id",
    "title": "Sponsor Ad Title",
    "description": "Ad description content",
    "advertiserName": "Company Name",
    "advertiserEmail": "contact@company.com",
    "status": "pending",
    "startDate": "2024-02-01",
    "endDate": "2024-02-28",
    "budget": 500.00,
    "rejectionReason": null,
    "cancelReason": null,
    "createdAt": "2024-01-20T10:00:00.000Z"
  }
}
```

---

## Usuń ogłoszenie

```
DELETE /api/admin/sponsor-ads/[id]
```

Trwale usuwa ogłoszenie sponsorowane.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Ogłoszenie zostało usunięte"
}
```

---

## Zatwierdź ogłoszenie

```
POST /api/admin/sponsor-ads/[id]/approve
```

Zatwierdza ogłoszenie sponsorowane i ustawia jego status na `active`.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `forceApprove` | boolean | Nie | Zatwierdź nawet ogłoszenia z niepełnymi danymi płatności |

**Przykład żądania:**

```json
{
  "forceApprove": false
}
```

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad-id",
    "status": "active"
  }
}
```

---

## Odrzuć ogłoszenie

```
POST /api/admin/sponsor-ads/[id]/reject
```

Odrzuca ogłoszenie sponsorowane z wymaganym powodem. Powód jest przechowywany i może być wyświetlony ogłoszeniodawcy.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `rejectionReason` | string | Tak | Powód odrzucenia (10–500 znaków) |

**Przykład żądania:**

```json
{
  "rejectionReason": "This ad does not meet our content guidelines. Please revise and resubmit."
}
```

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad-id",
    "status": "rejected",
    "rejectionReason": "This ad does not meet our content guidelines."
  }
}
```

---

## Anuluj ogłoszenie

```
POST /api/admin/sponsor-ads/[id]/cancel
```

Anuluje aktywne lub oczekujące ogłoszenie sponsorowane z opcjonalnym powodem.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `cancelReason` | string | Nie | Powód anulowania (opcjonalny) |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad-id",
    "status": "cancelled"
  }
}
```

---

## Cykl życia statusu

```
pending_payment → pending → active → expired
                     ↓
                  rejected
                     ↓
                 cancelled
```

| Status | Opis |
|--------|------|
| `pending_payment` | Ogłoszenie zostało przesłane, oczekuje na płatność |
| `pending` | Płatność przyjęta, oczekuje na zatwierdzenie przez administratora |
| `active` | Zatwierdzone i aktualnie wyświetlane |
| `expired` | Minął termin zakończenia |
| `rejected` | Odrzucone przez administratora |
| `cancelled` | Anulowane przez administratora lub ogłoszeniodawcę |

---

## Reguły walidacji

| Pole | Wymagania |
|------|-----------|
| `rejectionReason` | 10–500 znaków, wymagane przy odrzucaniu |
| `cancelReason` | Opcjonalne, brak limitu długości |
| `forceApprove` | Boolean, opcjonalne |

## Kody błędów

| Kod | Opis |
|-----|------|
| 400 | Błąd walidacji (np. za krótki powód odrzucenia) |
| 401 | Brak uwierzytelnienia jako administrator |
| 404 | Ogłoszenie nie zostało znalezione |
| 422 | Nieprawidłowe przejście statusu |
| 500 | Wewnętrzny błąd serwera |

**Źródło:** `template/app/api/admin/sponsor-ads/**`
