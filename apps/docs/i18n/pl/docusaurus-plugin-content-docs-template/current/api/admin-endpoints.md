---
id: admin-endpoints
title: Punkty końcowe API Administratora
sidebar_label: Admin Endpoints
sidebar_position: 1
---

# Punkty końcowe API Administratora

API administratora zawiera około 60 procedur obsługi tras w 19 grupach zasobów. Wszystkie punkty końcowe administratora są chronione przez middleware `withAdminAuth`, który weryfikuje zarówno uwierzytelnianie, jak i przypisanie roli administratora za pomocą zapytania do bazy danych.

## Uwierzytelnianie

Każdy punkt końcowy administratora wymaga:

1. Prawidłowej sesji JWT (sprawdzanej przez `auth()`)
2. Roli administratora w tabeli `user_roles` (sprawdzanej przez `isAdmin()` z `lib/db/roles.ts`)

Nieuwierzytelnione żądania otrzymują odpowiedź `401`. Uwierzytelnione, ale bez uprawnień administratora żądania otrzymują odpowiedź `403`.

## Grupy zasobów

### Kategorie (`/api/admin/categories`)

Zarządzanie kategoriami treści z trwałością opartą na Git.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/categories` | Wyświetl kategorie z paginacją |
| `POST` | `/api/admin/categories` | Utwórz nową kategorię |
| `GET` | `/api/admin/categories/all` | Pobierz wszystkie kategorie (bez paginacji) |
| `POST` | `/api/admin/categories/git` | Synchronizuj kategorie z repozytorium Git |
| `POST` | `/api/admin/categories/reorder` | Zmień kolejność pozycji kategorii |
| `GET` | `/api/admin/categories/[id]` | Pobierz kategorię według ID |
| `PUT` | `/api/admin/categories/[id]` | Zaktualizuj kategorię |
| `DELETE` | `/api/admin/categories/[id]` | Usuń kategorię |

### Klienci (`/api/admin/clients`)

Zarządzanie kontami i profilami klientów użytkowników.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/clients` | Wyświetl profile klientów z paginacją |
| `POST` | `/api/admin/clients/advanced-search` | Zaawansowane wyszukiwanie klientów z filtrami |
| `POST` | `/api/admin/clients/bulk` | Operacje zbiorcze na klientach |
| `GET` | `/api/admin/clients/dashboard` | Statystyki panelu klientów |
| `GET` | `/api/admin/clients/stats` | Zagregowane statystyki klientów |
| `GET` | `/api/admin/clients/[clientId]` | Pobierz szczegóły profilu klienta |
| `PUT` | `/api/admin/clients/[clientId]` | Zaktualizuj profil klienta |
| `DELETE` | `/api/admin/clients/[clientId]` | Usuń konto klienta |

### Kolekcje (`/api/admin/collections`)

Zarządzanie kuratorowanymi kolekcjami elementów.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/collections` | Wyświetl wszystkie kolekcje |
| `POST` | `/api/admin/collections` | Utwórz nową kolekcję |
| `GET` | `/api/admin/collections/[id]` | Pobierz szczegóły kolekcji |
| `PUT` | `/api/admin/collections/[id]` | Zaktualizuj kolekcję |
| `DELETE` | `/api/admin/collections/[id]` | Usuń kolekcję |
| `GET` | `/api/admin/collections/[id]/items` | Wyświetl elementy kolekcji |
| `PUT` | `/api/admin/collections/[id]/items` | Zaktualizuj elementy kolekcji |

### Komentarze (`/api/admin/comments`)

Moderowanie komentarzy użytkowników.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/comments` | Wyświetl komentarze z filtrami moderacji |
| `GET` | `/api/admin/comments/[id]` | Pobierz szczegóły komentarza |
| `PUT` | `/api/admin/comments/[id]` | Zaktualizuj komentarz (zatwierdź/odrzuć) |
| `DELETE` | `/api/admin/comments/[id]` | Usuń komentarz |

