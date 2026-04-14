---
id: type-system
title: "نظام الكتابة TypeScript"
sidebar_label: "نوع النظام"
sidebar_position: 8
---

# نظام الكتابة TypeScript

يستخدم القالب نظامًا متعدد الطبقات يمتد إلى أنواع مستوى المخطط (يتم الاستدلال عليها تلقائيًا من Drizzle)، وأنواع المجال لمنطق الأعمال، وأنواع واجهة برمجة التطبيقات (API) لعقود الطلب/الاستجابة.

## اكتب المواقع

|الدليل|الغرض|
|-----------|---------|
|`lib/db/schema.ts`|تعريفات جدول الرذاذ وأنواع الإدراج/التحديد المستنتجة|
|`lib/db/queries/types.ts`|الأنواع المركبة على مستوى الاستعلام (الصلات والسجلات المعززة)|
|`lib/types/`|أنواع النطاقات للعناصر والعملاء والتعليقات والفئات وما إلى ذلك.|
|`lib/api/types.ts`|أنواع عملاء API وعقود الاستجابة|
|`lib/payment/types/`|واجهات مزود الدفع وأنواع الخروج|
|`types/`|التعزيزات العالمية (`next-auth.d.ts`) وأنواع واجهة المستخدم المشتركة|

## الأنواع المستنتجة من المخطط

يستنتج Drizzle ORM تلقائيًا أنواع TypeScript من تعريفات الجدول باستخدام الأدوات المساعدة `$inferSelect` و`$inferInsert`. يتم تصديرها مباشرة من `lib/db/schema.ts`:

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

### أنواع المخططات الأساسية

|الجدول|حدد النوع|نوع الإدخال|الحقول الرئيسية|
|-------|------------|-------------|------------|
|`users`|`User`|`NewUser`|`id`، `email`، `passwordHash`، `createdAt`|
|`accounts`|`Account`| -- |`userId`، `provider`، `providerAccountId`|
|`clientProfiles`|`ClientProfile`|`NewClientProfile`|`userId`، `email`، `name`، `username`، `plan`، `status`|
|`roles`|`Role`| -- |`id`، `name`، `isAdmin`، `status`|
|`permissions`|`Permission`| -- |`id`، `key`، `description`|
|`subscriptions`|`Subscription`|`NewSubscription`|`userId`، `planId`، `status`، `startDate`، `endDate`|
|`subscriptionHistory`|`SubscriptionHistory`|`NewSubscriptionHistory`|`subscriptionId`، `action`، `previousStatus`|
|`votes`|`Vote`|`InsertVote`|`userId`، `itemId`، `voteType`|
|`comments`|`Comment`|`NewComment`|`userId`، `itemId`، `content`، `rating`|
|`favorites`|`Favorite`| -- |`userId`، `itemSlug`|
|`itemViews`|`ItemView`|`NewItemView`|`itemId`، `viewerId`، `viewedDateUtc`|
|`reports`|`Report`|`NewReport`|`contentType`، `contentId`، `reason`، `status`|
|`paymentProviders`|`OldPaymentProvider`|`NewPaymentProvider`|`name`، `isActive`|
|`paymentAccounts`|`PaymentAccount`|`NewPaymentAccount`|`userId`، `providerId`، `customerId`|
|`notifications`|`Notification`| -- |`userId`، `type`، `title`، `read`|

## أنواع الاستعلام المركب

توجد هذه الأنواع في `lib/db/queries/types.ts`، وتمثل البيانات المرتبطة أو المعززة:

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

## أنواع المجال

### أنواع العناصر (`lib/types/item.ts`)

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

### أنواع العملاء (`lib/types/client.ts`، `lib/types/client-item.ts`)

الأنواع التي تواجه العميل لإدارة الملف الشخصي وتقديم العناصر.

### أنواع المصادقة (`types/next-auth.d.ts`)

يعزز أنواع NextAuth `Session` و`User`:

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

### أنواع التقارير (مضمنة في `report.queries.ts`)

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

## أنواع الدفع (`lib/payment/types/payment-types.ts`)

نظام من النوع الغني لتكامل الدفع متعدد الموفرين:

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

## أنواع واجهة برمجة التطبيقات (`lib/api/types.ts`)

أنواع النقابات التمييزية لاستجابات واجهة برمجة التطبيقات:

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

## اكتب مخطط التسلسل الهرمي

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

## ثوابت التعداد

يستخدم المخطط تعدادات السلسلة المحددة في المخطط وكثوابت:

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

## أفضل الممارسات

1. **تفضيل الأنواع المستنتجة من المخطط** لعمليات قاعدة البيانات بدلاً من تحديد الأنواع يدويًا
2. **استخدم الأنواع المركبة** (`CommentWithUser`، `ClientProfileWithAuth`) لنتائج الانضمام
3. ** استخدم النقابات التمييزية ** (`ApiResponse<T>`) لاستجابات واجهة برمجة التطبيقات (API) لتمكين معالجة الأخطاء الآمنة من النوع
4. **حدد أنواع المجالات** في `lib/types/` لمنطق الأعمال الذي لا يقوم بتعيين 1:1 لجداول قاعدة البيانات
5. **تصدير الأنواع المستنتجة من Zod** جنبًا إلى جنب مع المخططات لضمان سلامة نوع طبقة التحقق
