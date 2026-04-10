---
id: database-management
title: إدارة قاعدة البيانات
sidebar_label: إدارة قاعدة البيانات
sidebar_position: 4
---

# إدارة قاعدة البيانات

يستخدم قالب Ever Works قاعدة بيانات PostgreSQL مع Drizzle ORM لجميع عمليات قاعدة البيانات. يغطي هذا الدليل إدارة قاعدة البيانات في الإنتاج، والترحيلات، وتجميع الاتصالات، والمراقبة، وأنظمة تهيئة البيانات.

## البنية

| الطبقة | الملف | المسؤولية |
|--------|-------|------------|
| **التكوين** | `drizzle.config.ts` | مسارات المخطط، مخرجات الترحيل، اللهجة |
| **الاتصال** | `lib/db/drizzle.ts` | تجميع الاتصالات، النموذج المنفرد، التهيئة الكسولة |
| **الإعداد** | `lib/db/config.ts` | عنوان URL آمن لقاعدة البيانات ووظائف مساعدة للبيئة |
| **المخطط** | `lib/db/schema.ts` | تعريفات الجداول، الفهارس، القيود |
| **الترحيل** | `lib/db/migrate.ts` | منفذ الترحيل الآمن للتكرار |
| **التهيئة** | `lib/db/initialize.ts` | الترحيل التلقائي، تهيئة البيانات، advisory locks |
| **البيانات الابتدائية** | `lib/db/seed.ts` | البيانات الابتدائية: الأدوار، الصلاحيات، مستخدم المسؤول |

## إدارة الاتصالات

### نموذج منفرد بتهيئة كسولة

يتم إنشاء اتصال قاعدة البيانات عند الاستخدام الأول وتخزينه مؤقتاً عبر `globalThis` للبقاء على قيد الحياة خلال إعادة تحميل HMR في التطوير. من `lib/db/drizzle.ts`:

```typescript
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle> | undefined;
};

function initializeDatabase(): ReturnType<typeof drizzle> {
  if (!getDatabaseUrl()) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (globalForDb.db) {
    return globalForDb.db;
  }

  const poolSize = getPoolSize();
  const conn = postgres(getDatabaseUrl()!, {
    max: poolSize,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });

  globalForDb.conn = conn;
  globalForDb.db = drizzle(conn, { schema });
  return globalForDb.db;
}
```

يستخدم كائن `db` المُصدَّر JavaScript Proxy للتهيئة الكسولة الشفافة:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

هذا يعني عدم إنشاء اتصال بقاعدة البيانات حتى أول استعلام فعلي. المسارات التي لا تستخدم قاعدة البيانات لا تتحمل أي تكلفة للاتصال.

### تكوين تجميع الاتصالات

| الإعداد | الافتراضي في الإنتاج | الافتراضي في التطوير | الوصف |
|---------|---------------------|---------------------|-------|
| `max` | 20 | 10 | الحد الأقصى لاتصالات التجمع |
| `idle_timeout` | 20 ثانية | 20 ثانية | وقت الإغلاق للاتصال الخامل |
| `connect_timeout` | 30 ثانية | 30 ثانية | انتهاء مهلة محاولة الاتصال الجديد |
| `prepare` | false | false | تعطيل الجمل المُعدَّة (التوافق مع Vercel) |

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

## نظرة عامة على المخطط

يُعرِّف المخطط في `lib/db/schema.ts` الجداول الرئيسية التالية:

### المستخدمون والمصادقة

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique(),
  image: text('image'),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  createdAtIndex: index('users_created_at_idx').on(table.createdAt)
}));
```

### التحكم في الوصول القائم على الأدوار

```typescript
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: text('status', { enum: ['active', 'inactive'] }).default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
}));
```

### قائمة الجداول الكاملة

| الجدول | الغرض |
|--------|-------|
| `users` | حسابات المستخدمين |
| `accounts` | ربط موفري OAuth (محوّل NextAuth) |
| `sessions` | جلسات المستخدم النشطة |
| `roles` | تعريفات الأدوار مع علامة المسؤول |
| `permissions` | تعريفات الصلاحيات (المورد:الإجراء) |
| `userRoles` | تعيينات المستخدم-الدور |
| `rolePermissions` | تعيينات الدور-الصلاحية |
| `clientProfiles` | ملفات شخصية موسّعة للقوائم |
| `subscriptions` | سجلات الاشتراكات المدفوعة |
| `subscriptionHistory` | مسار تدقيق تغييرات الاشتراك |
| `paymentProviders` | تكوين الدفع متعدد الموفرين |
| `paymentAccounts` | تفاصيل الحساب الخاصة بالموفر |
| `activityLogs` | مسار تدقيق إجراءات المستخدم |
| `comments` | تعليقات المستخدمين على العناصر |
| `votes` | تصويتات/تقييمات المستخدمين |
| `favorites` | المفضلات/الإشارات المرجعية للمستخدمين |
| `notifications` | الإشعارات داخل التطبيق |
| `seedStatus` | تتبع تهيئة البيانات (سجل مفرد) |

## نظام الترحيل

### أوامر الترحيل

| الأمر | السكريبت | الوصف |
|-------|---------|-------|
| `pnpm db:generate` | `drizzle-kit generate` | إنشاء SQL من تغيرات المخطط |
| `pnpm db:migrate` | `drizzle-kit migrate` | تطبيق الترحيلات المعلقة (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | تنفيذ الترحيل مع سجلات مفصّلة |
| `pnpm db:studio` | `drizzle-kit studio` | فتح واجهة Drizzle Studio الرسومية |

## تهيئة قاعدة البيانات

### التهيئة التلقائية عند بدء التشغيل

يُشغّل `instrumentation.ts` دالة `initializeDatabase()` عند كل بدء تشغيل للتطبيق:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    await initializeDatabase();
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In dev/preview, allow app to start for debugging
  }
}
```

## تهيئة البيانات

### تهيئة البيانات اليدوية

```bash
# Seed the database with initial data
pnpm db:seed
```

### بيانات المسؤول

في بيئة الإنتاج، عيّن بيانات اعتماد مسؤول صريحة:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

## المراقبة

### Drizzle Studio

تصفح قاعدة البيانات عبر واجهة رسومية:

```bash
pnpm db:studio
```

### فحص صحة قاعدة البيانات

يمكن لنقطة نهاية `/api/health` التحقق من اتصال قاعدة البيانات:

```bash
curl -s https://yourdomain.com/api/health
```
