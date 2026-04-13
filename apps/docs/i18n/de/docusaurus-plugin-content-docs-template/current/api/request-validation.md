---
id: request-validation
title: "API Request Validation"
sidebar_label: "API Request Validation"
---

# API-Anfrage-Validierung

Die Vorlage validiert API-Anfragen auf mehreren Ebenen: Zod-Schemas für Body-/Query-Validierung, Hilfsfunktionen für Paginierung und Body-Größenbeschränkungen sowie Inline-Type-Guards für Enum-Parameter. Diese Seite dokumentiert jeden Validierungsmechanismus und dessen Verwendung in API-Routen-Handlern.

## Validierungsarchitektur

```mermaid
flowchart TD
    A[Eingehende Anfrage] --> B{Authentifizierungsprüfung}
    B -->|Nicht autorisiert| C[401 Antwort]
    B -->|Autorisiert| D{Content-Length-Prüfung}
    D -->|Zu groß| E[413 Antwort]
    D -->|OK| F{Paginierungsvalidierung}
    F -->|Ungültig| G[400 Antwort]
    F -->|Gültig| H{Parametervalidierung}
    H -->|Ungültiges Enum| I[400 Antwort]
    H -->|Gültig| J{Body-Validierung}
    J -->|Zod-Fehler| K[400 Antwort]
    J -->|Gültig| L[Service / Repository]
    L -->|Fehler| M[safeErrorResponse]
    L -->|Erfolg| N[200/201 Antwort]
```

## Zod-Validierungsschemas

### Standort-Schema (`lib/validations/item.ts`)

Alle Felder sind optional; die Strenge wird durch formularebene Einstellungen gesteuert:

```typescript
export const locationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
  service_area: z.enum(['local', 'regional', 'national', 'global']).optional(),
  is_remote: z.boolean().optional(),
  geocoded_by: z.enum(['mapbox', 'google']).optional(),
}).optional();
```

### Client-Eintrags-Schemas (`lib/validations/client-item.ts`)

#### Eintrag erstellen

```typescript
export const clientCreateItemSchema = z.object({
  name: z.string()
    .min(ITEM_VALIDATION.NAME_MIN_LENGTH)
    .max(ITEM_VALIDATION.NAME_MAX_LENGTH),
  description: z.string()
    .min(ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH)
    .max(ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH),
  source_url: z.string().url('Invalid URL format'),
  category: z.union([
    z.string().min(1, 'Category is required'),
    z.array(z.string().min(1)).min(1),
  ]).optional().nullable(),
  tags: z.array(z.string().min(1)).optional().default([]),
  icon_url: z.string().url().optional().or(z.literal('')),
  location: locationSchema,
});
```

#### Eintrag aktualisieren

Verwendet dieselben Felddefinitionen, alle Felder sind optional:

```typescript
export const clientUpdateItemSchema = z.object({
  name: z.string().min(...).max(...).optional(),
  description: z.string().min(...).max(...).optional(),
  source_url: z.string().url().optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.array(z.string()).optional(),
  icon_url: z.string().url().optional().or(z.literal('')),
  location: locationSchema,
});
```

#### Listen-Abfrageparameter

Abfrageparameter verwenden `.transform()`, um String-Eingaben in typisierte Werte zu konvertieren:

```typescript
export const clientItemsListQuerySchema = z.object({
  page: z.string().optional()
    .transform(val => (val ? parseInt(val, 10) : 1))
    .refine(val => !Number.isNaN(val))
    .refine(val => val >= 1),
  limit: z.string().optional()
    .transform(val => (val ? parseInt(val, 10) : 10))
    .refine(val => !Number.isNaN(val))
    .refine(val => val >= 1 && val <= 100),
  status: z.enum(['all', 'pending', 'approved', 'rejected']).optional().default('all'),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'updated_at', 'status', 'submitted_at']).optional().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  deleted: z.string().optional().transform(val => val === 'true'),
});
```

### Passwort-Schema (`lib/validations/auth.ts`)

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### Firmen-Schemas (`lib/validations/company.ts`)

```typescript
export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  website: z.string().url().optional().or(z.literal("")),
  domain: z.string().max(255).optional()
    .transform(val => val?.toLowerCase().trim() || undefined),
  slug: z.string().max(255).optional()
    .transform(val => val?.toLowerCase().trim() || undefined)
    .refine(val => !val || /^[a-z0-9-]+$/.test(val)),
  status: z.enum(["active", "inactive"]).default("active"),
});
```

### Abgeleitete Typen

Alle Schemas exportieren Zod-abgeleitete Typen neben dem Schema:

```typescript
export type ClientUpdateItemInput = z.infer<typeof clientUpdateItemSchema>;
export type ClientCreateItemInput = z.infer<typeof clientCreateItemSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
```

## Paginierungsvalidierung (`lib/utils/pagination-validation.ts`)

