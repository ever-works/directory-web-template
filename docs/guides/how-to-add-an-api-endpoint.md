---
id: how-to-add-an-api-endpoint
title: "How to Add an API Endpoint"
sidebar_label: "Add an API Endpoint"
sidebar_position: 3
---

# How to Add an API Endpoint

This guide covers creating new API routes in the template, including file placement, authentication guards, request validation, error handling, and Swagger documentation.

## Prerequisites

- Familiarity with Next.js App Router API routes
- Understanding of the `auth()` function from `@/lib/auth`
- Development server running (`pnpm dev`)

---

## Architecture Overview

API routes live under `app/api/` and follow Next.js file-based routing conventions:

```
app/api/
  items/
    [slug]/
      comments/
        route.ts           # /api/items/:slug/comments
        [commentId]/
          route.ts         # /api/items/:slug/comments/:commentId
  admin/
    items/
      route.ts             # /api/admin/items
  bookmarks/
    route.ts               # /api/bookmarks
```

Each `route.ts` file exports named functions for HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.

---

## Step 1: Choose the Route Path

Decide on the URL structure following REST conventions:

| Pattern | Example | Use Case |
|---------|---------|----------|
| `/api/resource` | `/api/bookmarks` | List / create resources |
| `/api/resource/[id]` | `/api/bookmarks/[id]` | Get / update / delete single resource |
| `/api/resource/[id]/sub` | `/api/items/[slug]/comments` | Nested resources |
| `/api/admin/resource` | `/api/admin/items` | Admin-only endpoints |

---

## Step 2: Create the Route File

Use the route template as a starting point. The template is located at `templates/route-template.ts`.

Create the directory structure and route file:

```bash
mkdir -p app/api/bookmarks
touch app/api/bookmarks/route.ts
```

---

