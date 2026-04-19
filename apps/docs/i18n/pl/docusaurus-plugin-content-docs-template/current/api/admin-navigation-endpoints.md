---
id: admin-navigation-endpoints
title: Punkty końcowe Nawigacji i Indeksu Lokalizacji Administratora
sidebar_label: Admin Navigation
sidebar_position: 29
---

# Punkty końcowe Nawigacji i Indeksu Lokalizacji Administratora

Te punkty końcowe zarządzają nawigacją strony (nagłówek/stopka) oraz indeksem wyszukiwania lokalizacji geograficznej. Wszystkie punkty końcowe wymagają uwierzytelniania administratora.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/admin/navigation` | Administrator | Pobierz konfigurację nawigacji |
| `PATCH` | `/api/admin/navigation` | Administrator | Zaktualizuj elementy nawigacji |
| `GET` | `/api/admin/location-index` | Administrator | Pobierz statystyki indeksu lokalizacji |
| `POST` | `/api/admin/location-index` | Administrator | Przebuduj lub wyczyść indeks lokalizacji |

---

## Nawigacja

### Pobierz konfigurację nawigacji

```
GET /api/admin/navigation
```

Zwraca bieżącą konfigurację nawigacji z `config.yml`. Navigacja zawiera zarówno pozycje nagłówka, jak i stopki.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "custom_header": [
      {
        "id": "nav-home",
        "label": "Home",
        "path": "/",
        "order": 1,
        "isActive": true
      }
    ],
    "custom_footer": [
      {
        "id": "nav-about",
        "label": "About",
        "path": "/about",
        "order": 1,
        "isActive": true
      }
    ]
  }
}
```

### Pola odpowiedzi

| Pole | Typ | Opis |
|------|-----|------|
| `custom_header` | array | Elementy nawigacji nagłówka |
| `custom_footer` | array | Elementy nawigacji stopki |
| `id` | string | Unikalny identyfikator elementu |
| `label` | string | Wyświetlana etykieta linku |
| `path` | string | Ścieżka URL (musi zaczynać się od `/`) |
| `order` | integer | Pozycja w nawigacji |
| `isActive` | boolean | Czy element jest wyświetlany |

---

### Zaktualizuj konfigurację nawigacji

```
PATCH /api/admin/navigation
```

Aktualizuje elementy nawigacji nagłówka i/lub stopki. Zapisuje zmiany w `config.yml`.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Treść żądania:**

```json
{
  "custom_header": [
    {
      "id": "nav-home",
      "label": "Home",
      "path": "/",
      "order": 1,
      "isActive": true
    },
    {
      "id": "nav-blog",
      "label": "Blog",
      "path": "/blog",
      "order": 2,
      "isActive": true
    }
  ],
  "custom_footer": [
    {
      "id": "nav-privacy",
      "label": "Privacy",
      "path": "/privacy",
      "order": 1,
      "isActive": true
    }
  ]
}
```

### Reguły walidacji ścieżki

| Reguła | Opis |
|--------|------|
| Wymagany prefiks | Ścieżka musi zaczynać się od `/` |
| Brak białych znaków | Ścieżki nie mogą zawierać białych znaków |
| Długość etykiety | Etykieta: 1–50 znaków |
| Maksymalna liczba elementów | Maks. 20 elementów na sekcję |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Nawigacja zaktualizowana pomyślnie"
}
```

---

## Indeks lokalizacji

### Pobierz statystyki indeksu lokalizacji

```
GET /api/admin/location-index
```

Zwraca informacje o stanie i statystyki bieżącego indeksu wyszukiwania geograficznego.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "totalEntries": 450,
    "lastRebuildAt": "2024-01-15T08:00:00.000Z",
    "entriesByCountry": [
      { "country": "United States", "count": 150 },
      { "country": "United Kingdom", "count": 80 }
    ],
    "remoteCount": 30,
    "status": "ready"
  }
}
```

---

### Zarządzaj indeksem lokalizacji

```
POST /api/admin/location-index
```

Wyzwala przebudowę lub wyczyszczenie indeksu wyszukiwania lokalizacji.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Treść żądania:**

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `action` | string | Tak | `rebuild` — przebuduj indeks; `clear` — wyczyść wszystkie wpisy |

**Przykład żądania (przebudowa):**

```json
{
  "action": "rebuild"
}
```

**Przykład żądania (wyczyszczenie):**

```json
{
  "action": "clear"
}
```

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Indeks lokalizacji przebudowany pomyślnie",
  "data": {
    "entriesIndexed": 420,
    "duration": "3.2s"
  }
}
```

:::info
Przebudowa indeksu może zająć kilka sekund w przypadku dużych katalogów. Indeks jest używany przez analitykę geograficzną i funkcje wyszukiwania lokalizacji.
:::

## Kody błędów

| Kod | Opis |
|-----|------|
| 400 | Brak lub nieprawidłowy parametr `action` |
| 401 | Brak uwierzytelnienia jako administrator |
| 422 | Błąd walidacji ścieżki nawigacji |
| 500 | Wewnętrzny błąd serwera lub błąd zapisu pliku konfiguracji |

**Źródło:** `template/app/api/admin/navigation/route.ts`, `template/app/api/admin/location-index/route.ts`
