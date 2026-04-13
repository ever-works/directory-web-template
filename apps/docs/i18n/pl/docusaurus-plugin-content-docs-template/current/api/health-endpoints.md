---
id: health-endpoints
title: "Dokumentacja API Stan systemu"
sidebar_label: "Stan systemu"
---

# Dokumentacja API Stan systemu

## Przegląd

Punkt końcowy Health zapewnia proste sprawdzenie łączności z bazą danych na potrzeby monitorowania i infrastruktury. Wykonuje lekkie zapytanie w celu weryfikacji, czy połączenie z bazą danych jest aktywne i responsywne, zwracając informacje o stanie wraz ze znacznikami czasu.

## Punkty końcowe

### GET /api/health/database

Przeprowadza podstawowe sprawdzenie kondycji bazy danych poprzez wykonanie zapytania `SELECT 1` w celu weryfikacji połączenia.

**Żądanie**

Nie są wymagane żadne parametry ani treść żądania.

**Odpowiedź**
```typescript
// Odpowiedź zdrowa
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // ISO 8601 format, e.g. "2024-01-15T10:30:00.000Z"
  result: object;           // Raw query result from SELECT 1
}

// Odpowiedź niezdrowa (status 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**Przykład**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('Database is connected at', health.timestamp);
} else {
  console.error('Database is disconnected:', health.error);
}
```

## Uwierzytelnianie

Ten punkt końcowy jest **publiczny** -- uwierzytelnianie nie jest wymagane. Jest przeznaczony do użycia przez load balancery, monitory czasu dostępności i sprawdzenia kondycji wdrożeń.

## Odpowiedzi błędów

| Status | Opis |
|--------|------|
| 200 | Połączenie z bazą danych jest zdrowe |
| 500 | Połączenie z bazą danych nie powiodło się -- zwraca status `"unhealthy"` z informacjami o błędzie |

## Ograniczanie liczby żądań

Nie stosuje się żadnego ograniczania liczby żądań. Ten punkt końcowy jest lekki i nadaje się do częstego odpytywania przez systemy monitorowania.

## Powiązane punkty końcowe

- [Punkty końcowe Config Feature](./config-feature-endpoints) -- Flagi dostępności funkcji (również zależy od bazy danych)
- [Punkty końcowe Version Sync](./version-sync-endpoints) -- Wersja systemu i stan synchronizacji
