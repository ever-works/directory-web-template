---
id: query-patterns
title: "نظام نمط الاستعلام"
sidebar_label: "أنماط الاستعلام"
sidebar_position: 7
---

# نظام نمط الاستعلام

ينظم القالب جميع استعلامات قاعدة البيانات في وحدات خاصة بالمجال ضمن `lib/db/queries/`. تتبع كل وحدة مبدأ المسؤولية الفردية (SRP)، الذي يجمع العمليات ذات الصلة معًا. يوفر تصدير البرميل في `index.ts` نقطة دخول واحدة لجميع وظائف الاستعلام.

## نظرة عامة على الهندسة المعمارية

```mermaid
graph TD
    A[API Route Handlers] --> B[Repositories / Services]
    B --> C[lib/db/queries/index.ts]
    C --> D[activity.queries.ts]
    C --> E[auth.queries.ts]
    C --> F[client.queries.ts]
    C --> G[comment.queries.ts]
    C --> H[engagement.queries.ts]
    C --> I[payment.queries.ts]
    C --> J[subscription.queries.ts]
    C --> K[vote.queries.ts]
    C --> L[report.queries.ts]
    C --> M[dashboard.queries.ts]
    C --> N[user.queries.ts]
    C --> O[item-view.queries.ts]
    C --> P[survey.queries.ts]
    D & E & F & G & H & I & J & K & L & M & N & O & P --> Q[lib/db/drizzle.ts]
    Q --> R[(PostgreSQL)]
```

## وحدات الاستعلام

|الوحدة النمطية|ملف|الغرض|
|--------|------|---------|
|النشاط|`activity.queries.ts`|تسجيل النشاط ومسار التدقيق|
|مصادقة|`auth.queries.ts`|رموز إعادة تعيين كلمة المرور، ورموز التحقق|
|العميل|`client.queries.ts`|ملف تعريف العميل CRUD، البحث، الإحصائيات|
|التعليق|`comment.queries.ts`|تعليق CRUD مع انضمام المستخدم|
|الشركة|`company.queries.ts`|إدارة الشركة وربط الصنف بالشركة|
|لوحة القيادة|`dashboard.queries.ts`|إحصائيات لوحة المعلومات ومخططات المشاركة|
|المشاركة|`engagement.queries.ts`|مقاييس المشاركة المجمعة (المشاهدات، الأصوات، المفضلة، التعليقات)|
|رسم خرائط التكامل|`integration-mapping.queries.ts`|تعيينات تكامل CRM|
|البند|`item.queries.ts`|تطبيع سبيكة العنصر والتحقق من صحتها|
|تدقيق العنصر|`item-audit.queries.ts`|تاريخ تغيير العنصر|
|عرض العنصر|`item-view.queries.ts`|عرض التتبع مع إلغاء البيانات المكررة|
|مؤشر الموقع|`location-index.queries.ts`|فهرسة العناصر الجغرافية المكانية|
|الاعتدال|`moderation.queries.ts`|إجراءات الإشراف على المحتوى|
|النشرة الإخبارية|`newsletter.queries.ts`|إدارة المشتركين في النشرة الإخبارية|
|الدفع|`payment.queries.ts`|مزود الدفع وإدارة الحساب|
|تقرير|`report.queries.ts`|تقارير المحتوى مع التصفية|
|الاشتراك|`subscription.queries.ts`|إدارة دورة حياة الاشتراك|
|المسح|`survey.queries.ts`|استجابات المسح والتحليلات|
|المستخدم|`user.queries.ts`|CRUD المستخدم الأساسي والفحوصات الإدارية|
|التصويت|`vote.queries.ts`|التصويت CRUD وحساب النتيجة الصافية|

## الأنماط الشائعة

### 1. نمط ترقيم الصفحات

تتبع جميع استعلامات القائمة نمطًا متسقًا لترقيم الصفحات باستخدام `limit` و`offset`:

```typescript
export async function getClientProfiles(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<{
  profiles: ClientProfileWithAuth[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}> {
  const { page = 1, limit = 10, search, status } = params;
  const offset = (page - 1) * limit;

  // 1. Build WHERE conditions dynamically
  const whereConditions: SQL[] = [];
  if (search) { /* add ILIKE condition */ }
  if (status) { whereConditions.push(eq(clientProfiles.status, status)); }
  const whereClause = whereConditions.length > 0
    ? and(...whereConditions)
    : undefined;

  // 2. Count query for total
  const countResult = await db
    .select({ count: sql<number>`count(distinct ${clientProfiles.id})` })
    .from(clientProfiles)
    .where(whereClause);
  const total = Number(countResult[0]?.count || 0);

  // 3. Data query with limit/offset
  const profiles = await db
    .select({ /* fields */ })
    .from(clientProfiles)
    .where(whereClause)
    .orderBy(desc(clientProfiles.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    profiles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  };
}
```

### 2. نمط التصفية الديناميكي

يتم تجميع عوامل التصفية كمصفوفة من شروط SQL وتتكون من `and()`:

```typescript
const whereConditions: SQL[] = [];

if (search) {
  const escapedSearch = search
    .replace(/\\/g, '\\\\')
    .replace(/[%_]/g, '\\$&');
  whereConditions.push(
    sql`(${clientProfiles.name} ILIKE ${`%${escapedSearch}%`} OR
         ${clientProfiles.email} ILIKE ${`%${escapedSearch}%`})`
  );
}

if (status) {
  whereConditions.push(eq(clientProfiles.status, status));
}

if (provider) {
  whereConditions.push(
    sql`exists (
      select 1 from ${accounts}
      where ${accounts.userId} = ${clientProfiles.userId}
        and ${accounts.provider} = ${provider}
    )`
  );
}

const whereClause = whereConditions.length > 0
  ? and(...whereConditions)
  : undefined;
```