### Firmy (`/api/admin/companies`)

Zarządzanie profilami firm powiązanych z elementami.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/companies` | Wyświetl firmy |
| `POST` | `/api/admin/companies` | Utwórz firmę |
| `GET` | `/api/admin/companies/[id]` | Pobierz szczegóły firmy |
| `PUT` | `/api/admin/companies/[id]` | Zaktualizuj firmę |
| `DELETE` | `/api/admin/companies/[id]` | Usuń firmę |

### Panel (`/api/admin/dashboard`)

Zagregowana analityka panelu.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/dashboard/stats` | Podsumowanie statystyk panelu |

### Wyróżnione elementy (`/api/admin/featured-items`)

Zarządzanie wyróżnionymi elementami.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/featured-items` | Wyświetl wyróżnione elementy |
| `POST` | `/api/admin/featured-items` | Wyróżnij element |
| `GET` | `/api/admin/featured-items/[id]` | Pobierz szczegóły wyróżnionego elementu |
| `PUT` | `/api/admin/featured-items/[id]` | Zaktualizuj ustawienia wyróżnionego elementu |
| `DELETE` | `/api/admin/featured-items/[id]` | Usuń z wyróżnionych |

### Analityka geograficzna (`/api/admin/geo-analytics`)

Dane analityczne geograficzne i rozkład odwiedzających.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/geo-analytics` | Pobierz dane analityki geograficznej |

### Elementy (`/api/admin/items`)

Pełne zarządzanie treścią elementów.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/items` | Wyświetl elementy z filtrami i paginacją |
| `POST` | `/api/admin/items` | Utwórz nowy element |
| `POST` | `/api/admin/items/bulk` | Zbiorcze operacje na elementach (zatwierdzanie, odrzucanie, usuwanie) |
| `GET` | `/api/admin/items/stats` | Zagregowane statystyki elementów |
| `GET` | `/api/admin/items/[id]` | Pobierz szczegóły elementu |
| `PUT` | `/api/admin/items/[id]` | Zaktualizuj element |
| `DELETE` | `/api/admin/items/[id]` | Usuń element |
| `GET` | `/api/admin/items/[id]/history` | Pobierz historię audytu elementu |
| `POST` | `/api/admin/items/[id]/review` | Prześlij przegląd elementu (zatwierdź/odrzuć) |

### Indeks lokalizacji (`/api/admin/location-index`)

Zarządzanie indeksowaniem wyszukiwania geograficznego.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `POST` | `/api/admin/location-index` | Przebuduj indeks wyszukiwania lokalizacji |

### Nawigacja (`/api/admin/navigation`)

Konfiguracja nawigacji administratora.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/navigation` | Pobierz strukturę nawigacji |
| `PUT` | `/api/admin/navigation` | Zaktualizuj nawigację |

### Powiadomienia (`/api/admin/notifications`)

Zarządzanie powiadomieniami administratora.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/notifications` | Wyświetl powiadomienia administratora |
| `POST` | `/api/admin/notifications/mark-all-read` | Oznacz wszystkie powiadomienia jako przeczytane |
| `POST` | `/api/admin/notifications/[id]/read` | Oznacz pojedyncze powiadomienie jako przeczytane |

### Zgłoszenia (`/api/admin/reports`)

Zarządzanie zgłoszeniami treści i moderacja.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/reports` | Wyświetl zgłoszenia treści |
| `GET` | `/api/admin/reports/stats` | Statystyki zgłoszeń |
| `GET` | `/api/admin/reports/[id]` | Pobierz szczegóły zgłoszenia |
| `PUT` | `/api/admin/reports/[id]` | Zaktualizuj status zgłoszenia (rozwiązanie, odrzucenie) |

### Role (`/api/admin/roles`)

