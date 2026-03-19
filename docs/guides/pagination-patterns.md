---
id: pagination-patterns
title: "Pagination Patterns"
sidebar_label: "Pagination Patterns"
sidebar_position: 19
---

# Pagination Patterns

The template provides two complementary pagination utilities: a **validation layer** for API routes (`lib/utils/pagination-validation.ts`) and a **metadata helper** for content pagination (`lib/paginate.ts`). Together they cover server-side parameter validation and client-side page calculation.

## Pagination Validation (API Routes)

The `pagination-validation` module provides shared validation logic for pagination parameters across admin API routes.

### Types

```ts
interface PaginationParams {
  page: number;
  limit: number;
}

interface PaginationError {
  error: string;
  status: 400;
}
```

`PaginationParams` represents successfully validated parameters. `PaginationError` is returned when validation fails, always with HTTP status `400`.

### validatePaginationParams

The main validation function extracts and validates `page` and `limit` from URL search params:

```ts
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = validatePaginationParams(searchParams);

  // Check if validation failed
  if ('error' in result) {
    return Response.json(
      { error: result.error },
      { status: result.status }
    );
  }

  // Use validated params
  const { page, limit } = result;
  const offset = (page - 1) * limit;

  const data = await fetchItems({ offset, limit });
  return Response.json(data);
}
```

### Validation Rules

| Parameter | Default | Validation |
|-----------|---------|------------|
| `page` | `1` | Must be a positive integer (1 or greater) |
| `limit` | `10` | Must be between 1 and 100 inclusive |

When a parameter is missing from the URL, the default value is used. When a parameter is present but invalid, the function returns a `PaginationError`.

### Full Implementation

```ts
export function validatePaginationParams(
  searchParams: URLSearchParams
): PaginationParams | PaginationError {
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  if (isNaN(page) || page < 1) {
    return {
      error: 'Invalid page parameter. Must be a positive integer.',
      status: 400,
    };
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return {
      error: 'Invalid limit parameter. Must be between 1 and 100.',
      status: 400,
    };
  }

  return { page, limit };
}
```

### Discriminated Union Pattern

The return type uses a discriminated union, letting you narrow the result by checking for the `error` property:

```ts
const result = validatePaginationParams(searchParams);

if ('error' in result) {
  // result is PaginationError
  return Response.json({ error: result.error }, { status: result.status });
}

// result is PaginationParams
const { page, limit } = result;
```

This pattern avoids throwing exceptions for validation failures, keeping the control flow explicit.

## Content Pagination (Page Metadata)

The `lib/paginate.ts` module provides lightweight helpers for calculating pagination metadata on content listings.

### Constants

```ts
const PER_PAGE = 12;
```

The default items-per-page value used across the application for content listings.

### totalPages

Calculates the total number of pages given a collection size:

```ts
import { totalPages, PER_PAGE } from '@/lib/paginate';

const total = totalPages(items.length); // e.g., 37 items -> 4 pages
const customTotal = totalPages(items.length, 20); // 37 items, 20 per page -> 2 pages
```

Implementation:

```ts
export function totalPages(size: number, perPage: number = PER_PAGE) {
  return Math.ceil(size / perPage);
}
```

### paginateMeta

Computes the page number and start index for array slicing:

```ts
import { paginateMeta, PER_PAGE } from '@/lib/paginate';

const { page, start } = paginateMeta(3); // page=3, start=24
const items = allItems.slice(start, start + PER_PAGE);
```

The function accepts both string and number page values, handling the URL search param case where page is a string:

```ts
export function paginateMeta(
  rawPage: number | string = 1,
  perPage: number = PER_PAGE
) {
  const page = typeof rawPage === 'string' ? parseInt(rawPage) : rawPage;
  const start = (page - 1) * perPage;
  return { page, start };
}
```

## Usage Patterns

### API Route with Validation

A typical admin API route uses `validatePaginationParams` for safe parameter extraction:

```ts
import { validatePaginationParams } from '@/lib/utils/pagination-validation';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pagination = validatePaginationParams(searchParams);

  if ('error' in pagination) {
    return NextResponse.json(
      { error: pagination.error },
      { status: pagination.status }
    );
  }

  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    db.query.items.findMany({ offset, limit }),
    db.query.items.count(),
  ]);

  return NextResponse.json({
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
```

### Content Listing Page

For server-rendered content pages, use `paginateMeta` and `totalPages`:

```ts
import { paginateMeta, totalPages, PER_PAGE } from '@/lib/paginate';

interface PageProps {
  searchParams: { page?: string };
}

export default async function ListingPage({ searchParams }: PageProps) {
  const { page, start } = paginateMeta(searchParams.page);
  const allItems = await getItems();
  const pageItems = allItems.slice(start, start + PER_PAGE);
  const pages = totalPages(allItems.length);

  return (
    <div>
      <ItemGrid items={pageItems} />
      <Pagination currentPage={page} totalPages={pages} />
    </div>
  );
}
```

### Combining Both Utilities

For API endpoints that serve paginated content, you can combine both utilities:

```ts
import { validatePaginationParams } from '@/lib/utils/pagination-validation';
import { totalPages } from '@/lib/paginate';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = validatePaginationParams(searchParams);

  if ('error' in result) {
    return Response.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const items = await getAllItems();
  const { page, limit } = result;
  const start = (page - 1) * limit;
  const pageItems = items.slice(start, start + limit);

  return Response.json({
    data: pageItems,
    meta: {
      page,
      limit,
      total: items.length,
      totalPages: totalPages(items.length, limit),
    },
  });
}
```

## Source Files

| File | Purpose |
|------|---------|
| `lib/utils/pagination-validation.ts` | API pagination parameter validation |
| `lib/paginate.ts` | Content pagination metadata helpers |
