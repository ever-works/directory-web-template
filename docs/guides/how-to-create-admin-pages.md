---
id: how-to-create-admin-pages
title: "How to Create Admin Pages"
sidebar_label: "Create Admin Pages"
sidebar_position: 5
---

# How to Create Admin Pages

This guide explains how to build new admin interface pages, including layout integration, data tables, forms, permission checks, and navigation registration.

## Prerequisites

- Familiarity with Next.js App Router layouts and pages
- Understanding of the admin auth guard in `app/[locale]/admin/layout-client.tsx`
- Knowledge of React Query hooks for data fetching
- Development server running (`pnpm dev`)

---

## Architecture Overview

Admin pages live under `app/[locale]/admin/` and share a common layout with authentication and authorization guards:

```
app/[locale]/admin/
  layout.tsx               # Server layout -- renders AdminLayoutClient
  layout-client.tsx        # Client layout -- auth guard + sidebar navigation
  page.tsx                 # Dashboard home
  items/
    page.tsx               # Items management
  users/
    page.tsx               # Users management
  categories/
    page.tsx               # Categories management
  settings/
    page.tsx               # Settings page
  ... more sections
```

The `AdminLayoutClient` component:
- Wraps content in a `SessionProvider`
- Checks if the user is authenticated and is an admin
- Redirects unauthenticated users to `/admin/auth/signin`
- Redirects non-admin users to `/unauthorized`

---

## Step 1: Create the Page Directory and File

Create the directory for your new admin section. We will use **Coupons management** as the example.

```bash
mkdir -p app/[locale]/admin/coupons
```

Create the page file:

```tsx
// app/[locale]/admin/coupons/page.tsx

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCoupons } from '@/hooks/use-admin-coupons';
import { UniversalPagination } from '@/components/universal-pagination';
import {
  AdminSearchBar,
  AdminStatusTabs,
} from '@/components/admin/shared';

export default function AdminCouponsPage() {
  const t = useTranslations('admin.COUPONS');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const pageSize = 10;

  const {
    coupons,
    total,
    totalPages,
    isLoading,
    createCoupon,
    deleteCoupon,
  } = useCoupons({
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    status: statusFilter,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('TITLE')}
          </h1>
          <p className="text-muted-foreground">
            {t('DESCRIPTION')}
          </p>
        </div>
        <Button onClick={() => {/* open create modal */}}>
          <Plus className="mr-2 h-4 w-4" />
          {t('CREATE')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <AdminSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t('SEARCH_PLACEHOLDER')}
        />
        <AdminStatusTabs
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: t('ALL') },
            { value: 'active', label: t('ACTIVE') },
            { value: 'expired', label: t('EXPIRED') },
          ]}
        />
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-medium">
                  {t('CODE')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  {t('DISCOUNT')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  {t('STATUS')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  {t('USES')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  {t('ACTIONS')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    Loading...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {t('NO_COUPONS')}
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b">
                    <td className="px-4 py-3 font-mono text-sm">
                      {coupon.code}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {coupon.discountPercent}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          coupon.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {coupon.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {coupon.usageCount} / {coupon.maxUses || '∞'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCoupon(coupon.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <UniversalPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
```

---

## Step 2: Create the Admin Hook

Follow the pattern from existing admin hooks like `use-admin-items.ts`:

```ts
// hooks/use-admin-coupons.ts

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  status: 'active' | 'expired' | 'disabled';
  usageCount: number;
  maxUses: number | null;
  createdAt: string;
}

interface CouponListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

const QUERY_KEYS = {
  coupons: ['admin', 'coupons'] as const,
  couponList: (params: CouponListParams) =>
    [...QUERY_KEYS.coupons, 'list', params] as const,
};

export function useCoupons(params: CouponListParams = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.couponList(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.search) searchParams.set('search', params.search);
      if (params.status) searchParams.set('status', params.status);

      const response = await serverClient.get(
        `/api/admin/coupons?${searchParams}`,
      );
      if (!apiUtils.isSuccess(response)) {
        throw new Error(apiUtils.getErrorMessage(response));
      }
      return response.data;
    },
    staleTime: 30 * 1000,
  });

  const { mutateAsync: createCoupon } = useMutation({
    mutationFn: async (couponData: Partial<Coupon>) => {
      const response = await serverClient.post(
        '/api/admin/coupons',
        couponData,
      );
      if (!apiUtils.isSuccess(response)) {
        throw new Error(apiUtils.getErrorMessage(response));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coupons });
      toast.success('Coupon created');
    },
  });

  const { mutateAsync: deleteCoupon } = useMutation({
    mutationFn: async (id: string) => {
      const response = await serverClient.delete(
        `/api/admin/coupons/${id}`,
      );
      if (!apiUtils.isSuccess(response)) {
        throw new Error(apiUtils.getErrorMessage(response));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coupons });
      toast.success('Coupon deleted');
    },
  });

  return {
    coupons: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    createCoupon,
    deleteCoupon,
  };
}
```

