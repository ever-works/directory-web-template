---
id: tracking-components
title: Tracking & Analytics Components
sidebar_label: Tracking
sidebar_position: 8
---

# Tracking & Analytics Components

The tracking components provide lightweight, client-side analytics capabilities for monitoring user interactions with directory items. The system is designed around a best-effort philosophy, where tracking failures are silently swallowed to ensure they never affect page performance or user experience.

## Architecture Overview

```
template/components/tracking/
  item-view-tracker.tsx       # Client-side item page view tracker
```

## ItemViewTracker

A zero-UI client component that records a unique daily view for a directory item page. It fires a single POST request on mount and renders nothing to the DOM.

```tsx
import { ItemViewTracker } from '@/components/tracking/item-view-tracker';

<ItemViewTracker slug="my-product" />
```

### ItemViewTrackerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slug` | `string` | required | The URL slug of the directory item being viewed |

### How It Works

The component uses a `useEffect` hook that runs once on mount (with `slug` as the sole dependency). It sends a `POST` request to the views API endpoint:

```
POST /api/items/{slug}/views
```

Key implementation details:

| Feature | Detail |
|---------|--------|
| **Request method** | `POST` |
| **API endpoint** | `/api/items/{slug}/views` |
| **keepalive** | `true` (request survives page navigation) |
| **Error handling** | `.catch(() => {})` - all errors silently swallowed |
| **Render output** | `null` - no DOM elements produced |
| **Re-trigger** | Only when `slug` value changes |

### Design Principles

The `ItemViewTracker` follows a **best-effort tracking** pattern:

1. **Non-blocking**: The fetch call is fire-and-forget with no `await` or loading states
2. **Resilient**: Errors from network failures, server errors, or ad blockers are caught and discarded
3. **Minimal**: No state management, no retry logic, no user feedback
4. **Invisible**: Returns `null`, producing zero visual output
5. **Keepalive**: Uses `keepalive: true` so the request completes even if the user navigates away

### Client-Side Directive

The component uses the `'use client'` directive, as it relies on:

- `useEffect` for mount-time side effects
- `fetch` for browser-side HTTP requests

This makes it compatible with Next.js App Router server component trees when used as a leaf node.

### Deduplication

View deduplication (e.g., one view per user per day) is handled server-side by the `/api/items/{slug}/views` endpoint. The client component simply fires the request without concern for whether the view has already been counted.

## Integration Example

The `ItemViewTracker` is typically placed inside item detail pages where it can access the item slug:

```tsx
// app/[locale]/items/[slug]/page.tsx
import { ItemViewTracker } from '@/components/tracking/item-view-tracker';

export default function ItemDetailPage({ params }: { params: { slug: string } }) {
  return (
    <div>
      <ItemViewTracker slug={params.slug} />
      {/* Rest of item detail content */}
    </div>
  );
}
```

Since the component renders `null`, it can be placed anywhere in the component tree without affecting layout.

### Usage with Server Components

Because `ItemViewTracker` is a client component, it can be embedded directly within a server component page:

```tsx
// Server component page
async function ItemPage({ slug }: { slug: string }) {
  const item = await fetchItemData(slug);

  return (
    <article>
      <ItemViewTracker slug={slug} />
      <h1>{item.title}</h1>
      <p>{item.description}</p>
    </article>
  );
}
```

The server component handles data fetching while `ItemViewTracker` handles the client-side tracking concern independently.

## API Contract

The tracking component depends on the following API endpoint:

### POST `/api/items/{slug}/views`

| Aspect | Detail |
|--------|--------|
| **Method** | `POST` |
| **Path parameter** | `slug` - the item's URL-safe identifier |
| **Request body** | None |
| **Authentication** | Not required (anonymous tracking) |
| **Success response** | Status 200/201 |
| **Deduplication** | Server-side (typically one count per IP per day) |

The API endpoint is responsible for:

- Validating the item slug exists
- Checking for duplicate views (daily per-user/IP deduplication)
- Incrementing the view counter in the database
- Returning appropriate status codes

## Extending the Tracking System

To add new tracking capabilities, follow the same best-effort pattern:

```tsx
'use client';

import { useEffect } from 'react';

interface EventTrackerProps {
  eventType: string;
  metadata?: Record<string, string>;
}

export function EventTracker({ eventType, metadata }: EventTrackerProps) {
  useEffect(() => {
    fetch('/api/analytics/events', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, metadata }),
    }).catch(() => {
      // Best-effort tracking - swallow errors silently
    });
  }, [eventType]);

  return null;
}
```

Key principles for new tracking components:

| Principle | Implementation |
|-----------|---------------|
| Zero UI | Always return `null` |
| Best effort | Always catch and swallow errors |
| Keepalive | Use `keepalive: true` for navigation resilience |
| Minimal deps | Keep the dependency array tight to avoid duplicate tracking |
| Client-only | Use `'use client'` directive for browser API access |

## Dependencies

| Import | Source | Purpose |
|--------|--------|---------|
| `useEffect` | `react` | Mount-time side effect for tracking |
| `fetch` | Browser API | HTTP request to views endpoint |
