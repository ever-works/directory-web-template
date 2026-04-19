---
id: drizzle-patterns
title: "טפטוף דפוסי ORM"
sidebar_label: "דפוסי טפטוף"
sidebar_position: 13
---

# טפטוף דפוסי ORM

התבנית משתמשת ב-Drizzle ORM עם הניב PostgreSQL (`drizzle-orm/postgres-js`). דף זה מכסה מוסכמות הגדרת סכימה, סוגי עמודות, אסטרטגיות אינדקס, הגדרות יחס, זרימת עבודה של הגירה ודפוסי בונה השאילתות המשמשים בכל בסיס הקוד.

## הגדרת סכמה (`lib/db/schema.ts`)

### מבנה הטבלה

טבלאות מוגדרות עם `pgTable` ועוקבות אחר דפוס עקבי:

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

### שימוש בסוג עמודה

|סוג טפטוף|סוג PostgreSQL|משמש עבור|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|מזהים, מיילים, שמות, שבלולים, כתובות URL|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|שדות תאריך שהוחזרו כ-JS `Date`|
|`timestamp('col')`|`TIMESTAMP`|שדות תאריך עם מצב ברירת מחדל|
|`boolean('col')`|`BOOLEAN`|דגלים (isAdmin, isActive וכו')|
|`integer('col')`|`INTEGER`|מונים מספריים, OAuth expires_at|
|`serial('col')`|`SERIAL`|מזהים בעלי הגדלה אוטומטית|
|`varchar('col', { length: N })`|`VARCHAR(N)`|מיתרים מוגבלים לאורך|
|`jsonb('col')`|`JSONB`|מטא נתונים מובנים|
|`doublePrecision('col')`|`DOUBLE PRECISION`|קואורדינטות קו רוחב/קו אורך|

### מפתחות ראשיים של UUID

כל הטבלאות משתמשות בעמודות `text` עם `crypto.randomUUID()` כפונקציית ברירת המחדל:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### עמודות Enum

תקצירי המחרוזות מוגדרים בשורה בעמודה:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### מפתחות ראשיים מורכבים

הצטרפו לטבלאות השתמשו ב-`primaryKey` עם מספר עמודות:

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

### מפתחות זרים

מפתחות זרים משתמשים ב-`.references()` בשורה עם מחיקה מדורגת:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### הגדרות אינדקס

אינדקסים מוגדרים בארגומנט השלישי של `pgTable`:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

דפוסי אינדקס נפוצים:
- `createdAt` אינדקסים ברוב הטבלאות למיון מבוסס זמן
- אינדקס מצב/דגל עבור שאילתות סינון
- אינדקסים של דואר אלקטרוני עבור שאילתות חיפוש
- אינדקסים של ספק עבור שאילתות חשבון אישור

### בדוק אילוצים

משמש לאימות דומיין ברמת מסד הנתונים:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## הקלד מסקנות

טפטוף מסיק אוטומטית סוגי TypeScript מהגדרות טבלה:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

סוגים משוערים אלה מיוצאים ישירות מ-`lib/db/schema.ts` ומשמשים בכל שכבת השאילתה.

## יחסים (`lib/db/migrations/relations.ts`)

היחסים מוגדרים בנפרד באמצעות העוזר `relations()` עבור ממשק ה-API של השאילתה ההתייחסותית של Drizzle:

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

### סוגי מערכות יחסים

|עוזר|קרדינליות|דוגמה|
|--------|------------|---------|
|`one()`|רבים לאחד|`clientProfile -> user`|
|`many()`|אחד לרבים|`user -> accounts`|

## זרימת עבודה של הגירה

### תצורת ערכת טפטוף

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

### פקודות הגירה

|פקודה|תיאור|
|---------|-------------|
|`pnpm db:generate`|צור קובצי הגירה של SQL משינויים בסכימה|
|`pnpm db:migrate`|החל העברות ממתינות למסד הנתונים|
|`pnpm db:seed`|הזינו את מסד הנתונים עם נתונים ראשוניים|
|`pnpm db:studio`|פתח את סטודיו Drizzle לניהול מסדי נתונים חזותיים|

### רץ הגירה

הפונקציה `runMigrations()` ב-`lib/db/migrate.ts` היא אדירה ובטוחה להתקשר בכל סטארט-אפ:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

טפטוף עוקב אחר העברות מיושמות בטבלה `drizzle.__drizzle_migrations` ומפעיל רק חדשות.

## דפוסי בונה שאילתות

### בחר עם איפה

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### הוסף עם חוזר

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### עדכן עם חוזר

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### מחק עם חוזר

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### עצבני (בקונפליקט)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### SQL דינמי

ביטויי SQL גולמיים משמשים עבור תנאים מורכבים וצבירה:

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

### הרכב מצב

מסננים בנויים באופן דינמי ומורכבים עם `and()`:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### הצטרף לתבניות

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