### 3. انضم إلى النمط

تستخدم قاعدة التعليمات البرمجية كلاً من `innerJoin`/`leftJoin` والاستعلامات الفرعية للتعامل مع البيانات ذات الصلة:

** الانضمام الداخلي للعلاقات المطلوبة: **

```typescript
const result = await db
  .select({
    id: comments.id,
    content: comments.content,
    user: {
      id: clientProfiles.id,
      name: clientProfiles.name,
      email: clientProfiles.email,
      image: clientProfiles.avatar,
    },
  })
  .from(comments)
  .innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))
  .where(and(eq(comments.itemId, itemId), isNull(comments.deletedAt)))
  .orderBy(desc(comments.createdAt));
```

**استعلام فرعي لتجنب الصفوف المكررة من صلات متعددة:**

```typescript
const profiles = await db
  .select({
    id: clientProfiles.id,
    // ... other fields
    accountProvider: sql<string>`coalesce(
      (SELECT provider FROM ${accounts}
       WHERE ${accounts.userId} = ${clientProfiles.userId}
       LIMIT 1),
      'unknown'
    )`,
  })
  .from(clientProfiles);
```

### 4. نمط التجميع

يتم استخدام الوظائف المجمعة مثل `count` و`SUM` و`AVG` مع `groupBy`:

```typescript
// Net vote score using conditional SUM
const voteCounts = await db
  .select({
    itemId: votes.itemId,
    netScore: sql<number>`
      SUM(CASE
        WHEN vote_type = 'upvote' THEN 1
        WHEN vote_type = 'downvote' THEN -1
        ELSE 0
      END)
    `.as('netScore'),
  })
  .from(votes)
  .where(inArray(votes.itemId, itemSlugs))
  .groupBy(votes.itemId);
```

### 5. نمط الاستعلام الموازي

عند الحاجة إلى مجموعات مستقلة متعددة، يتم تشغيل الاستعلامات بالتوازي مع `Promise.all`:

```typescript
const [viewsData, votesData, favoritesData, commentsData] =
  await Promise.all([
    db.select({ itemId: itemViews.itemId, count: count() })
      .from(itemViews)
      .where(inArray(itemViews.itemId, itemSlugs))
      .groupBy(itemViews.itemId),

    db.select({ itemId: votes.itemId, netScore: sql`...` })
      .from(votes)
      .where(inArray(votes.itemId, itemSlugs))
      .groupBy(votes.itemId),

    db.select({ itemSlug: favorites.itemSlug, count: count() })
      .from(favorites)
      .where(inArray(favorites.itemSlug, itemSlugs))
      .groupBy(favorites.itemSlug),

    db.select({ itemId: comments.itemId, count: count(), avgRating: sql`...` })
      .from(comments)
      .where(and(inArray(comments.itemId, itemSlugs), isNull(comments.deletedAt)))
      .groupBy(comments.itemId),
  ]);
```

### 6. نمط الإزعاج / حل النزاع

يُستخدم لإلغاء البيانات المكررة، خاصة في تتبع العرض:

```typescript
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });

  return result.length > 0;
}
```

### 7. نمط الحذف الناعم

يتم وضع علامة على السجلات على أنها محذوفة بدلاً من إزالتها فعليًا:

```typescript
export async function deleteComment(id: string) {
  const [comment] = await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(eq(comments.id, id))
    .returning();
  return comment;
}

// Querying always filters out soft-deleted records
.where(and(eq(comments.itemId, itemId), isNull(comments.deletedAt)))
```

### 8. نمط تطبيع النتيجة

غالبًا ما يتم تعيين نتائج الاستعلام من خلال كائنات البحث `Map` للوصول الفعال إلى O(1):

```typescript
const viewsMap = new Map<string, number>(
  viewsData.map(v => [v.itemId, Number(v.count)])
);
const votesMap = new Map<string, number>(
  votesData.map(v => [v.itemId, Number(v.netScore ?? 0)])
);

// Combine into final metrics
for (const slug of itemSlugs) {
  metricsMap.set(slug, {
    views: viewsMap.get(slug) ?? 0,
    votes: votesMap.get(slug) ?? 0,
  });
}
```

## المرافق المشتركة

### `lib/db/queries/utils.ts`

يوفر وظائف مساعدة مشتركة عبر وحدات الاستعلام:

- **`extractUsernameFromEmail(email)`** - استخراج اسم المستخدم وتعقيمه من عنوان البريد الإلكتروني
- **`ensureUniqueUsername(baseUsername)`** - إنشاء اسم مستخدم فريد عن طريق إلحاق لاحقات رقمية إذا لزم الأمر

### `lib/db/queries/types.ts`

يحدد الأنواع المشتركة المستخدمة عبر وحدات الاستعلام:

- **`ClientProfileWithAuth`** - ملف تعريف العميل مع بيانات موفر المصادقة
- **`ClientStatus`** / **`ClientPlan`** / **`ClientAccountType`** -- أنواع التعداد للتصفية
- **`CommentWithUser`** - بيانات التعليق غنية بمعلومات المستخدم

## اتفاقية الاستيراد

يتم استيراد كافة الاستعلامات من خلال تصدير البرميل:

```typescript
import {
  getClientProfiles,
  createVote,
  getEngagementMetricsPerItem,
  getUserActiveSubscription,
} from '@/lib/db/queries';
```