---

## Step 3: Create the Admin API Endpoints

```ts
// app/api/admin/coupons/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    // Parse parameters, call service, return data
    return NextResponse.json({ success: true, items: [], total: 0 });
  } catch (error) {
    console.error('Error in GET /api/admin/coupons:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const body = await request.json();
    // Validate and create coupon
    return NextResponse.json(
      { success: true, data: body },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in POST /api/admin/coupons:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
```

---

## Step 4: Add Navigation Item

Update the admin sidebar navigation to include your new section. The navigation configuration is typically in the admin layout client or a shared navigation config:

```ts
// components/admin/navigation-config.ts (or within layout-client.tsx)

export const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/items', label: 'Items', icon: Package },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/categories', label: 'Categories', icon: Folder },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },  // Add new item
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];
```

---

## Step 5: Add Shared Admin Components

Reuse the shared admin components from `components/admin/shared/`:

```tsx
import {
  AdminSearchBar,       // Search input with debounce
  AdminStatusTabs,      // Status filter tabs
  AdminFilterPopover,   // Advanced filter popover
  AdminActiveFilters,   // Active filter badges
} from '@/components/admin/shared';
```

These components provide consistent styling and behavior across all admin pages.

---

## Step 6: Add a Detail/Edit Modal or Page

For editing individual records, you can use either a modal or a separate page:

### Option A: Modal Approach

```tsx
// components/admin/coupons/coupon-form-modal.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CouponFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

export function CouponFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
}: CouponFormModalProps) {
  const [code, setCode] = useState(initialData?.code ?? '');
  const [discount, setDiscount] = useState(initialData?.discountPercent ?? 10);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold">
          {initialData ? 'Edit Coupon' : 'Create Coupon'}
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="code">Coupon Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SUMMER2024"
            />
          </div>
          <div>
            <Label htmlFor="discount">Discount (%)</Label>
            <Input
              id="discount"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              min={1}
              max={100}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({ code, discountPercent: discount })
            }
          >
            {initialData ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Option B: Separate Page

```tsx
// app/[locale]/admin/coupons/[id]/page.tsx

'use client';

import { useParams } from 'next/navigation';

export default function CouponDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1>Coupon Detail: {id}</h1>
      {/* Detail/edit form */}
    </div>
  );
}
```

---

## File Structure Summary

```
app/[locale]/admin/
  coupons/
    page.tsx                        # New -- list page
    [id]/
      page.tsx                      # New -- detail page (optional)
app/api/admin/
  coupons/
    route.ts                        # New -- list/create API
    [id]/
      route.ts                      # New -- get/update/delete API
hooks/
  use-admin-coupons.ts              # New -- data fetching hook
components/admin/
  coupons/
    coupon-form-modal.tsx           # New -- form component
  navigation-config.ts             # Modified -- added nav item
messages/
  en.json                           # Modified -- added admin.COUPONS keys
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Page shows blank without errors | Ensure the file is named `page.tsx` (not `index.tsx`) and exports a default function component. |
| Admin guard redirects logged-in admin | Check that `session.user.isAdmin` is properly set in the NextAuth callbacks. |
| Navigation link not highlighting | Verify the `href` matches the current pathname exactly. |
| Data table flickers on filter change | Use `keepPreviousData` from React Query: `placeholderData: keepPreviousData`. |
| Pagination resets when switching tabs | Reset `currentPage` to 1 in a `useEffect` that watches filter changes. |

---

## Checklist

- [ ] Page component created under `app/[locale]/admin/`
- [ ] Page uses `'use client'` directive
- [ ] Admin API endpoints created with admin auth guard (`session.user.isAdmin`)
- [ ] React Query hook created following `use-admin-*` naming pattern
- [ ] Navigation item added to the admin sidebar
- [ ] Shared admin components reused (`AdminSearchBar`, `AdminStatusTabs`, etc.)
- [ ] Translation keys added under `admin.SECTION_NAME`
- [ ] Pagination integrated with `UniversalPagination`
- [ ] Create/edit forms implemented (modal or separate page)
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm lint` passes

---

## Related Guides

- [How to Add a New Feature](./how-to-add-a-new-feature.md)
- [How to Add an API Endpoint](./how-to-add-an-api-endpoint.md)
- [How to Add a New Hook](./how-to-add-a-new-hook.md)
- [How to Add Translations](./how-to-add-translations.md)
