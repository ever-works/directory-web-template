---
id: type-system
title: "Типова система TypeScript"
sidebar_label: "Тип система"
sidebar_position: 8
---

# Типова система TypeScript

Шаблонът използва система от слоести типове, която обхваща типове на ниво схема (автоматично изведени от Drizzle), типове домейни за бизнес логика и типове API за договори за заявка/отговор.

## Тип Местоположения

|Справочник|Цел|
|-----------|---------|
|`lib/db/schema.ts`|Дефиниции на таблицата за дъжд и изведени типове вмъкване/избор|
|`lib/db/queries/types.ts`|Съставни типове на ниво заявка (съединявания, обогатени записи)|
|`lib/types/`|Типове домейни за артикули, клиенти, коментари, категории и др.|
|`lib/api/types.ts`|API типове клиенти и договори за отговор|
|`lib/payment/types/`|Интерфейси на доставчици на плащания и типове плащане|
|`types/`|Глобални разширения (`next-auth.d.ts`) и споделени типове потребителски интерфейси|

## Изведени от схемата типове

Drizzle ORM автоматично извежда типовете TypeScript от дефинициите на таблици с помощта на помощните програми `$inferSelect` и `$inferInsert`. Те се експортират директно от `lib/db/schema.ts`:

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

### Типове основни схеми

|Таблица|Изберете Тип|Тип вмъкване|Ключови полета|
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

## Съставни типове заявки

Намерени в `lib/db/queries/types.ts`, тези типове представляват обединени или обогатени данни:

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

## Типове домейни

### Типове артикули (`lib/types/item.ts`)

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

### Типове клиенти (`lib/types/client.ts`, `lib/types/client-item.ts`)

Типове, насочени към клиента, за управление на профили и изпращане на артикули.

### Типове удостоверяване (`types/next-auth.d.ts`)

Увеличава типовете NextAuth `Session` и `User`:

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

### Типове отчети (вградени в `report.queries.ts`)

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

## Видове плащане (`lib/payment/types/payment-types.ts`)

Система с богат тип за интегриране на плащания с множество доставчици:

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

## API типове (`lib/api/types.ts`)

Дискриминирани типове обединения за API отговори:

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

## Типова йерархична диаграма

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

## Enum константи

Схемата използва низови преброявания, дефинирани както в схемата, така и като константи:

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

## Най-добри практики

1. **Предпочитайте типове, изведени от схемата** за операции с бази данни, вместо ръчно дефиниране на типове
2. **Използвайте съставни типове** (`CommentWithUser`, `ClientProfileWithAuth`) за резултати от присъединяване
3. **Използвайте дискриминирани обединения** (`ApiResponse<T>`) за отговори на API, за да активирате безопасна обработка на грешки
4. **Дефинирайте типове домейни** в `lib/types/` за бизнес логика, която не съпоставя 1:1 към таблици на база данни
5. **Експортиране на типове, изведени от Zod** заедно със схеми за безопасност на типа на слоя за валидиране
