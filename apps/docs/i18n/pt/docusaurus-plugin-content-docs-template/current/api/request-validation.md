---
id: request-validation
title: "Validação de Requisições da API"
sidebar_label: "Validação de Requisições"
sidebar_position: 8
---

# Validação de Requisições da API

O template valida as requisições da API em múltiplas camadas: schemas Zod para validação de corpo/consulta, funções utilitárias para paginação e limites de tamanho do corpo, e type guards inline para parâmetros enum. Esta página documenta cada mecanismo de validação e como são usados nos manipuladores de rotas da API.

## Arquitetura de Validação

```mermaid
flowchart TD
    A[Requisição Recebida] --> B{Verificação de Auth}
    B -->|Não autorizado| C[Resposta 401]
    B -->|Autorizado| D{Verificação de Content-Length}
    D -->|Muito grande| E[Resposta 413]
    D -->|OK| F{Validação de Paginação}
    F -->|Inválido| G[Resposta 400]
    F -->|Válido| H{Validação de Parâmetros}
    H -->|Enum inválido| I[Resposta 400]
    H -->|Válido| J{Validação do Corpo}
    J -->|Erro Zod| K[Resposta 400]
    J -->|Válido| L[Serviço / Repositório]
    L -->|Erro| M[safeErrorResponse]
    L -->|Sucesso| N[Resposta 200/201]
```

## Schemas de Validação Zod

### Schema de Localização (`lib/validations/item.ts`)

Todos os campos são opcionais; o rigor é controlado pelas configurações a nível de formulário:

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

### Schemas de Item do Cliente (`lib/validations/client-item.ts`)

#### Criar Item

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

#### Atualizar Item

Usa as mesmas definições de campos com todos os campos opcionais:

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

#### Parâmetros de Consulta para Listação

Os parâmetros de consulta usam `.transform()` para converter entradas em string para valores tipados:

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

### Schema de Senha (`lib/validations/auth.ts`)

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### Schemas de Empresa (`lib/validations/company.ts`)

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

### Tipos Inferidos

Todos os schemas exportam tipos inferidos pelo Zod junto com o schema:

```typescript
export type ClientUpdateItemInput = z.infer<typeof clientUpdateItemSchema>;
export type ClientCreateItemInput = z.infer<typeof clientCreateItemSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
```

## Validação de Paginação (`lib/utils/pagination-validation.ts`)

Um utilitário compartilhado para validar os parâmetros de consulta `page` e `limit`:

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

O uso nos manipuladores de rotas segue um padrão de união discriminada:

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

## Limites de Tamanho do Corpo da Requisição (`lib/utils/request-body.ts`)

### `readBodyWithLimit`

Lê o corpo da requisição via `ReadableStream` com verificação incremental de tamanho:

```typescript
export async function readBodyWithLimit<T = unknown>(
  request: NextRequest,
  options: ReadBodyOptions
): Promise<ReadBodyResult<T>>
```

Características:
- Caminho rápido: verifica primeiro o cabeçalho `Content-Length`
- Incremental: lê chunks do stream e verifica o tamanho à medida que os bytes chegam
- Cancelamento: chama `reader.cancel()` quando o limite é excedido
- Parsing JSON: opcional, trata `SyntaxError` graciosamente

```typescript
// Uso
const { data } = await readBodyWithLimit(request, { maxSize: 1024 });
```

### `validateContentLength`

Rejeição antecipada sem ler o corpo:

```typescript
export function validateContentLength(request: NextRequest, maxSize: number): boolean
```

Lança `BodySizeLimitError` se o cabeçalho `Content-Length` exceder o limite.

### `BodySizeLimitError`

Classe de erro personalizada com propriedades `maxSize` e `actualSize`:

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

## Validação de Parâmetros Inline

Para parâmetros enum não cobertos por schemas Zod, os manipuladores de rotas usam type guards inline:

```typescript
// Validação de status com type safety
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

Este padrão é repetido para os parâmetros `sortBy` e `sortOrder`.

## Sanitização de Entrada de Pesquisa

Os parâmetros de pesquisa de texto são aparados e normalizados:

```typescript
const searchRaw = searchParams.get('search');
const search = searchRaw?.trim() ? searchRaw.trim() : undefined;
```

Parâmetros CSV são analisados e normalizados:

```typescript
const parseCsv = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  const arr = value.split(',').map(v => v.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
};
```

## Utilitários de Paginação (`lib/paginate.ts`)

Helpers simples de paginação para paginação a nível de template:

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

## Resumo da Camada de Validação

| Camada | Localização | Mecanismo | Propósito |
|-------|------------|-----------|----------|
| Auth | Manipulador de rota | `session?.user?.isAdmin` | Controle de acesso baseado em função |
| Tamanho do corpo | `lib/utils/request-body.ts` | Leitor de stream | Prevenir payloads muito grandes |
| Paginação | `lib/utils/pagination-validation.ts` | Parsing de URLSearchParams | Validar page/limit |
| Parâmetros enum | Inline no manipulador de rota | Funções type guard | Validar status, sortBy, etc. |
| Schema do corpo | `lib/validations/*.ts` | Schemas Zod | Validação estruturada de entrada |
| Pesquisa | Inline no manipulador de rota | Trim + parsing CSV | Sanitização de entrada |
