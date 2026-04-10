---
id: test-data
title: נתוני בדיקה ונגאציות
sidebar_label: נתוני בדיקה
sidebar_position: 6
---

# נתוני בדיקה ונגאציות

בדיקות ה-E2E בתבנית Ever Works מסתמכות על נתוני בדיקה יציבים המנוהלים באמצעות קבועי TypeScript, נגאציות אימות וסקריפטי Seed.

## קבועי `TEST_DATA`

נתוני הבדיקה המרכזיים מוגדרים ב-`apps/web-e2e/fixtures/test-data.ts`:

```typescript
export const TEST_DATA = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!',
    name: 'Admin User',
  },
  client: {
    email: 'client@example.com',
    password: 'Client123!',
    name: 'Client User',
  },
  company: {
    name: 'Test Company',
    slug: 'test-company',
    description: 'A test company for E2E testing',
  },
  // ... etc.
};
```

## מערך `PUBLIC_ROUTES`

הנתיבים הנגישים לציבור ללא אימות:

```typescript
export const PUBLIC_ROUTES = [
  '/',
  '/en',
  '/en/about',
  '/en/contact',
  '/en/companies',
  '/en/blog',
  // ... etc.
];
```

## נגאציות אימות

Playwright משתמש בקבצי סשן שמורים כדי לעקוף את ממשק ההתחברות בבדיקות הדורשות אימות.

### `admin.json`

נשמר ב-`apps/web-e2e/fixtures/admin.json` לאחר הרצת ההגדרה הגלובלית:

```json
{
  "cookies": [
    {
      "name": "authjs.session-token",
      "value": "...",
      "domain": "localhost",
      "path": "/",
      "httpOnly": true,
      "secure": false
    }
  ],
  "origins": []
}
```

### `client.json`

דומה ל-`admin.json` אך עבור סשן משתמש עם תפקיד לקוח.

## מילוי מסד הנתונים לבדיקות

לפני בדיקות E2E, יש להריץ את סקריפט ה-Seed כדי לוודא שנתוני הבדיקה קיימים:

```bash
cd apps/web
pnpm run db:seed
```

סקריפט ה-Seed `scripts/seed.ts` יוצר:

- **משתמשי מנהל**: חשבונות עם גישה מלאה לבדיקת תכונות ניהול
- **משתמשי לקוח**: חשבונות רגילים לבדיקת תהליכי עבודה של משתמשים
- **חברות לדוגמה**: רשומות דירקטוריה עם פרופילים מלאים
- **קטגוריות**: מבנה הטקסונומיה
- **תוכן לדוגמה**: פוסטים בבלוג, תגובות, ביקורות

## מצב הדגמה

כאשר `DEMO_MODE=true` מוגדר, האפליקציה ממלאת נתונים ראשוניים אם מסד הנתונים ריק:

```bash
DEMO_MODE=true pnpm run dev
```

שימושי לתצוגות מקדימות והדגמות ללא צורך להריץ Seed ידנית.

## אסטרטגיות עקביות נתונים

| סביבה       | אסטרטגיה                             | פקודה               |
|-------------|--------------------------------------|---------------------|
| פיתוח       | Seed ידני + מסד נתונים מקומי         | `pnpm db:seed`      |
| בדיקות      | Seed אוטומטי ב-CI לפני הבדיקות       | הגדרת CI/CD         |
| ייצור       | העברות בלבד — לא Seed אקראי          | `pnpm db:migrate`   |

## שיטות עבודה מומלצות

1. **לעולם אל תסתמך על סדר הבדיקות** — כל בדיקה צריכה לפעול באופן עצמאי
2. **השתמש בנגאציות אימות** — מהיר יותר מהתחברות דרך ממשק המשתמש בכל בדיקה
3. **נקה אחרי עצמך** — בדיקות שיוצרות נתונים צריכות לנקות לאחר הרצה
4. **קבועים במקום מחרוזות מוטבעות** — נהל נתוני בדיקה מרכזית ב-`TEST_DATA`
5. **בודד את סביבת הבדיקה** — השתמש במסד נתונים או סכמה נפרדים לבדיקות

## משתני סביבה לבדיקות

```bash
# מוגדר ב-apps/web-e2e/.env או apps/web/.env.test
DATABASE_URL=file:./test.db           # מסד נתונים בדיקה מבודד
BASE_URL=http://localhost:3000         # כתובת בסיס לבדיקות
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=Admin123!
```

## קבצים קשורים

- `apps/web-e2e/fixtures/test-data.ts` — קבועי נתוני בדיקה מרכזיים
- `apps/web-e2e/global-setup.ts` — הגדרת סשן לפני כל הבדיקות
- `apps/web-e2e/global-teardown.ts` — ניקוי לאחר כל הבדיקות
- `apps/web/scripts/seed.ts` — סקריפט Seed למסד הנתונים
- `apps/web/scripts/clean-database.js` — סקריפט איפוס מסד הנתונים
