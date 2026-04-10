---
id: multi-tenancy
title: הגדרת ריבוי דיירים
sidebar_label: ריבוי דיירים
sidebar_position: 13
---

# הגדרת ריבוי דיירים

מסמך זה מסביר כיצד פועל תמיכת ריבוי הדיירים ב-Directory Web Template.

## סקירה כללית

התבנית משתמשת בגישה של **מסד נתונים משותף עם בידוד ברמת השורה**:

- מסד נתונים PostgreSQL יחיד משרת **דיירים** (אתרי ספרייה) מרובים.
- לכל טבלה יש עמודת `tenant_id` המגבילה נתונים לדייר ספציפי.
- כל השאילתות מסננות אוטומטית לפי הדייר הנוכחי — אין דליפת נתונים בין דיירים.

## הגדרה מהירה

### 1. הגדרת משתנה הסביבה

בפלטפורמת הפריסה שלך (Vercel, Docker וכד') או ב-`.env.local`:

```bash
TENANT_ID="your-unique-tenant-id"
```

יכול להיות כל מחרוזת ייחודית (לדוגמה UUID או slug קריא כמו `"my-directory"`).

### 2. פריסה

בהפעלה הראשונה, האפליקציה תבצע:

1. הרצת מיגרציות של בסיס הנתונים (הוספת עמודת `tenant_id` אם אינה קיימת)
2. יצירת שורת דייר התואמת לערך `TENANT_ID`
3. מיגרציית נתוני `tenant_id` עם ערך NULL קיימים לדייר שלך
4. זריעת נתוני ברירת מחדל (משתמש מנהל, תפקידים, הרשאות)

אין צורך ב-SQL ידני — הכל אוטומטי.

### 3. אימות

בדוק את יומני השרת עבור:

```
[DB Init] Ensured environment tenant 'your-unique-tenant-id' exists
[Tenant Migration] ✓ users: updated 3 rows
[Tenant Migration] ✅ Migration complete: 15 total rows updated across all tables.
```

## כיצד זיהוי הדייר פועל

כאשר האפליקציה צריכה לקבוע את הדייר הנוכחי, היא משתמשת באסטרטגיית **מפל מים**:

| עדיפות | מקור               | תיאור                                                          |
| ------ | ------------------ | -------------------------------------------------------------- |
| 1      | **סשן**            | `user.tenantId` מתוך אסימון JWT (משתמשים מאומתים)             |
| 2      | **משתנה סביבה**    | משתנה הסביבה `TENANT_ID`                                       |
| 3      | **כותרת HTTP**     | כותרת `x-tenant-domain` (לניתוב תת-דומיין)                    |
| 4      | **בסיס נתונים**    | שורת הדייר הפעיל הראשונה (גיבוי אחרון)                        |

הפונקציה `getTenantId()` מתוך `lib/auth/tenant.ts` מממשת שרשרת זו ומופעלת על ידי כל שאילתת בסיס נתונים.

## ארכיטקטורה

### קבצים מרכזיים

| קובץ                                     | מטרה                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `lib/auth/tenant.ts`                     | `getTenantId()` — זיהוי דייר בצד השרת עם מטמון                              |
| `lib/config/env.ts`                      | אימות משתנה הסביבה `TENANT_ID`                                               |
| `lib/db/schema.ts`                       | טבלת דיירים + מפתח זר `tenant_id` בכל הטבלאות                               |
| `lib/db/initialize.ts`                   | יוצר אוטומטית דייר סביבה + מריץ מיגרציית נתונים בהפעלה                     |
| `lib/db/migrate-tenant-data.ts`          | מקצה שורות עם `tenant_id` עם ערך NULL לדייר הנוכחי                          |
| `lib/auth/index.ts`                      | קריאות חוזרות JWT/סשן מזריקות `tenantId`                                     |
| `components/context/tenant-provider.tsx` | הקשר React לגישה לדייר בצד הלקוח                                            |
| `app/api/tenant/route.ts`                | `GET /api/tenant` — מחזיר מידע על הדייר הנוכחי                              |

### זרימת נתונים

```
בקשת משתמש → getTenantId() → פתרון מסשן/env/כותרות/DB
                                        ↓
                    כל שאילתות DB מסוננות לפי tenant_id זה
                                        ↓
                      מוחזרים רק נתונים עבור דייר זה
```

### שילוב אימות

- **כניסה עם אישורים**: משתמשי מנהל ולקוח מקבלים את `tenantId` שלהם מעמודת `users.tenant_id`.
- **כניסה עם OAuth**: מתאם Drizzle עטוף להזרקת `tenantId` בעת יצירת משתמש.
- **קריאה חוזרת JWT**: קורא `tenantId` מרשומת המשתמש ומטמיע אותו באסימון.
- **קריאה חוזרת של סשן**: מעביר `tenantId` ל-`session.user.tenantId`.
- **רכיבי לקוח**: משתמשים ב-hook‏ `useTenant()` מ-`TenantProvider` למידע על הדייר.

## ספריות מרובות (ריבוי דיירים)

להרצת אתרי ספרייה מרובים על בסיס נתונים יחיד:

1. **כל אתר** מגדיר `TENANT_ID` שונה בסביבתו:
    - אתר A: `TENANT_ID="directory-a-uuid"`
    - אתר B: `TENANT_ID="directory-b-uuid"`

2. **כל האתרים** מתחברים ל**אותו בסיס נתונים** (`DATABASE_URL`).

3. **בידוד הנתונים** אוטומטי — אתר A רואה רק שורות שבהן `tenant_id = 'directory-a-uuid'`.

4. **משתמשים, תפקידים, תגובות, מנויים** וכל שאר הנתונים מבודדים לחלוטין לכל דייר.

## טיפול בנתונים קיימים

בעת שדרוג מגרסה ללא דיירים:

- עמודת `tenant_id` נוספת כ-**nullable** (לא שוברת נתונים קיימים)
- בהפעלה הראשונה, `migrateNullTenantIds()` מקצה אוטומטית שורות NULL לדייר שנפתר
- מיגרציה זו היא **אידמפוטנטית** — בטוחה להרצה מרובה
- לאחר המיגרציה, כל הנתונים הקיימים גלויים תחת הדייר הנוכחי

## ניתוב תת-דומיין (מתקדם)

לניתוב דייר מבוסס תת-דומיין (לדוגמה `tenant-a.example.com`):

1. הגדר את ה-reverse proxy להוספת הכותרת `x-tenant-domain`
2. צור רשומות דייר עם שדות `domain` או `slug`:
    ```sql
    INSERT INTO tenant (id, name, domain, slug, status)
    VALUES ('uuid', 'Tenant A', 'tenant-a.example.com', 'tenant-a', 'active');
    ```
3. אסטרטגיית `resolveFromHeaders()` תתאים את הדומיין ותפתור את הדייר

## סכמת טבלת הדיירים

```sql
CREATE TABLE tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  domain TEXT UNIQUE,
  slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
