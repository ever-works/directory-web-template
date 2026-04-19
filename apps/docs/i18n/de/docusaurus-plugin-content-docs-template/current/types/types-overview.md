---
id: types-overview
title: Überblick über das Typsystem
sidebar_label: Übersicht
sidebar_position: 0
---

# Überblick über das Typsystem

Die Vorlage verwendet ein umfassendes TypeScript-Typsystem, das sich in `lib/types/` befindet. Diese Typdefinitionen dienen als einzige Quelle der Wahrheit für Datenstrukturen, die in API-Routen, Diensten, Repositorys und UI-Komponenten verwendet werden.

## Geben Sie Dateien ein

Das Verzeichnis `lib/types/` enthält die folgenden Module:

|Datei|Beschreibung|
|------|-------------|
|`item.ts`|Artikeldaten, CRUD-Anfragen, Listenoptionen, Validierungskonstanten und Statusdefinitionen|
|`user.ts`|Admin-Benutzerdaten, Authentifizierungstypen, Zod-Validierungsschemata und Hilfsfunktionen|
|`profile.ts`|Struktur des öffentlichen Benutzerprofils, einschließlich sozialer Links, Fähigkeiten, Portfolio und Einsendungen|
|`category.ts`|Kategoriedaten, CRUD-Anfragen, Listenoptionen und Validierungskonstanten|
|`comment.ts`|Aus dem Datenbankschema abgeleitete Kommentartypen, einschließlich vom Benutzer angereicherter Kommentare|
|`vote.ts`|Abstimmungsschema (Zod), Antworttypen, Fehlertypen und clientseitiger Abstimmungsstatus|
|`survey.ts`|Umfrage- und Umfrageantworttypen, Filteroptionen und Status-/Typaufzählungen|
|`location.ts`|Standorteinstellungen, Geoabfragetypen, Kartenanbietertypen und Koordinatendaten|
|`sponsor-ad.ts`|Werbearten des Sponsors, einschließlich Anfragen, Antworten, Statistiken und Dashboard-Daten|
|`client.ts`|Kundenprofiltypen für das kundenorientierte Portal, einschließlich Dashboard und Statistiken|
|`client-item.ts`|Clientseitige Artikelübermittlungstypen mit Engagement-Metriken und Statusfiltern|
|`role.ts`|Rollen- und Berechtigungstypen für das RBAC-System|
|`tag.ts`|Tag-Daten, CRUD-Anfragen, Listenoptionen und Validierungskonstanten|
|`twenty-crm-config.types.ts`|Zwanzig Arten von CRM-Integrationskonfigurationen und Verbindungstests|
|`twenty-crm-entities.types.ts`|Zwanzig CRM-Entitätstypen für Personen- und Firmendatensätze|
|`twenty-crm-errors.types.ts`|Strukturierte Fehlertypen, Fehlercodes und Typwächter für CRM-Fehler|
|`twenty-crm-sync.types.ts`|Upsert-Vorgänge, Cache-Einträge und synchronisierungsbezogene Typen|

## Architekturmuster

### Konsistentes CRUD-Muster

Die meisten Entitätstypen folgen einem konsistenten Muster von Schnittstellen:

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

### Validierungskonstanten

Jedes Entitätsmodul exportiert ein Validierungskonstantenobjekt mit `as const` zur Typsicherheit:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

Diese Konstanten werden sowohl bei der serverseitigen Validierung als auch bei der clientseitigen Formularvalidierung verwendet, um konsistente Regeln im gesamten Stapel sicherzustellen.

### Diskriminierte Gewerkschaftsreaktionen

API-Antworttypen verwenden diskriminierte Unions für die typsichere Fehlerbehandlung:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

Dieses Muster wird von `SponsorAdResponse`, `ClientResponse`, `ClientListResponse` und anderen verwendet.

### Zod-Schema-Integration

Mehrere Module verwenden neben TypeScript-Typen Zod zur Laufzeitvalidierung:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

Dies wird in `vote.ts` (für das Abstimmungsschema) und `user.ts` (für die Benutzervalidierung) verwendet.

### Erweiterte Typen mit Beziehungen

Typen, die verwandte Daten enthalten, verwenden das Schlüsselwort `extends`:

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

## Importkonventionen

Typen werden mit dem Schlüsselwort `type` für reine Typimporte importiert:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

Dadurch wird sichergestellt, dass Typen zur Kompilierungszeit gelöscht werden und sich nicht auf die Bundle-Größe auswirken.

## Konfiguration vs. Laufzeittypen

Das Standortmodul demonstriert ein für die Konfiguration verwendetes Muster:

- **Konfigurationstypen** verwenden `snake_case`, um YAML-Konfigurationsdateien abzugleichen
- **Laufzeittypen** verwenden `camelCase` für die idiomatische TypeScript-Nutzung
- Eine Mapping-Funktion konvertiert zwischen den beiden Formaten

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

## Statusaufzählungen und -bezeichnungen

Statuswerte werden als konstante Objekte mit entsprechenden Beschriftungs- und Farbzuordnungen definiert:

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

## Von der Datenbank abgeleitete Typen

Einige Typen werden direkt aus dem Drizzle ORM-Schema abgeleitet:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

Dieser Ansatz stellt sicher, dass Typen automatisch mit Datenbankmigrationen synchronisiert bleiben.

## Verwandte Dokumentation

- [Artikeltypen](./item-types.md) – Kernelementdatenstrukturen
- [Benutzertypen](./user-types.md) – Benutzerauthentifizierung und Profiltypen
- [Kategorietypen](./category-types.md) – Kategorienverwaltungstypen
- [Kommentartypen](./comment-types.md) – Kommentar- und Rezensionstypen
- [Abstimmungstypen](./vote-types.md) – Abstimmungssystemtypen
- [Umfragetypen](./survey-types.md) – Umfrage- und Antworttypen
- [Standorttypen](./location-types.md) – Geolokalisierung und Kartentypen
- [Sponsor-Anzeigentypen](./sponsor-ad-types.md) – Sponsoring- und Werbetypen
- [CRM-Typen](./crm-types.md) – Zwanzig CRM-Integrationstypen
