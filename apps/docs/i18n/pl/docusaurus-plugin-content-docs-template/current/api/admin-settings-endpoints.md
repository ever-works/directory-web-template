---
id: admin-settings-endpoints
title: Punkty końcowe Ustawień Administratora
sidebar_label: Admin Settings
sidebar_position: 23
---

# Punkty końcowe Ustawień Administratora

Punkty końcowe ustawień administratora zarządzają konfiguracją aplikacji przechowywaną w `config.yml`, w tym ogólnymi ustawieniami witryny oraz statusem funkcji mapy.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/admin/settings` | Administrator | Pobierz wszystkie ustawienia aplikacji |
| `PATCH` | `/api/admin/settings` | Administrator | Zaktualizuj pojedyncze ustawienie |
| `GET` | `/api/admin/settings/map-status` | Administrator | Sprawdź status dostawców map |

---

## Pobierz ustawienia

```
GET /api/admin/settings
```

Zwraca pełną konfigurację aplikacji z `config.yml`.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Buforowanie:** Wyłączone — używa `force-dynamic` i `no-store`, aby zawsze zwracać aktualne wartości.

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "settings": {
      "site_name": "My Directory",
      "site_description": "The best directory",
      "contact_email": "admin@example.com",
      "items_per_page": 12,
      "allow_registration": true,
      "require_approval": true,
      "maintenance_mode": false,
      "features": {
        "comments": true,
        "ratings": true,
        "favorites": true,
        "geo_search": true
      }
    }
  }
}
```

---

## Zaktualizuj ustawienie

```
PATCH /api/admin/settings
```

Aktualizuje pojedynczy klucz konfiguracji. Klucz jest automatycznie poprzedzany prefiksem `"settings."` przed zapisem w `config.yml`.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `key` | string | Tak | Klucz ustawienia do zaktualizowania (bez prefiksu `settings.`) |
| `value` | any | Tak | Nowa wartość (string, number, boolean lub object) |

**Przykład żądania:**

```json
{
  "key": "require_approval",
  "value": false
}
```

**Inny przykład (zagnieżdżona funkcja):**

```json
{
  "key": "features.geo_search",
  "value": true
}
```

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Ustawienie zaktualizowane pomyślnie"
}
```

:::info
Klucz `"require_approval"` jest tłumaczony wewnętrznie na `"settings.require_approval"` przed zapisem do pliku konfiguracyjnego. Prefiksy nie są wymagane w treści żądania.
:::

---

## Pobierz status mapy

```
GET /api/admin/settings/map-status
```

Sprawdza, czy dostawcy map (Mapbox i Google Maps) są skonfigurowani w zmiennych środowiskowych.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

:::warning
Ten punkt końcowy sprawdza tylko, czy zmienne środowiskowe są **zdefiniowane** — nie weryfikuje prawidłowości ani aktywności kluczy API. Klucze API nigdy nie są ujawniane w odpowiedzi.
:::

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "mapbox": {
      "configured": true,
      "publicTokenSet": true
    },
    "google": {
      "configured": false,
      "apiKeySet": false
    }
  }
}
```

### Pola odpowiedzi

| Pole | Opis |
|------|------|
| `mapbox.configured` | Tak/Nie — czy `NEXT_PUBLIC_MAPBOX_TOKEN` jest ustawiony |
| `mapbox.publicTokenSet` | Alias dla `configured` (wsteczna kompatybilność) |
| `google.configured` | Tak/Nie — czy `GOOGLE_MAPS_API_KEY` jest ustawiony |
| `google.apiKeySet` | Alias dla `configured` (wsteczna kompatybilność) |

---

## Architektura konfiguracji

Ustawienia aplikacji są zarządzane w trzech warstwach:

| Warstwa | Plik | Opis |
|---------|------|------|
| Konfiguracja aplikacji | `config.yml` | Ustawienia runetime zarządzane przez panel admina |
| Zmienne środowiskowe | `.env.local` | Tajemnice i dane dostępowe (klucze API, DB) |
| Schemat bazy danych | Drizzle/SQLite | Dane użytkowników, elementów i treści |

Ustawienia przechowywane w `config.yml` są odczytywane przez serwer przy każdym żądaniu (bez buforowania w panelu admina), zapewniając natychmiastowe działanie zmian bez konieczności ponownego wdrożenia.

---

## Kody błędów

| Kod | Opis |
|-----|------|
| 400 | Brakujące pola `key` lub `value` |
| 401 | Brak uwierzytelnienia jako administrator |
| 500 | Nie można odczytać lub zapisać `config.yml` |

**Źródło:** `template/app/api/admin/settings/**`
