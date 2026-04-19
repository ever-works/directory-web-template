---
id: type-system
title: "מערכת סוג TypeScript"
sidebar_label: "הקלד מערכת"
sidebar_position: 8
---

# מערכת סוג TypeScript

התבנית משתמשת במערכת סוגים שכבות המשתרעת על סוגים ברמת הסכימה (המסיקה אוטומטית מ-Drizzle), סוגי תחום עבור לוגיקה עסקית וסוגי API עבור חוזי בקשה/תגובה.

## הקלד מיקומים

|ספרייה|מטרה|
|-----------|---------|
|`lib/db/schema.ts`|הגדרות טבלת טפטוף וסוגי הוספה/בחירה משוערים|
|`lib/db/queries/types.ts`|סוגים מרוכבים ברמת השאילתה (הצטרפות, רשומות מועשרות)|
|`lib/types/`|סוגי דומיין לפריטים, לקוחות, הערות, קטגוריות וכו'.|
|`lib/api/types.ts`|סוגי לקוחות API וחוזי תגובה|
|`lib/payment/types/`|ממשקי ספקי תשלומים וסוגי קופה|
|`types/`|הגדלות גלובליות (`next-auth.d.ts`) וסוגי ממשק משתמש משותפים|

## סוגים המוסקים מהסכמה

Drizzle ORM מסיק אוטומטית סוגי TypeScript מהגדרות טבלה באמצעות כלי השירות `$inferSelect` ו-`$inferInsert`. אלה מיוצאים ישירות מ-`lib/db/schema.ts`:

```typescript
// From lib/db/schema.ts
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique(),
  image: text('image'),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Inferred types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### סוגי סכמת ליבה

|טבלה|בחר סוג|סוג הכנס|שדות מפתח|
|-------|------------|-------------|------------|
|`users`|`User`|`NewUser`|`id`, `email`, `passwordHash`, `createdAt`|
|`accounts`|`Account`| -- |`userId`, `provider`, `providerAccountId`|
|`clientProfiles`|`ClientProfile`|`NewClientProfile`|`userId`, `email`, `name`, `username`, `plan`, `status`|
|`roles`|`Role`| -- |`id`, `name`, `isAdmin`, `status`|
|`permissions`|`Permission`| -- |`id`, `key`, `description`|
|`subscriptions`|`Subscription`|`NewSubscription`|`userId`, `planId`, `status`, `startDate`, `endDate`|
|`subscriptionHistory`|`SubscriptionHistory`|`NewSubscriptionHistory`|`subscriptionId`, `action`, `previousStatus`|
|`votes`|`Vote`|`InsertVote`|`userId`, `itemId`, `voteType`|
|`comments`|`Comment`|`NewComment`|`userId`, `itemId`, `content`, `rating`|
|`favorites`|`Favorite`| -- |`userId`, `itemSlug`|
|`itemViews`|`ItemView`|`NewItemView`|`itemId`, `viewerId`, `viewedDateUtc`|
|`reports`|`Report`|`NewReport`|`contentType`, `contentId`, `reason`, `status`|
|`paymentProviders`|`OldPaymentProvider`|`NewPaymentProvider`|`name`, `isActive`|
|`paymentAccounts`|`PaymentAccount`|`NewPaymentAccount`|`userId`, `providerId`, `customerId`|
|`notifications`|`Notification`| -- |`userId`, `type`, `title`, `read`|

## סוגי שאילתות מרוכבים

נמצא ב-`lib/db/queries/types.ts`, סוגים אלה מייצגים נתונים מצטרפים או מועשרים:

```typescript
// Client profile with authentication metadata
export type ClientProfileWithAuth = ClientProfile & {
  accountProvider: string;
  isActive: boolean;
};

// Enum types used in filtering
export type ClientStatus = "active" | "inactive" | "suspended" | "trial";
export type ClientPlan = "free" | "standard" | "premium";
export type ClientAccountType = "individual" | "business" | "enterprise";

// Comment enriched with user info from a join
export type CommentWithUser = {
  id: string;
  content: string;
  rating: number | null;
  userId: string;
  itemId: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};
```

## סוגי דומיין

### סוגי פריטים (`lib/types/item.ts`)

```typescript
export interface ItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  featured?: boolean;
  icon_url?: string;
  updated_at: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  location?: ItemLocationData;
}

