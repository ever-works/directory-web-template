---
id: types-overview
title: Wpisz Przegląd systemu
sidebar_label: Przegląd
sidebar_position: 0
---

# Wpisz Przegląd systemu

Szablon wykorzystuje kompleksowy system typów TypeScript znajdujący się w `lib/types/`. Te definicje typów służą jako pojedyncze źródło prawdy dla struktur danych używanych w trasach API, usługach, repozytoriach i komponentach interfejsu użytkownika.

## Wpisz Pliki

Katalog `lib/types/` zawiera następujące moduły:

|Plik|Opis|
|------|-------------|
|`item.ts`|Dane pozycji, żądania CRUD, opcje list, stałe sprawdzania poprawności i definicje statusów|
|`user.ts`|Dane użytkownika administracyjnego, typy uwierzytelniania, schematy sprawdzania poprawności ZOD i funkcje pomocnicze|
|`profile.ts`|Struktura publicznych profili użytkowników, w tym linki społecznościowe, umiejętności, portfolio i zgłoszenia|
|`category.ts`|Dane kategorii, żądania CRUD, opcje list i stałe sprawdzania poprawności|
|`comment.ts`|Typy komentarzy wywnioskowane ze schematu bazy danych, w tym komentarze wzbogacone przez użytkownika|
|`vote.ts`|Schemat głosowania (Zod), typy odpowiedzi, typy błędów i stan głosowania po stronie klienta|
|`survey.ts`|Ankieta i typy odpowiedzi na ankietę, opcje filtrów oraz wyliczenia stanu/typu|
|`location.ts`|Ustawienia lokalizacji, typy zapytań geograficznych, typy dostawców map i dane współrzędnych|
|`sponsor-ad.ts`|Typy reklam sponsorskich, w tym żądania, odpowiedzi, statystyki i dane na pulpicie nawigacyjnym|
|`client.ts`|Typy profili klientów dla portalu skierowanego do klienta, w tym pulpit nawigacyjny i statystyki|
|`client-item.ts`|Typy przesyłania elementów po stronie klienta ze wskaźnikami zaangażowania i filtrami stanu|
|`role.ts`|Typy ról i uprawnień dla systemu RBAC|
|`tag.ts`|Dane tagów, żądania CRUD, opcje list i stałe sprawdzania poprawności|
|`twenty-crm-config.types.ts`|Dwadzieścia konfiguracji integracji CRM i typów testowania połączeń|
|`twenty-crm-entities.types.ts`|Dwadzieścia typów jednostek CRM dla rekordów osób i firm|
|`twenty-crm-errors.types.ts`|Ustrukturyzowane typy błędów, kody błędów i zabezpieczenia typów błędów CRM|
|`twenty-crm-sync.types.ts`|Operacje Upsert, wpisy pamięci podręcznej i typy związane z synchronizacją|

## Wzorce Architektury

### Spójny wzór CRUD

Większość typów jednostek ma spójny wzór interfejsów:

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### Stałe walidacyjne

Każdy moduł encji eksportuje obiekt stałych walidacyjnych, używając `as const` dla bezpieczeństwa typu:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

Te stałe są używane zarówno podczas sprawdzania poprawności po stronie serwera, jak i sprawdzania poprawności formularza po stronie klienta, zapewniając spójne reguły na całym stosie.

### Dyskryminowane reakcje Unii

Typy odpowiedzi API wykorzystują związki dyskryminowane do obsługi błędów z zachowaniem bezpieczeństwa typów:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

Ten wzorzec jest używany przez `SponsorAdResponse`, `ClientResponse`, `ClientListResponse` i innych.

### Integracja schematu Zoda

Kilka modułów używa Zoda do sprawdzania poprawności środowiska wykonawczego wraz z typami TypeScript:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

Jest to używane w `vote.ts` (dla schematu głosowania) i `user.ts` (do sprawdzania poprawności użytkownika).

### Rozszerzone typy z relacjami

Typy zawierające powiązane dane używają słowa kluczowego `extends`:

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## Konwencje importowe

Typy są importowane przy użyciu słowa kluczowego `type` w przypadku importu samych typów:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

Dzięki temu typy są usuwane w czasie kompilacji i nie wpływają na rozmiar pakietu.

## Konfiguracja a typy środowiska wykonawczego

Moduł lokalizacji demonstruje wzorzec zastosowany do konfiguracji:

- **Typy konfiguracji** używają `snake_case`, aby dopasować pliki konfiguracyjne YAML
- **Typy wykonawcze** używają `camelCase` do idiomatycznego użycia TypeScriptu
- Funkcja mapowania dokonuje konwersji pomiędzy tymi dwoma formatami

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## Wyliczenia stanu i etykiety

Wartości stanu są zdefiniowane jako obiekty stałe z odpowiadającymi im mapowaniami etykiet i kolorów:

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Typy wywnioskowane z bazy danych

Niektóre typy są wywnioskowane bezpośrednio ze schematu Drizzle ORM:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

Takie podejście zapewnia automatyczną synchronizację typów z migracjami baz danych.

## Powiązana dokumentacja

- [Typy elementów](./item-types.md) — Podstawowe struktury danych elementów
- [Typy użytkowników](./user-types.md) - Uwierzytelnianie użytkowników i typy profili
- [Typy kategorii](./category-types.md) - Typy zarządzania kategoriami
- [Typy komentarzy](./comment-types.md) — typy komentarzy i recenzji
- [Typy głosów](./vote-types.md) – Typy systemów głosowania
- [Typy ankiet](./survey-types.md) — typy ankiet i odpowiedzi
- [Typy lokalizacji](./location-types.md) — Geolokalizacja i typy map
- [Typy reklam sponsorowanych](./sponsor-ad-types.md) – Rodzaje sponsoringu i reklam
- [Typy CRM](./crm-types.md) - Dwadzieścia typów integracji CRM
