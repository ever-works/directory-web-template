---
id: drizzle-config
title: تكوين Drizzle ORM
sidebar_label: تكوين Drizzle
sidebar_position: 9
---

# تكوين Drizzle ORM

توثّق هذه الصفحة تكوين Drizzle ORM المستخدم في القالب لإدارة مخطط قاعدة البيانات والترقيات وبناء الاستعلامات الآمنة من حيث الأنواع. يوجد التكوين في `drizzle.config.ts` في جذر المشروع.

## نظرة عامة

يستخدم القالب [Drizzle ORM](https://orm.drizzle.team/) مع PostgreSQL كمحاور قاعدة البيانات. يوفر Drizzle وصولاً آمن الأنواع لقاعدة البيانات وتوليداً تلقائياً للترقيات واستوديو مرئي لفحص قاعدة البيانات.

## ملف التكوين

التكوين الكامل محدد في `drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// استخدام رابط وهمي إذا لم يتم تعيين DATABASE_URL (قاعدة البيانات اختيارية لهذا المشروع)
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

## خصائص التكوين

### `schema`

- **القيمة:** `"./lib/db/schema.ts"`
- **الغرض:** يشير إلى الملف الذي يحتوي على جميع تعريفات جداول Drizzle. هنا توجد تصريحات `pgTable`.

يعرّف ملف المخطط في `lib/db/schema.ts` الجداول باستخدام منشئات أعمدة PostgreSQL في Drizzle:

```ts
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  varchar,
  uniqueIndex,
  index,
  jsonb,
  check,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  image: text("image"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ...أعمدة إضافية
});
```

### `out`

- **القيمة:** `"./lib/db/migrations"`
- **الغرض:** المجلد الذي تُخزَّن فيه ملفات ترقية SQL المُولَّدة. في كل مرة تشغّل فيها `drizzle-kit generate`، تظهر ملفات ترقية جديدة هنا.

### `dialect`

- **القيمة:** `"postgresql"`
- **الغرض:** يحدد محرك قاعدة البيانات المستخدم. يستهدف القالب PostgreSQL للنشر في الإنتاج.

### `dbCredentials`

- **القيمة:** `{ url: databaseUrl }`
- **الغرض:** سلسلة الاتصال بقاعدة البيانات. يُقرأ من متغير البيئة `DATABASE_URL`.

## تحميل متغيرات البيئة

يحمّل التكوين متغيرات البيئة من ملفين، بالترتيب:

1. `.env` — متغيرات البيئة الأساسية
2. `.env.local` — التجاوزات المحلية (لها الأولوية)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

يتيح هذا النهج المزدوج الاحتفاظ بالقيم الافتراضية المشتركة في `.env` مع تجاوز روابط قاعدة البيانات والأسرار محلياً.

## رابط قاعدة البيانات الاحتياطي

يتضمن التكوين رابط URL وهمي احتياطي:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

يوجد هذا الاحتياطي لأن قاعدة البيانات اختيارية في هذا المشروع. يتيح تشغيل أوامر Drizzle Kit مثل `generate` حتى في غياب قاعدة بيانات حقيقية، وهو مفيد أثناء CI/CD أو الإعداد الأولي للمشروع.

## الأوامر الشائعة

يحدد القالب عدة سكريبتات تتعلق بقاعدة البيانات في `package.json`:

| الأمر | الوصف |
|---------|-------------|
| `pnpm db:generate` | توليد ملفات الترقية من تغييرات المخطط |
| `pnpm db:migrate` | تطبيق الترقيات المعلّقة على قاعدة البيانات |
| `pnpm db:seed` | ملء قاعدة البيانات بالبيانات الأولية |
| `pnpm db:studio` | فتح Drizzle Studio لإدارة قاعدة البيانات بصرياً |

### توليد الترقيات

بعد تعديل المخطط في `lib/db/schema.ts`، قم بتوليد ترقية جديدة:

```bash
pnpm db:generate
```

يُنشئ هذا ملف ترقية SQL جديداً في `lib/db/migrations/` يحتوي على عبارات DDL اللازمة لمزامنة قاعدة البيانات مع مخططك.

### تشغيل الترقيات

تطبيق جميع الترقيات المعلّقة:

```bash
pnpm db:migrate
```

### الترقية التلقائية عند بدء التشغيل

يدعم القالب أيضاً الترقية التلقائية أثناء بدء تشغيل التطبيق عبر ملف التتبع. يعمل هذا كاحتياطي للنشر في مرحلة المعاينة:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // ...
  try {
    console.log("[Instrumentation] Running database initialization...");
    await initializeDatabase();
    console.log("[Instrumentation] Database initialization completed");
  } catch (error) {
    // في الإنتاج، يُعيد رمي الخطأ للإشارة إلى الفشل الحرج
    // في التطوير، يسمح للتطبيق بالبدء للتصحيح
  }
}
```

بالنسبة للبناءات الإنتاجية على Vercel، تعدّ ترقيات وقت البناء عبر `scripts/build-migrate.ts` النهج المفضل.

## إعداد DATABASE_URL

### التطوير المحلي (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / الإنتاج

قم بتعيين `DATABASE_URL` في متغيرات بيئة مشروع Vercel الخاص بك، تشير عادةً إلى خدمة PostgreSQL مُدارة (Neon أو Supabase أو Railway وغيرها):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## أمان الأنواع

نظراً لأن Drizzle يولّد أنواع TypeScript مباشرةً من مخططك، يتم التحقق من جميع الاستعلامات بشكل كامل بأنواعها في وقت التجميع. لا توجد خطوة منفصلة لتوليد الكود المطلوبة — ملف المخطط نفسه هو مصدر الحقيقة الوحيد لكل من هيكل قاعدة البيانات وأنواع TypeScript.

## الموارد ذات الصلة

- [مرجع متغيرات البيئة](/template/configuration/environment-reference) — قائمة كاملة بمتغيرات البيئة بما فيها `DATABASE_URL`
- [فحص صحة قاعدة البيانات](/template/guides/database-health-check) — مراقبة اتصال قاعدة البيانات
- [دليل التتبع](/template/guides/instrumentation) — تهيئة قاعدة البيانات التلقائية عند بدء التشغيل
