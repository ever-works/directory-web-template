---
id: how-to-add-a-new-feature
title: "How to Add a New Feature"
sidebar_label: "Add a New Feature"
sidebar_position: 1
---

# How to Add a New Feature

This guide walks you through the complete lifecycle of adding a new feature to the template, following the established architecture: **schema, migration, repository, service, API route, hook, component**.

We will use a concrete example throughout -- adding a **Bookmarks** feature that lets users bookmark items.

## Prerequisites

- Node.js >= 20.19.0 and pnpm installed
- PostgreSQL database running and `DATABASE_URL` configured in `.env.local`
- Familiarity with TypeScript, Next.js App Router, Drizzle ORM, and React Query
- Development server running (`pnpm dev`)

---

## Step 1: Define the Database Schema

Open `lib/db/schema.ts` and add a new table definition. Follow the existing conventions: use `pgTable`, include `id`, `createdAt`, and relevant indexes.

```ts
// lib/db/schema.ts

// ######################### Bookmarks Schema #########################
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemSlug: text('item_slug').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIndex: index('bookmarks_user_id_idx').on(table.userId),
    itemIndex: index('bookmarks_item_slug_idx').on(table.itemSlug),
    uniqueBookmark: uniqueIndex('bookmarks_user_item_unique').on(
      table.userId,
      table.itemSlug,
    ),
  }),
);
```

**Key conventions:**
- Use `text('id')` with `crypto.randomUUID()` for primary keys.
- Always add `createdAt` with `defaultNow()`.
- Add indexes for frequently queried columns.
- Use `references()` with `onDelete: 'cascade'` for foreign keys.

---

## Step 2: Generate and Run the Migration

The project uses Drizzle Kit to generate SQL migrations from schema changes.

```bash
# Generate a migration file from schema diff
pnpm db:generate

# Run pending migrations against the database
pnpm db:migrate
```

This creates a new SQL file in `lib/db/migrations/` such as `0029_add_bookmarks.sql`. Verify the generated SQL looks correct before running the migration.

> See [How to Write Database Migrations](./how-to-write-database-migrations.md) for advanced migration patterns.

---

## Step 3: Create Database Queries

Add a query module for your feature. This keeps raw database access separated from business logic.

```ts
// lib/db/queries/bookmark.queries.ts

import { db } from '@/lib/db';
import { bookmarks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getBookmarksByUserId(userId: string) {
  return db.select().from(bookmarks).where(eq(bookmarks.userId, userId));
}

export async function getBookmark(userId: string, itemSlug: string) {
  const result = await db
    .select()
    .from(bookmarks)
    .where(
      and(eq(bookmarks.userId, userId), eq(bookmarks.itemSlug, itemSlug)),
    );
  return result[0] ?? null;
}

export async function createBookmark(data: {
  userId: string;
  itemSlug: string;
  note?: string;
}) {
  const [bookmark] = await db.insert(bookmarks).values(data).returning();
  return bookmark;
}

export async function deleteBookmark(userId: string, itemSlug: string) {
  return db
    .delete(bookmarks)
    .where(
      and(eq(bookmarks.userId, userId), eq(bookmarks.itemSlug, itemSlug)),
    );
}
```

---

## Step 4: Create the Service Layer

Services contain business logic and orchestrate queries. Place them in `lib/services/`.

```ts
// lib/services/bookmark.service.ts

import {
  getBookmarksByUserId,
  getBookmark,
  createBookmark,
  deleteBookmark,
} from '@/lib/db/queries/bookmark.queries';

export class BookmarkService {
  /**
   * Get all bookmarks for a user
   */
  static async getUserBookmarks(userId: string) {
    return getBookmarksByUserId(userId);
  }

  /**
   * Toggle a bookmark -- creates it if absent, removes if present
   */
  static async toggleBookmark(
    userId: string,
    itemSlug: string,
    note?: string,
  ) {
    const existing = await getBookmark(userId, itemSlug);
    if (existing) {
      await deleteBookmark(userId, itemSlug);
      return { bookmarked: false };
    }
    const bookmark = await createBookmark({ userId, itemSlug, note });
    return { bookmarked: true, bookmark };
  }

  /**
   * Check if a user has bookmarked a specific item
   */
  static async isBookmarked(userId: string, itemSlug: string) {
    const bookmark = await getBookmark(userId, itemSlug);
    return !!bookmark;
  }
}
```

**Key conventions:**
- Use static methods for stateless services.
- Keep services thin -- delegate data access to queries.
- Add JSDoc comments for every public method.

---

## Step 5: Create the API Route

API routes live in `app/api/`. Use the file-based routing structure and follow the established response format.

```ts
// app/api/bookmarks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BookmarkService } from '@/lib/services/bookmark.service';

/**
 * @swagger
 * /api/bookmarks:
 *   get:
 *     tags: ["Bookmarks"]
 *     summary: "Get user bookmarks"
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Bookmarks retrieved"
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const bookmarks = await BookmarkService.getUserBookmarks(
      session.user.id,
    );
    return NextResponse.json({ success: true, data: bookmarks });
  } catch (error) {
    console.error('Error in GET /api/bookmarks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/bookmarks:
 *   post:
 *     tags: ["Bookmarks"]
 *     summary: "Toggle bookmark"
 *     security:
 *       - sessionAuth: []
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    if (!body.itemSlug) {
      return NextResponse.json(
        { success: false, error: 'itemSlug is required' },
        { status: 400 },
      );
    }

    const result = await BookmarkService.toggleBookmark(
      session.user.id,
      body.itemSlug,
      body.note,
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in POST /api/bookmarks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

> See [How to Add an API Endpoint](./how-to-add-an-api-endpoint.md) for full patterns including validation and Swagger docs.

---

## Step 6: Create the Custom Hook

Hooks live in `hooks/` and wrap React Query for data fetching and mutations.

```ts
// hooks/use-bookmarks.ts

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

