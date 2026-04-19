---
id: drizzle-patterns
title: "أنماط رذاذ ORM"
sidebar_label: "أنماط الرذاذ"
sidebar_position: 13
---

# أنماط رذاذ ORM

يستخدم القالب Drizzle ORM بلهجة PostgreSQL (`drizzle-orm/postgres-js`). تغطي هذه الصفحة اصطلاحات تعريف المخطط وأنواع الأعمدة واستراتيجيات الفهرس وتعريفات العلاقات وسير عمل الترحيل وأنماط إنشاء الاستعلام المستخدمة في قاعدة التعليمات البرمجية.

## تعريف المخطط (`lib/db/schema.ts`)

### هيكل الجدول

يتم تعريف الجداول باستخدام `pgTable` وتتبع نمطًا ثابتًا:

```typescript
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text('email').unique(),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at')
  },
  (table) => ({
    createdAtIndex: index('users_created_at_idx').on(table.createdAt)
  })
);
```

### استخدام نوع العمود

|نوع الرذاذ|نوع PostgreSQL|تستخدم ل|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|المعرفات ورسائل البريد الإلكتروني والأسماء والارتباطات وعناوين URL|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|تم إرجاع حقول التاريخ بتنسيق JS `Date`|
|`timestamp('col')`|`TIMESTAMP`|حقول التاريخ مع الوضع الافتراضي|
|`boolean('col')`|`BOOLEAN`|العلامات (isAdmin، isActive، وما إلى ذلك)|
|`integer('col')`|`INTEGER`|العدادات الرقمية، OAuth تنتهي صلاحيتها عند|
|`serial('col')`|`SERIAL`|معرفات الزيادة التلقائية|
|`varchar('col', { length: N })`|`VARCHAR(N)`|سلاسل مقيدة الطول|
|`jsonb('col')`|`JSONB`|البيانات الوصفية المنظمة|
|`doublePrecision('col')`|`DOUBLE PRECISION`|إحداثيات خطوط الطول والعرض|

### UUID المفاتيح الأساسية

تستخدم كافة الجداول أعمدة `text` مع `crypto.randomUUID()` كوظيفة افتراضية:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### أعمدة التعداد

يتم تعريف تعدادات السلسلة في العمود:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### المفاتيح الأساسية المركبة

استخدم ربط الجداول `primaryKey` مع أعمدة متعددة:

```typescript
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => ({
    rolePermissionPk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  })
);
```

### المفاتيح الخارجية

تستخدم المفاتيح الخارجية المضمّنة `.references()` مع الحذف المتتالي:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### تعريفات الفهرس

يتم تعريف الفهارس في الوسيطة الثالثة لـ `pgTable`:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

أنماط الفهرس الشائعة:
- `createdAt` يقوم بالفهرسة في معظم الجداول للفرز على أساس الوقت
- فهارس الحالة/العلامة لاستعلامات التصفية
- فهارس البريد الإلكتروني لاستعلامات البحث
- فهارس الموفر لاستعلامات حساب المصادقة

### تحقق من القيود

يستخدم للتحقق من صحة المجال على مستوى قاعدة البيانات:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## اكتب الاستدلال

يستنتج Drizzle تلقائيًا أنواع TypeScript من تعريفات الجدول:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

يتم تصدير هذه الأنواع المستنتجة مباشرة من `lib/db/schema.ts` واستخدامها خلال طبقة الاستعلام.

## العلاقات (`lib/db/migrations/relations.ts`)

يتم تعريف العلاقات بشكل منفصل باستخدام المساعد `relations()` لواجهة برمجة تطبيقات الاستعلام العلائقي الخاصة بـ Drizzle:

```typescript
import { relations } from "drizzle-orm/relations";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  activityLogs: many(activityLogs),
  clientProfiles: many(clientProfiles),
  favorites: many(favorites),
  notifications: many(notifications),
  paymentAccounts: many(paymentAccounts),
  subscriptions: many(subscriptions),
  userRoles: many(userRoles),
}));

export const clientProfilesRelations = relations(clientProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [clientProfiles.userId],
    references: [users.id]
  }),
  comments: many(comments),
  votes: many(votes),
}));
```

### أنواع العلاقات

|مساعد|أصل|مثال|
|--------|------------|---------|
|`one()`|كثير إلى واحد|`clientProfile -> user`|
|`many()`|واحد لكثير|`user -> accounts`|

## سير عمل الهجرة

### تكوين مجموعة الرذاذ

```typescript
// drizzle.config.ts
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
```

### أوامر الهجرة

|القيادة|الوصف|
|---------|-------------|
|`pnpm db:generate`|إنشاء ملفات ترحيل SQL من تغييرات المخطط|
|`pnpm db:migrate`|تطبيق عمليات الترحيل المعلقة على قاعدة البيانات|
|`pnpm db:seed`|زرع قاعدة البيانات بالبيانات الأولية|
|`pnpm db:studio`|افتح Drizzle Studio لإدارة قواعد البيانات المرئية|

### عداء الهجرة

تعد وظيفة `runMigrations()` في `lib/db/migrate.ts` فعالة وآمنة للاتصال بها عند كل بدء تشغيل:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

يتتبع Drizzle عمليات الترحيل المطبقة في الجدول `drizzle.__drizzle_migrations` ويقوم بتشغيل عمليات الترحيل الجديدة فقط.

## أنماط منشئ الاستعلام

### اختر مع أين

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### إدراج مع العودة

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### تحديث مع العودة

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### الحذف مع العودة

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (في الصراع)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### SQL الديناميكية

تُستخدم تعبيرات SQL الأولية للشروط والتجميعات المعقدة:

```typescript
import { sql } from 'drizzle-orm';

// Conditional SUM
sql<number>`SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE -1 END)`

// ILIKE search
sql`${clientProfiles.name} ILIKE ${`%${search}%`}`

// COALESCE with subquery
sql<string>`coalesce(
  (SELECT provider FROM ${accounts}
   WHERE ${accounts.userId} = ${clientProfiles.userId}
   LIMIT 1),
  'unknown'
)`

// Date formatting
sql<string>`to_char(${votes.createdAt}, 'IYYY-IW')`
```

### تكوين الحالة

يتم إنشاء المرشحات ديناميكيًا وتتكون من `and()`:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### انضم إلى الأنماط

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
