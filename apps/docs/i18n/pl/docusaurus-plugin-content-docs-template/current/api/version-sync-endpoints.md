---
id: version-sync-endpoints
title: "Wersja i synchronizacja – dokumentacja API"
sidebar_label: "Wersja i synchronizacja"
---

# Wersja i synchronizacja – dokumentacja API

## Przegląd

Punkty końcowe wersji i synchronizacji udostępniają metadane wersji aplikacji oraz zarządzają synchronizacją treści z repozytorium CMS opartego na Git.

## GET /api/version

Pobierz informacje o aktualnej wersji aplikacji.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `GET` |
| Ścieżka | `/api/version` |
| Uwierzytelnianie | Brak |

### Kształt odpowiedzi

```typescript
interface VersionResponse {
  version: string;         // Semantic version (e.g., "1.2.3")
  commit: string;          // Git commit SHA (short)
  date: string;            // ISO 8601 commit date
  message: string;         // Commit message
  author: string;          // Commit author
  branch: string;          // Deployment branch
}
```

### Przykładowa odpowiedź (200)

```json
{
  "data": {
    "version": "2.4.1",
    "commit": "a1b2c3d",
    "date": "2024-01-10T08:30:00Z",
    "message": "feat: ulepszone filtrowanie wyników wyszukiwania",
    "author": "Maria Nowak",
    "branch": "main"
  }
}
```

### Nagłówki odpowiedzi

| Nagłówek | Wartość | Opis |
|----------|---------|------|
| `Cache-Control` | `public, max-age=60` | Cache przez 60 sekund |
| `ETag` | `"a1b2c3d"` | SHA commita do warunkowych żądań |

## POST /api/version/sync

Wyzwól synchronizację treści z repozytorium Git CMS.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `POST` |
| Ścieżka | `/api/version/sync` |
| Uwierzytelnianie | Brak (zabezpieczony przez inne mechanizmy) |

### Zapobieganie współbieżnym operacjom

Punkt końcowy zapobiega jednoczesnym synchronizacjom przez mechanizm blokady:

```typescript
if (syncInProgress) {
  return NextResponse.json({
    status: 'in_progress',
    message: 'Synchronization is already running'
  }, { status: 409 });
}
```

### Kształt odpowiedzi — sukces

```json
{
  "status": "success",
  "message": "Content synchronized successfully",
  "itemsSynced": 142,
  "duration": "3.2s"
}
```

### Kształt odpowiedzi — operacja w toku

```json
{
  "status": "in_progress",
  "message": "Synchronization is already running",
  "startedAt": "2024-01-15T10:28:00Z"
}
```

### Kształt odpowiedzi — błąd

```json
{
  "status": "failed",
  "message": "Failed to clone repository",
  "error": "Authentication failed"
}
```

## GET /api/version/sync

Pobierz aktualny status synchronizacji.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `GET` |
| Ścieżka | `/api/version/sync` |
| Uwierzytelnianie | Brak |

### Kształt odpowiedzi

```typescript
interface SyncStatusResponse {
  syncInProgress: boolean;
  lastSyncTime: string | null;      // ISO 8601 timestamp
  timeSinceLastSync: string | null; // Human-readable duration
}
```

### Przykładowa odpowiedź (200)

```json
{
  "data": {
    "syncInProgress": false,
    "lastSyncTime": "2024-01-15T09:00:00Z",
    "timeSinceLastSync": "1 godzina 30 minut"
  }
}
```

## Uwierzytelnianie

Wszystkie punkty końcowe wersji i synchronizacji są publiczne i nie wymagają uwierzytelniania. Wyzwalanie synchronizacji może wymagać oddzielnego tokenu autoryzacyjnego w zależności od konfiguracji środowiska.

## Odpowiedzi błędów

### GET /api/version — błędy

| Kod | Treść | Opis |
|-----|-------|------|
| 500 | `Failed to read version info` | Błąd odczytu metadanych Git |

### POST /api/version/sync — błędy

| Kod | Treść | Opis |
|-----|-------|------|
| 409 | `Sync already in progress` | Trwa już synchronizacja |
| 500 | `Sync failed` | Synchronizacja repozytorium nie powiodła się |

## Ograniczenie liczby żądań

Punkt końcowy `POST /api/version/sync` podlega ograniczeniu liczby żądań, aby zapobiec nadużyciom. Szczegóły w globalnej dokumentacji ograniczania żądań.

## Powiązane punkty końcowe

| Punkt końcowy | Opis |
|---------------|------|
| `GET /api/health/database` | Sprawdzenie kondycji bazy danych |
| `GET /api/config/features` | Konfiguracja funkcji |
