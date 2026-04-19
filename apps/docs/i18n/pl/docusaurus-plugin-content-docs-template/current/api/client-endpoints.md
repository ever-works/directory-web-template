---
id: client-endpoints
title: Punkty końcowe API Klienta
sidebar_label: Client Endpoints
sidebar_position: 2
---

# Punkty końcowe API Klienta

Punkty końcowe klienta obejmują wszystkie trasy dostępne dla zalogowanych użytkowników (zarządzanie własnymi elementami, profile) oraz publiczne punkty końcowe do interakcji z treścią. Niektóre trasy wymagają uwierzytelnienia, inne są dostępne publicznie.

## Zarządzanie elementami klienta (`/api/client/*`)

Trasy wymagające uwierzytelnienia dla zalogowanych użytkowników do zarządzania własnymi elementami.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/client/dashboard/stats` | Statystyki i wykresy panelu użytkownika |
| `GET` | `/api/client/geo-stats` | Geograficzne statystyki elementów |
| `GET` | `/api/client/items` | Wyświetl własne elementy z filtrami |
| `POST` | `/api/client/items` | Prześlij nowy element |
| `GET` | `/api/client/items/coordinates` | Współrzędne do wyświetlenia na mapie |
| `GET` | `/api/client/items/[id]` | Pobierz szczegóły elementu |
| `PUT` | `/api/client/items/[id]` | Zaktualizuj element |
| `DELETE` | `/api/client/items/[id]` | Usuń element |

## Publiczne interakcje z elementami

Publiczne punkty końcowe do interakcji z elementami katalogu.

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/items/[id]/comments` | Publiczny | Wyświetl komentarze elementu |
| `POST` | `/api/items/[id]/comments` | Zalogowany | Dodaj komentarz |
| `PUT` | `/api/items/[id]/comments/[commentId]` | Zalogowany | Zaktualizuj komentarz |
| `DELETE` | `/api/items/[id]/comments/[commentId]` | Zalogowany | Usuń komentarz |
| `GET` | `/api/items/[id]/rating` | Publiczny | Pobierz statystyki ocen |
| `POST` | `/api/items/[id]/rate` | Zalogowany | Oceń element |
| `POST` | `/api/items/[id]/vote` | Zalogowany | Głosuj na element (przydatne/nieprzydatne) |
| `POST` | `/api/items/[id]/view` | Publiczny | Zarejestruj wyświetlenie elementu |
| `POST` | `/api/items/[id]/engagement` | Zalogowany | Śledź zaangażowanie |
| `GET` | `/api/items/[id]/company` | Publiczny | Pobierz dane firmy elementu |

## Ulubione

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/favorites` | Zalogowany | Wyświetl ulubione elementy |
| `POST` | `/api/favorites` | Zalogowany | Dodaj element do ulubionych |
| `DELETE` | `/api/favorites/[id]` | Zalogowany | Usuń element z ulubionych |
| `GET` | `/api/favorites/[id]/status` | Zalogowany | Sprawdź, czy element jest w ulubionych |

## Profil użytkownika

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/profile` | Zalogowany | Pobierz bieżący profil użytkownika |
| `PUT` | `/api/profile` | Zalogowany | Zaktualizuj profil użytkownika |
| `POST` | `/api/profile/avatar` | Zalogowany | Prześlij zdjęcie profilowe |

## Bieżący użytkownik

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/current-user` | Opcjonalne | Dane sesji bieżącego użytkownika |

## Ogłoszenia sponsorowane (użytkownik)

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/sponsor-ads` | Publiczny | Wyświetl aktywne ogłoszenia sponsorowane |
| `GET` | `/api/sponsor-ads/[id]` | Publiczny | Pobierz szczegóły ogłoszenia |
| `POST` | `/api/sponsor-ads` | Zalogowany | Prześlij nowe ogłoszenie sponsorowane |

## Ankiety

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/surveys` | Publiczny | Wyświetl dostępne ankiety |
| `POST` | `/api/surveys/[id]/respond` | Zalogowany | Prześlij odpowiedzi na ankietę |

## Zgłoszenia

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `POST` | `/api/reports` | Zalogowany | Zgłoś treść naruszającą zasady |

## Publiczne punkty końcowe danych

Szybkie punkty końcowe do sprawdzania dostępności danych bez paginacji.

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/categories/exists` | Sprawdź, czy istnieje co najmniej jedna kategoria |
| `GET` | `/api/collections/exists` | Sprawdź, czy istnieje co najmniej jedna kolekcja |
| `GET` | `/api/tags` | Wyświetl wszystkie publiczne tagi |

---

## Wzorzec paginacji

Wszystkie punkty końcowe wyświetlania listy używają spójnego wzorca paginacji:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "meta": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
}
```

Wszystkie parametry paginacji są opcjonalne i używają wartości domyślnych:
- `page`: 1
- `limit`: 10 (lub 20 dla list zarządzania)

**Źródło:** `template/app/api/**`
