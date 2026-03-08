---
id: how-to-add-a-service
title: "How to Add a Service"
sidebar_label: "Add a Service"
sidebar_position: 70
---

# How to Add a Service

This guide walks through creating a new service in the template. Services encapsulate business logic and live in `lib/services/`. They sit between API route handlers (or React Server Components) and the data-access layer (`lib/repositories/` and `lib/db/queries/`).

## Prerequisites

- Familiarity with TypeScript classes and async/await
- Understanding of the repository/query pattern used in `lib/db/queries/`
- Development server running (`pnpm dev`)

---

## Architecture Overview

The template follows a layered architecture:

```
API Route / Server Component
        |
   lib/services/        <-- Business logic (this guide)
        |
   lib/repositories/    <-- Complex read queries, aggregations
   lib/db/queries/      <-- CRUD operations per entity
        |
   lib/db/drizzle.ts    <-- Database connection
```

Services are the right place for:

- Orchestrating multiple query calls into a single operation
- Validation and transformation logic that does not belong in a component
- Side effects such as sending emails, creating notifications, or calling external APIs
- Deduplication strategies (see `company.service.ts` for an example)

---

## Step 1: Create the Service File

Create a new file in `lib/services/`. Use the naming convention `<entity>.service.ts`:

```
lib/services/
  company.service.ts
  notification.service.ts
  your-feature.service.ts      <-- new file
```

---

## Step 2: Define the Interface

Start by defining the input/output types for your service methods. This makes the contract explicit and enables TypeScript autocompletion throughout the codebase.

```typescript
// lib/services/bookmark.service.ts

import { db } from "@/lib/db/drizzle";
import { bookmarks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface CreateBookmarkData {
  userId: string;
  itemId: string;
  note?: string;
}

export interface BookmarkResult {
  success: boolean;
  bookmark?: typeof bookmarks.$inferSelect;
  error?: string;
}
```

---

## Step 3: Implement the Service Class

The template uses two patterns -- choose whichever fits your use case:

### Pattern A: Static Methods (Singleton)

Best for stateless services where every method receives all needed parameters. This is the pattern used by `NotificationService`:

```typescript
export class BookmarkService {
  /**
   * Create a new bookmark for a user
   */
  static async create(data: CreateBookmarkData): Promise<BookmarkResult> {
    try {
      const newBookmark = await db
        .insert(bookmarks)
        .values({
          userId: data.userId,
          itemId: data.itemId,
          note: data.note ?? null,
        })
        .returning();

      return {
        success: true,
        bookmark: newBookmark[0],
      };
    } catch (error) {
      console.error("Error creating bookmark:", error);
      return {
        success: false,
        error: "Failed to create bookmark",
      };
    }
  }

  /**
   * Remove a bookmark
   */
  static async remove(
    bookmarkId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db
        .delete(bookmarks)
        .where(
          and(
            eq(bookmarks.id, bookmarkId),
            eq(bookmarks.userId, userId)
          )
        );

      return { success: true };
    } catch (error) {
      console.error("Error removing bookmark:", error);
      return { success: false, error: "Failed to remove bookmark" };
    }
  }
}
```

### Pattern B: Exported Functions

Best for simpler services or when you want tree-shaking. This is the pattern used by `company.service.ts`:

```typescript
// lib/services/bookmark.service.ts

export async function getOrCreateBookmark(
  userId: string,
  itemId: string
): Promise<typeof bookmarks.$inferSelect> {
  // Check for existing bookmark
  const existing = await getBookmarkByUserAndItem(userId, itemId);
  if (existing) return existing;

  // Create new
  const [bookmark] = await db
    .insert(bookmarks)
    .values({ userId, itemId })
    .returning();

  return bookmark;
}
```

---

## Step 4: Connect to Queries (Optional)

If your service needs complex read logic, delegate to a dedicated queries file rather than inlining SQL in the service:

```typescript
// lib/services/bookmark.service.ts
import {
  getBookmarksByUser,
  createBookmark,
} from "@/lib/db/queries/bookmark.queries";

export class BookmarkService {
  static async listForUser(userId: string, page = 1, limit = 20) {
    return getBookmarksByUser(userId, { page, limit });
  }
}
```

This keeps the service focused on orchestration and the queries file focused on data access.

---

## Step 5: Use the Service in an API Route

```typescript
// app/api/bookmarks/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BookmarkService } from "@/lib/services/bookmark.service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId, note } = await request.json();

  const result = await BookmarkService.create({
    userId: session.user.id,
    itemId,
    note,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json(result.bookmark, { status: 201 });
}
```

---

## Step 6: Export from the Index (Optional)

If your service is widely used, export it from the barrel file:

```typescript
// lib/services/index.ts
export { BookmarkService } from "./bookmark.service";
```

---

## Error Handling Conventions

Services in the template follow a consistent error-handling pattern:

1. **Wrap database calls in try/catch** -- never let raw Drizzle errors bubble up.
2. **Return result objects** with `success`, optional data, and optional `error` message.
3. **Log errors with context** -- prefix log lines with the service name (e.g., `[BookmarkService]`).
4. **Use the Logger utility** for structured logging:

```typescript
import { Logger } from "@/lib/logger";

const logger = Logger.create("BookmarkService");

// Inside a method:
logger.error("Failed to create bookmark", error);
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Placing business logic directly in route handlers | Move it into a service so it can be reused and tested independently |
| Importing browser-only code in a service | Services run on the server; do not import client-side modules like `posthog-js` |
| Not handling database errors | Always wrap Drizzle calls in try/catch and return structured results |
| Circular imports between services | If Service A depends on Service B, consider a shared utility or inversion of control |
| Forgetting `await` on async operations | TypeScript will warn, but double-check that all DB calls are awaited |

---

## Related Pages

- [Architecture Overview](/template/architecture) -- system layers and conventions
- [How to Add a Database Table](/template/guides/how-to-add-a-database-table) -- creating the schema your service operates on
- [How to Add an API Endpoint](/template/guides/how-to-add-an-api-endpoint) -- wiring your service to HTTP routes
- [Repository Patterns](/template/architecture/repository-patterns) -- data-access conventions
- [Error Handling](/template/guides/error-handling) -- global error-handling strategies