const QUERY_KEYS = {
  bookmarks: ['bookmarks'] as const,
};

export function useBookmarks() {
  const queryClient = useQueryClient();

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.bookmarks,
    queryFn: async () => {
      const response = await serverClient.get<{
        success: boolean;
        data: any[];
      }>('/api/bookmarks');
      if (!apiUtils.isSuccess(response)) {
        throw new Error(apiUtils.getErrorMessage(response));
      }
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { mutateAsync: toggleBookmark, isPending: isToggling } =
    useMutation({
      mutationFn: async (itemSlug: string) => {
        const response = await serverClient.post('/api/bookmarks', {
          itemSlug,
        });
        if (!apiUtils.isSuccess(response)) {
          throw new Error(apiUtils.getErrorMessage(response));
        }
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.bookmarks,
        });
      },
    });

  const isBookmarked = (itemSlug: string) =>
    bookmarks.some((b: any) => b.itemSlug === itemSlug);

  return { bookmarks, isLoading, toggleBookmark, isToggling, isBookmarked };
}
```

> See [How to Add a New Hook](./how-to-add-a-new-hook.md) for naming conventions and testing patterns.

---

## Step 7: Build the Component

Components go in `components/` organized by feature.

```tsx
// components/bookmarks/bookmark-button.tsx

'use client';

import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  itemSlug: string;
  className?: string;
}

export function BookmarkButton({ itemSlug, className }: BookmarkButtonProps) {
  const { toggleBookmark, isToggling, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(itemSlug);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      onClick={() => toggleBookmark(itemSlug)}
      disabled={isToggling}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <Bookmark
        className={cn(
          'h-4 w-4 transition-colors',
          bookmarked && 'fill-current text-yellow-500',
        )}
      />
    </Button>
  );
}
```

---

## Step 8: Add Translations

Add translation keys for all user-facing strings.

```json
// messages/en.json (add to existing file)
{
  "bookmarks": {
    "ADD_BOOKMARK": "Add bookmark",
    "REMOVE_BOOKMARK": "Remove bookmark",
    "MY_BOOKMARKS": "My Bookmarks",
    "NO_BOOKMARKS": "You have not bookmarked any items yet."
  }
}
```

Repeat for all supported locales.

> See [How to Add Translations](./how-to-add-translations.md) for the full i18n workflow.

---

## Step 9: Verify with Linting and Type Checks

Run the project validation commands to catch errors early.

```bash
# Type-check the entire project
pnpm tsc --noEmit

# Run the linter
pnpm lint

# Build to verify everything compiles
pnpm build
```

---

## File Structure Summary

After completing all steps, you should have created or modified these files:

```
template/
  lib/
    db/
      schema.ts                        # Modified -- added bookmarks table
      migrations/
        00XX_add_bookmarks.sql         # Generated by Drizzle Kit
      queries/
        bookmark.queries.ts            # New -- database queries
    services/
      bookmark.service.ts              # New -- business logic
  app/
    api/
      bookmarks/
        route.ts                       # New -- API endpoint
  hooks/
    use-bookmarks.ts                   # New -- React Query hook
  components/
    bookmarks/
      bookmark-button.tsx              # New -- UI component
  messages/
    en.json                            # Modified -- added bookmark keys
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Migration fails with "column already exists" | Check if you ran `db:generate` twice without reverting. Delete the duplicate migration file. |
| Hook returns stale data after mutation | Ensure `onSuccess` calls `queryClient.invalidateQueries` with the correct query key. |
| API route returns 401 unexpectedly | Verify `auth()` is imported from `@/lib/auth`, not from `next-auth`. |
| TypeScript errors after schema change | Run `pnpm db:generate` to regenerate types, then restart the TS server in your editor. |
| Component not rendering updates | Confirm `'use client'` is at the top of your hook and component files. |

---

## Checklist

Before considering the feature complete, verify the following:

- [ ] Database schema added to `lib/db/schema.ts`
- [ ] Migration generated and applied successfully
- [ ] Query functions created in `lib/db/queries/`
- [ ] Service layer created in `lib/services/`
- [ ] API route created with proper auth guards and error handling
- [ ] Swagger JSDoc annotations added to the API route
- [ ] React Query hook created in `hooks/`
- [ ] UI component created in `components/`
- [ ] Translation keys added to all locale files in `messages/`
- [ ] `pnpm tsc --noEmit` passes with no errors
- [ ] `pnpm lint` passes with no warnings
- [ ] `pnpm build` completes successfully
- [ ] Feature tested manually in the browser

---

## Related Guides

- [How to Add an API Endpoint](./how-to-add-an-api-endpoint.md)
- [How to Add a New Hook](./how-to-add-a-new-hook.md)
- [How to Write Database Migrations](./how-to-write-database-migrations.md)
- [How to Add Translations](./how-to-add-translations.md)
- [How to Add a New Component](./how-to-add-a-new-component.md)