## Step 3: Implement the GET Handler

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
 *     description: "Returns all bookmarks for the authenticated user."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: "integer"
 *           default: 1
 *         description: "Page number"
 *       - name: "limit"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: "integer"
 *           default: 20
 *         description: "Items per page"
 *     responses:
 *       200:
 *         description: "Bookmarks retrieved successfully"
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // 3. Call service layer
    const bookmarks = await BookmarkService.getUserBookmarks(
      session.user.id,
      { page, limit },
    );

    // 4. Return standardized response
    return NextResponse.json({
      success: true,
      data: bookmarks,
    });
  } catch (error) {
    console.error('Error in GET /api/bookmarks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

---

## Step 4: Implement the POST Handler

```ts
/**
 * @swagger
 * /api/bookmarks:
 *   post:
 *     tags: ["Bookmarks"]
 *     summary: "Create a bookmark"
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemSlug:
 *                 type: string
 *               note:
 *                 type: string
 *             required: ["itemSlug"]
 *     responses:
 *       201:
 *         description: "Bookmark created"
 *       400:
 *         description: "Validation error"
 *       401:
 *         description: "Unauthorized"
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // 2. Parse and validate body
    const body = await request.json();

    if (!body.itemSlug || typeof body.itemSlug !== 'string') {
      return NextResponse.json(
        { success: false, error: 'itemSlug is required and must be a string' },
        { status: 400 },
      );
    }

    // 3. Call service
    const result = await BookmarkService.toggleBookmark(
      session.user.id,
      body.itemSlug,
      body.note,
    );

    // 4. Return response
    return NextResponse.json(
      { success: true, data: result, message: 'Bookmark toggled' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in POST /api/bookmarks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

---

## Step 5: Implement Dynamic Route Parameters

For routes with dynamic segments like `/api/bookmarks/[id]`:

```ts
// app/api/bookmarks/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Fetch the specific bookmark
    const bookmark = await BookmarkService.getById(id);

    if (!bookmark) {
      return NextResponse.json(
        { success: false, error: 'Bookmark not found' },
        { status: 404 },
      );
    }

    // Authorization: ensure user owns the resource
    if (bookmark.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, data: bookmark });
  } catch (error) {
    console.error('Error in GET /api/bookmarks/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { id } = await params;
    await BookmarkService.delete(session.user.id, id);

    return NextResponse.json({
      success: true,
      message: 'Bookmark deleted',
    });
  } catch (error) {
    console.error('Error in DELETE /api/bookmarks/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

---

## Authentication Patterns

### Public Endpoint (No Auth Required)

```ts
export async function GET() {
  // No auth check -- open to all
  const data = await PublicService.getItems();
  return NextResponse.json({ success: true, data });
}
```

### Authenticated User Endpoint

```ts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }
  // session.user.id is now available
}
```

### Admin-Only Endpoint

```ts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }
  if (!session.user.isAdmin) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 },
    );
  }
  // Admin-only logic here
}
```

---

## Validation with Zod

For complex input validation, use Zod schemas:

```ts
import { z } from 'zod';

const CreateBookmarkSchema = z.object({
  itemSlug: z.string().min(1, 'itemSlug is required'),
  note: z.string().max(500).optional(),
});

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
    const parsed = CreateBookmarkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await BookmarkService.create(
      session.user.id,
      parsed.data,
    );
    return NextResponse.json(
      { success: true, data: result },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

---

## Response Format Convention

All API responses follow a consistent shape:

```ts
// Success response
{
  success: true,
  data: { /* resource data */ },
  message: "Operation completed" // optional
}

// Error response
{
  success: false,
  error: "Human-readable error message",
  details: { /* validation details */ } // optional
}

// List response
{
  success: true,
  data: [ /* items */ ],
  total: 100,
  page: 1,
  limit: 20,
  totalPages: 5
}
```

---

## Swagger / JSDoc Documentation

Every endpoint should include Swagger JSDoc annotations. These are picked up by the API documentation generator.

Follow this template for each HTTP method:

```ts
/**
 * @swagger
 * /api/your-route:
 *   get:
 *     tags: ["Your Tag"]
 *     summary: "Short summary"
 *     description: "Detailed description"
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "paramName"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: "string"
 *     responses:
 *       200:
 *         description: "Success"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
```

---

## Database Availability Check

For endpoints that depend on the database, add an availability check:

```ts
import { checkDatabaseAvailability } from '@/lib/utils/database-check';

export async function GET() {
  const dbAvailable = await checkDatabaseAvailability();
  if (!dbAvailable) {
    return NextResponse.json(
      { success: false, error: 'Database not available' },
      { status: 503 },
    );
  }
  // Proceed with database operations
}
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Route not found (404) | Ensure the file is named `route.ts` (not `index.ts` or `page.ts`) and is in the correct directory. |
| `auth()` returns null on valid session | Make sure you import `auth` from `@/lib/auth`, not directly from `next-auth`. |
| Request body is empty | Ensure the client sends `Content-Type: application/json` header. |
| Dynamic params are undefined | In App Router, `params` is a Promise -- use `const { id } = await params;`. |
| CORS errors from frontend | The template handles CORS via middleware. Check `middleware.ts` if you encounter issues. |
| Large payloads fail | Next.js has a default body size limit. For file uploads, use `FormData` and configure the route segment. |

---

## Checklist

- [ ] Route file created at the correct path under `app/api/`
- [ ] All exported functions use proper HTTP method names (`GET`, `POST`, `PUT`, `DELETE`)
- [ ] Authentication guard added where required
- [ ] Request body validated (Zod preferred for complex inputs)
- [ ] Responses follow the `{ success, data, error }` format
- [ ] Proper HTTP status codes used (200, 201, 400, 401, 403, 404, 500)
- [ ] Error handling with try/catch and `console.error`
- [ ] Swagger JSDoc annotations added for each method
- [ ] Business logic delegated to service layer (route handler stays thin)
- [ ] `pnpm tsc --noEmit` passes
- [ ] Endpoint tested manually with the dev server

---

## Related Guides

- [How to Add a New Feature](./how-to-add-a-new-feature.md)
- [How to Add a New Hook](./how-to-add-a-new-hook.md)
- [How to Write Database Migrations](./how-to-write-database-migrations.md)
