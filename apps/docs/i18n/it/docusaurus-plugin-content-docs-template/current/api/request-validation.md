---
id: request-validation
title: "Validazione delle Richieste API"
sidebar_label: "Validazione delle Richieste"
---

# Validazione delle Richieste API

Il template convalida le richieste API a più livelli: schemi Zod per la validazione di corpo/query, funzioni di utilità per la paginazione e i limiti di dimensione del corpo, e type guard inline per i parametri enum. Questa pagina documenta ogni meccanismo di validazione e come vengono utilizzati nei gestori di route API.

## Architettura di Validazione

```mermaid
flowchart TD
    A[Richiesta in Arrivo] --> B{Controllo Auth}
    B -->|Non autorizzato| C[Risposta 401]
    B -->|Autorizzato| D{Controllo Content-Length}
    D -->|Troppo grande| E[Risposta 413]
    D -->|OK| F{Validazione Paginazione}
    F -->|Non valido| G[Risposta 400]
    F -->|Valido| H{Validazione Parametri}
    H -->|Enum non valido| I[Risposta 400]
    H -->|Valido| J{Validazione Corpo}
    J -->|Errore Zod| K[Risposta 400]
    J -->|Valido| L[Servizio / Repository]
    L -->|Errore| M[safeErrorResponse]
    L -->|Successo| N[Risposta 200/201]
```

## Schemi di Validazione Zod

### Schema Posizione (`lib/validations/item.ts`)

Tutti i campi sono opzionali; la rigidità è controllata dalle impostazioni a livello di modulo:

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

### Schemi Elemento Cliente (`lib/validations/client-item.ts`)

#### Crea Elemento

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

#### Aggiorna Elemento

Utilizza le stesse definizioni di campo con tutti i campi opzionali:

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

#### Parametri di Query per Lista

I parametri di query usano `.transform()` per convertire gli input stringa in valori tipizzati:

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

### Schema Password (`lib/validations/auth.ts`)

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### Schemi Azienda (`lib/validations/company.ts`)

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

### Tipi Inferiti

Tutti gli schemi esportano i tipi inferiti Zod insieme allo schema:

```typescript
export type ClientUpdateItemInput = z.infer<typeof clientUpdateItemSchema>;
export type ClientCreateItemInput = z.infer<typeof clientCreateItemSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
```

## Validazione della Paginazione (`lib/utils/pagination-validation.ts`)

Una utilità condivisa per la validazione dei parametri di query `page` e `limit`:

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

L'utilizzo nei gestori di route segue un pattern union discriminata:

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

## Limiti di Dimensione del Corpo della Richiesta (`lib/utils/request-body.ts`)

### `readBodyWithLimit`

Legge il corpo della richiesta tramite `ReadableStream` con controllo incrementale della dimensione:

```typescript
export async function readBodyWithLimit<T = unknown>(
  request: NextRequest,
  options: ReadBodyOptions
): Promise<ReadBodyResult<T>>
```

Caratteristiche:
- Percorso veloce: controlla prima l'intestazione `Content-Length`
- Incrementale: legge i chunk dello stream e controlla la dimensione man mano che arrivano i byte
- Annullamento: chiama `reader.cancel()` quando il limite viene superato
- Parsing JSON: opzionale, gestisce correttamente `SyntaxError`

```typescript
// Utilizzo
const { data } = await readBodyWithLimit(request, { maxSize: 1024 });
```

### `validateContentLength`

Rifiuto anticipato senza leggere il corpo:

```typescript
export function validateContentLength(request: NextRequest, maxSize: number): boolean
```

Lancia `BodySizeLimitError` se l'intestazione `Content-Length` supera il limite.

### `BodySizeLimitError`

Classe di errore personalizzata con proprietà `maxSize` e `actualSize`:

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

## Validazione dei Parametri Inline

Per i parametri enum non coperti dagli schemi Zod, i gestori di route utilizzano type guard inline:

```typescript
// Validazione dello stato type-safe
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

Questo pattern si ripete per i parametri `sortBy` e `sortOrder`.

## Sanitizzazione degli Input di Ricerca

I parametri di ricerca testuale vengono eliminati e normalizzati:

```typescript
const searchRaw = searchParams.get('search');
const search = searchRaw?.trim() ? searchRaw.trim() : undefined;
```

I parametri CSV vengono analizzati e normalizzati:

```typescript
const parseCsv = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  const arr = value.split(',').map(v => v.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
};
```

## Utilità di Paginazione (`lib/paginate.ts`)

Semplici helper di paginazione per la paginazione a livello di template:

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

## Riepilogo del Livello di Validazione

| Livello | Posizione | Meccanismo | Scopo |
|-------|----------|-----------|-------|
| Auth | Gestore di route | `session?.user?.isAdmin` | Controllo degli accessi basato su ruoli |