export interface ItemListOptions {
  status?: ItemStatus;
  categories?: string[];
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;
  submittedBy?: string;
  search?: string;
  city?: string;
  country?: string;
}

export interface ItemListResponse {
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### סוגי לקוחות (`lib/types/client.ts`, `lib/types/client-item.ts`)

סוגים מול לקוחות לניהול פרופילים והגשת פריטים.

### סוגי אימות (`types/next-auth.d.ts`)

מגדיל את סוגי NextAuth `Session` ו-`User`:

```typescript
declare module "next-auth" {
  interface User {
    isAdmin?: boolean;
    role?: string;
  }
  interface Session {
    user: User & DefaultSession["user"];
  }
}
```

### סוגי דוחות (מוטבע ב-`report.queries.ts`)

```typescript
export type ReportWithReporter = Report & {
  reporter: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  reviewer: {
    id: string;
    email: string | null;
  } | null;
};
```

## סוגי תשלום (`lib/payment/types/payment-types.ts`)

מערכת עשירה לשילוב תשלומים מרובי ספקים:

```typescript
// Provider interface (Stripe, LemonSqueezy, Polar, Solidgate)
export interface PaymentProviderInterface {
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo>;
  handleWebhook(payload: any, signature: string): Promise<WebhookResult>;
  getClientConfig(): ClientConfig;
}

export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  // ... 20+ event types
}
```

## סוגי API (`lib/api/types.ts`)

סוגי איגודים מופלים עבור תגובות API:

```typescript
// Success/error discriminated union
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; }
  | { success: false; error: string };

// Paginated response with metadata
export type PaginatedResponse<T> =
  | {
      success: true;
      data: T[];
      meta: { page: number; totalPages: number; total: number; limit: number };
    }
  | { success: false; error: string };

// Pagination query params
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## הקלד דיאגרמת היררכיה

```mermaid
graph TD
    subgraph Schema Layer
        S1[Drizzle pgTable definitions]
        S2[Inferred Select types]
        S3[Inferred Insert types]
        S1 --> S2
        S1 --> S3
    end

    subgraph Query Layer
        Q1[CommentWithUser]
        Q2[ClientProfileWithAuth]
        Q3[ReportWithReporter]
        Q4[SubscriptionWithUser]
    end

    subgraph Domain Layer
        D1[ItemData / ItemListOptions]
        D2[ItemLocationData]
        D3[PaymentProviderInterface]
        D4[SubscriptionInfo]
    end

    subgraph API Layer
        A1["ApiResponse&lt;T&gt;"]
        A2["PaginatedResponse&lt;T&gt;"]
        A3[PaginationParams]
    end

    S2 --> Q1
    S2 --> Q2
    S2 --> Q3
    S2 --> Q4
    Q1 & Q2 --> A1
    D1 --> A2
```

## Enum קבועים

הסכימה משתמשת בסכימי מחרוזת המוגדרים הן בסכימה והן כקבועים:

```typescript
// Schema-level enums (lib/db/schema.ts)
export const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
} as const;

// Payment constants (lib/constants/payment.ts)
export const PaymentPlan = {
  FREE: 'free',
  STANDARD: 'standard',
  PREMIUM: 'premium',
} as const;

export const PaymentProvider = {
  STRIPE: 'stripe',
  LEMONSQUEEZY: 'lemonsqueezy',
  POLAR: 'polar',
  SOLIDGATE: 'solidgate',
} as const;
```

## שיטות עבודה מומלצות

1. **העדיף סוגים המוסקים בסכימה** עבור פעולות מסד נתונים במקום הגדרה ידנית של סוגים
2. **השתמש בסוגים מורכבים** (`CommentWithUser`, `ClientProfileWithAuth`) לתוצאות ההצטרפות
3. **השתמש באיגודים מופלים** (`ApiResponse<T>`) עבור תגובות API כדי לאפשר טיפול בשגיאות בטוח מסוג
4. **הגדר סוגי תחום** ב-`lib/types/` עבור לוגיקה עסקית שאינה ממפה 1:1 לטבלאות מסד נתונים
5. **ייצוא סוגים המבוססים על Zod** לצד סכמות לבטיחות סוג שכבת אימות