Ein gemeinsames Hilfsprogramm zur Validierung der `page`- und `limit`-Abfrageparameter:

```typescript
export function validatePaginationParams(
  searchParams: URLSearchParams
): PaginationParams | PaginationError {
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  if (isNaN(page) || page < 1) {
    return { error: 'Invalid page parameter. Must be a positive integer.', status: 400 };
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return { error: 'Invalid limit parameter. Must be between 1 and 100.', status: 400 };
  }
  return { page, limit };
}
```

Die Verwendung in Routen-Handlern folgt einem Discriminated-Union-Muster:

```typescript
const paginationResult = validatePaginationParams(searchParams);
if ('error' in paginationResult) {
  return NextResponse.json(
    { success: false, error: paginationResult.error },
    { status: paginationResult.status }
  );
}
const { page, limit } = paginationResult;
```

## Anfragekörper-Größenbeschränkungen (`lib/utils/request-body.ts`)

### `readBodyWithLimit`

Liest den Anfragekörper über `ReadableStream` mit inkrementeller Größenprüfung:

```typescript
export async function readBodyWithLimit<T = unknown>(
  request: NextRequest,
  options: ReadBodyOptions
): Promise<ReadBodyResult<T>>
```

Funktionen:
- Schnellpfad: prüft zuerst den `Content-Length`-Header
- Inkrementell: liest Stream-Chunks und prüft die Größe beim Eingang
- Abbruch: ruft `reader.cancel()` auf, wenn das Limit überschritten wird
- JSON-Parsing: optional, behandelt `SyntaxError` problemlos

```typescript
// Verwendung
const { data } = await readBodyWithLimit(request, { maxSize: 1024 });
```

### `validateContentLength`

Frühzeitige Ablehnung ohne den Body zu lesen:

```typescript
export function validateContentLength(request: NextRequest, maxSize: number): boolean
```

Wirft `BodySizeLimitError`, wenn der `Content-Length`-Header das Limit überschreitet.

### `BodySizeLimitError`

Benutzerdefinierte Fehlerklasse mit `maxSize`- und `actualSize`-Eigenschaften:

```typescript
export class BodySizeLimitError extends Error {
  constructor(
    public readonly maxSize: number,
    public readonly actualSize: number
  ) {
    super(`Request body too large. Maximum size is ${maxSize} bytes, received ${actualSize} bytes.`);
  }
}
```

## Inline-Parameter-Validierung

Für Enum-Parameter, die nicht durch Zod-Schemas abgedeckt sind, verwenden Routen-Handler Inline-Type-Guards:

```typescript
// Typsichere Status-Validierung
const validStatuses = ['draft', 'pending', 'approved', 'rejected'] as const;
type ItemStatus = (typeof validStatuses)[number];
const isItemStatus = (s: string): s is ItemStatus =>
  (validStatuses as readonly string[]).includes(s);

if (statusParam && !isItemStatus(statusParam)) {
  return NextResponse.json(
    { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
    { status: 400 }
  );
}
```

Dieses Muster wird für `sortBy`- und `sortOrder`-Parameter wiederholt.

## Sucheeingabe-Bereinigung

Textsuche-Parameter werden getrimmt und normalisiert:

```typescript
const searchRaw = searchParams.get('search');
const search = searchRaw?.trim() ? searchRaw.trim() : undefined;
```

CSV-Parameter werden geparst und normalisiert:

```typescript
const parseCsv = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  const arr = value.split(',').map(v => v.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
};
```

## Paginierungshilfsprogramme (`lib/paginate.ts`)

Einfache Paginierungshilfen für vorlagenseitige Paginierung:

```typescript
export const PER_PAGE = 12;

export function totalPages(size: number, perPage: number = PER_PAGE) {
  return Math.ceil(size / perPage);
}

export function paginateMeta(rawPage: number | string = 1, perPage: number = PER_PAGE) {
  const page = typeof rawPage === 'string' ? parseInt(rawPage) : rawPage;
  const start = (page - 1) * perPage;
  return { page, start };
}
```

## Validierungsebenen-Übersicht

| Ebene | Ort | Mechanismus | Zweck |
|-------|-----|-------------|-------|
| Authentifizierung | Routen-Handler | `session?.user?.isAdmin` | Rollenbasierter Zugriff |
| Body-Größe | `lib/utils/request-body.ts` | Stream-Reader | Übergroße Payloads verhindern |
| Paginierung | `lib/utils/pagination-validation.ts` | URLSearchParams-Parsing | Page/Limit validieren |
| Enum-Parameter | Routen-Handler Inline | Type-Guard-Funktionen | Status, sortBy usw. validieren |
| Body-Schema | `lib/validations/*.ts` | Zod-Schemas | Strukturierte Eingabevalidierung |
| Suche | Routen-Handler Inline | Trim + CSV-Parsing | Eingabebereinigung |