Zarządzanie rolami i uprawnieniami dla RBAC.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/roles` | Wyświetl role z paginacją |
| `POST` | `/api/admin/roles` | Utwórz nową rolę |
| `GET` | `/api/admin/roles/active` | Pobierz tylko aktywne role |
| `GET` | `/api/admin/roles/stats` | Statystyki ról |
| `GET` | `/api/admin/roles/[id]` | Pobierz szczegóły roli |
| `PUT` | `/api/admin/roles/[id]` | Zaktualizuj rolę |
| `DELETE` | `/api/admin/roles/[id]` | Usuń rolę (miękkie usunięcie) |
| `GET` | `/api/admin/roles/[id]/permissions` | Pobierz uprawnienia roli |
| `PUT` | `/api/admin/roles/[id]/permissions` | Zaktualizuj uprawnienia roli |

### Ustawienia (`/api/admin/settings`)

Zarządzanie ustawieniami aplikacji.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/settings` | Pobierz wszystkie ustawienia |
| `PUT` | `/api/admin/settings` | Zaktualizuj ustawienia |
| `GET` | `/api/admin/settings/map-status` | Pobierz status funkcji mapy |

### Ogłoszenia sponsorowane (`/api/admin/sponsor-ads`)

Moderacja ogłoszeń sponsorowanych.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/sponsor-ads` | Wyświetl ogłoszenia sponsorowane |
| `GET` | `/api/admin/sponsor-ads/[id]` | Pobierz szczegóły ogłoszenia |
| `PUT` | `/api/admin/sponsor-ads/[id]` | Zaktualizuj ogłoszenie |
| `POST` | `/api/admin/sponsor-ads/[id]/approve` | Zatwierdź ogłoszenie sponsorowane |
| `POST` | `/api/admin/sponsor-ads/[id]/reject` | Odrzuć ogłoszenie sponsorowane |
| `POST` | `/api/admin/sponsor-ads/[id]/cancel` | Anuluj ogłoszenie sponsorowane |

### Tagi (`/api/admin/tags`)

Zarządzanie tagami treści.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/tags` | Wyświetl tagi z paginacją |
| `POST` | `/api/admin/tags` | Utwórz nowy tag |
| `GET` | `/api/admin/tags/all` | Pobierz wszystkie tagi (bez paginacji) |
| `GET` | `/api/admin/tags/[id]` | Pobierz szczegóły tagu |
| `PUT` | `/api/admin/tags/[id]` | Zaktualizuj tag |
| `DELETE` | `/api/admin/tags/[id]` | Usuń tag |

### Twenty CRM (`/api/admin/twenty-crm`)

Konfiguracja i testowanie integracji CRM.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/twenty-crm/config` | Pobierz konfigurację CRM |
| `PUT` | `/api/admin/twenty-crm/config` | Zaktualizuj konfigurację CRM |
| `POST` | `/api/admin/twenty-crm/test-connection` | Przetestuj połączenie CRM |

### Użytkownicy (`/api/admin/users`)

Zarządzanie użytkownikami administratora.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/users` | Wyświetl użytkowników z paginacją |
| `POST` | `/api/admin/users` | Utwórz nowego użytkownika |
| `GET` | `/api/admin/users/stats` | Statystyki użytkowników |
| `GET` | `/api/admin/users/check-email` | Sprawdź dostępność adresu e-mail |
| `GET` | `/api/admin/users/check-username` | Sprawdź dostępność nazwy użytkownika |
| `GET` | `/api/admin/users/[id]` | Pobierz szczegóły użytkownika |
| `PUT` | `/api/admin/users/[id]` | Zaktualizuj użytkownika |
| `DELETE` | `/api/admin/users/[id]` | Usuń użytkownika |

## Wspólne wzorce

### Operacje zbiorcze

Kilka zasobów obsługuje operacje zbiorcze przez POST z tablicą ID:

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### Punkty końcowe statystyk

Większość grup zasobów zawiera punkt końcowy `/stats` zwracający zagregowane liczby:

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```

### Historia audytu

Elementy obsługują śledzenie historii audytu przez punkt końcowy `/[id]/history`, rejestrując, kto dokonał zmian i kiedy.
