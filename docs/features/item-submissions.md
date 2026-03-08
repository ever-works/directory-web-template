---
id: item-submissions
title: Item Submissions
sidebar_label: Item Submissions
sidebar_position: 31
---

# Item Submissions

The item submission system provides a complete workflow for users to submit, manage, and track directory listings. It includes status tracking (pending, approved, rejected), filtering, stats cards, detail modals, edit modals, and deletion with confirmation.

## Architecture Overview

| Module | Path | Purpose |
|--------|------|---------|
| SubmissionList | `components/submissions/submission-list.tsx` | Main list component with pagination |
| SubmissionItem | `components/submissions/submission-item.tsx` | Individual submission card |
| SubmissionFilters | `components/submissions/submission-filters.tsx` | Status tabs and search |
| SubmissionStatsCards | `components/submissions/submission-stats-cards.tsx` | Overview stat cards |
| EditSubmissionModal | `components/submissions/edit-submission-modal.tsx` | Inline editing modal |
| SubmissionDetailModal | `components/submissions/submission-detail-modal.tsx` | Read-only detail view |
| DeleteSubmissionDialog | `components/submissions/delete-submission-dialog.tsx` | Deletion confirmation |
| TrashItem | `components/submissions/trash-item.tsx` | Trashed item display |
| Plan Guard | `lib/guards/plan-features.guard.ts` | Submission limits by plan |

## Submission Data Model

The `Submission` interface represents a submission in the UI:

```ts
export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  source_url?: string;
}
```

The `toSubmission` helper converts from the API data model:

```ts
export function toSubmission(
  item: ClientSubmissionData
): Submission {
  const approvedAt =
    item.status === 'approved' ? item.reviewed_at : undefined;
  const rejectedAt =
    item.status === 'rejected' ? item.reviewed_at : undefined;

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    status: (['approved', 'pending', 'rejected'].includes(
      item.status
    )
      ? item.status
      : 'pending') as Submission['status'],
    submittedAt: item.submitted_at || item.updated_at || null,
    approvedAt,
    rejectedAt,
    rejectionReason: item.review_notes,
    category: Array.isArray(item.category)
      ? item.category[0] || 'Uncategorized'
      : item.category || 'Uncategorized',
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    source_url: item.source_url,
  };
}
```

## Submission List Component

The `SubmissionList` component renders the list of submissions with loading, empty, and populated states:

```tsx
export interface SubmissionListProps {
  items: ClientSubmissionData[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  emptyStateActionHref?: string;
  skeletonCount?: number;
}
```

Key behaviors:

- **Loading state** -- renders `SubmissionItemSkeleton` placeholders
- **Empty state** -- shows a call-to-action linking to `/submit`
- **Populated state** -- maps items through `toSubmission()` and renders `SubmissionItem` for each
- **Optimistic loading indicators** -- `deletingId` and `updatingId` disable affected items

The `SubmissionListWithInfo` variant adds pagination metadata display.

## Status Configuration

Each submission status maps to an icon, color scheme, and translation key:

```ts
const statusConfig = {
  approved: {
    labelKey: "STATUS_APPROVED",
    icon: FiCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pending: {
    labelKey: "STATUS_PENDING",
    icon: FiClock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  rejected: {
    labelKey: "STATUS_REJECTED",
    icon: FiX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};
```

Rejected submissions display the rejection reason in a red callout box.

## Submission Filters

The `SubmissionFilters` component provides tab-style status filtering and text search:

```tsx
export interface SubmissionFiltersProps {
  status: ClientStatusFilter;
  search: string;
  onStatusChange: (status: ClientStatusFilter) => void;
  onSearchChange: (search: string) => void;
  isSearching?: boolean;
  disabled?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}
```

Features:

- **Status tabs** -- Pill buttons for All, Approved, Pending, and Rejected with optional count badges
- **Search input** -- Full-text search with clear button and loading spinner
- **Compact variant** -- `SubmissionFiltersCompact` uses a dropdown select for space-constrained layouts

## Statistics Cards

The `SubmissionStatsCards` component displays four stat cards in a grid:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

The four cards show:

| Card | Key | Color |
|------|-----|-------|
| Total Submissions | `total` | Blue |
| Approved | `approved` | Green |
| Pending | `pending` | Yellow |
| Rejected | `rejected` | Red |

Each card has a gradient icon background, animated loading skeleton, and hover shadow effect.

## Submission Item Card

Each `SubmissionItem` renders:

- Title with status badge
- Truncated description (two-line clamp)
- Up to 5 tags with overflow count
- Metadata row: category, submission date, view count, like count
- Action buttons: View, Edit, Delete
- Loading spinners on edit/delete buttons when operations are in progress
- Disabled state during bulk operations

## Plan-Based Submission Limits

The plan guard system controls how many submissions a user can make:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

To check limits before submission:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

Additional plan-gated features for submissions:

| Feature | Free | Standard | Premium |
|---------|------|----------|---------|
| Submit items | Yes | Yes | Yes |
| Max images | 1 | 5 | Unlimited |
| Description words | 200 | 500 | Unlimited |
| Video upload | No | No | Yes |
| Verified badge | No | Yes | Yes |
| Priority review | No | Yes | Yes |
| Instant review | No | No | Yes |
| Review time (days) | 7 | 3 | 1 |

## Submission Workflow

1. **User submits** -- Fills out the multi-step submission form
2. **Validation** -- Plan limits and input validation are checked
3. **Storage** -- Item data is stored in the Git-based CMS via the item service
4. **Status: Pending** -- Submission enters the admin review queue
5. **Admin review** -- Admin approves or rejects with optional notes
6. **Status: Approved/Rejected** -- User sees updated status in their dashboard
7. **Edit** -- Users can edit submissions (within plan modification limits)
8. **Delete** -- Users can delete their own submissions with confirmation dialog

## Internationalization

All UI text uses `next-intl` translations under the `client.submissions` namespace:

- `NO_SUBMISSIONS_TITLE` -- Empty state heading
- `NO_SUBMISSIONS_DESC` -- Empty state description
- `SUBMIT_FIRST_PROJECT` -- Call-to-action button
- `STATUS_APPROVED`, `STATUS_PENDING`, `STATUS_REJECTED` -- Status labels
- `SUBMITTED` -- Date prefix
- `VIEWS_COUNT`, `LIKES_COUNT` -- Metric labels with count parameter
- `REJECTION_REASON` -- Rejection callout label
- `SEARCH_PLACEHOLDER` -- Search input placeholder
- `SHOWING_RESULTS`, `PAGE_INFO` -- Pagination text

## Related Documentation

- [Multi-Step Forms](/docs/template/features/multi-step-forms) -- Submission form implementation
- [Admin Management](/docs/template/features/admin-management) -- Admin review workflow
- [Voting & Comments](/docs/template/features/voting-comments) -- Engagement on submissions
