---
id: contributing
title: מדריך תרומה לפרויקט
sidebar_label: תרומה
---

# מדריך תרומה לפרויקט

תודה על העניין שלך לתרום ל-Directory Web Template. מדריך זה מכסה את כל מה שאתה צריך לדעת כדי לתרום תרומות משמעותיות.

## מאגר

קוד המקור של Template מתארח ב-[github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

לתרומות לפלטפורמת Ever Works, ראה את [מאגר הפלטפורמה](https://github.com/ever-works/ever-works) ומדריך התרומה שלה ב-[docs.ever.works](https://docs.ever.works).

## דרישות מוקדמות

לפני שתתחיל, וודא שמותקן לך הבא:

- **Node.js** >= 20.19.0 (מומלץ LTS)
- **pnpm** >= 10.x (נאכף בקפדנות; אל תשתמש ב-npm או yarn)
- **Git** >= 2.30
- **PostgreSQL** (לבסיס נתונים; Supabase מספק אפשרות מתארחת)

### התקנת pnpm

```bash
# באמצעות corepack (מומלץ, מגיע עם Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# או דרך npm (אתחול חד-פעמי)
npm install -g pnpm
```

**חשוב:** המאגר משתמש בשדות `packageManager` ובקבצי נעילה ספציפיים ל-pnpm. הפעלת `npm install` או `yarn install` תיכשל או תייצר עצי תלות שגויים.

## הגדרת סביבת פיתוח

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# העתק קובץ סביבה והגדר אותו
cp .env.example .env.local
# ערוך את .env.local עם הערכים שלך (ראה README לפרטים)

pnpm dev        # שרת פיתוח Next.js על פורט 3000
```

## תקני קוד

### TypeScript

ה-Template משתמש ב-TypeScript בכל מקום. אל תוסיף קבצי `.js` רגילים. עקוב אחרי שיטות TypeScript קפדניות:

- הפעל וכבד הגדרות מצב `strict` ב-`tsconfig.json`
- העדף טיפוסי החזרה מפורשים בפונקציות מיוצאות
- השתמש ב-`unknown` במקום `any` כאשר אפשר
- אמת קלט עם ספריות **Zod**

### עיצוב (Prettier)

העיצוב נאכף דרך Prettier. ההגדרות נמצאות ב-`package.json` הראשי:

```json
{
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed"
}
```

הרץ את המעצב לפני ביצוע commit:

```bash
pnpm format          # עצב את כל הקבצים
pnpm format:check    # בדוק ללא שינוי (ידידותי ל-CI)
```

### בדיקת קוד (ESLint)

ה-Template משתמש בהגדרת ESLint שטוחה (`eslint.config.mjs`) עם תוספי React, React Hooks ו-TypeScript:

```bash
pnpm lint
```

### מוסכמות שמות

| אלמנט                    | מוסכמה           | דוגמה                                 |
| ------------------------- | ---------------- | ------------------------------------- |
| קבצים                     | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| מחלקות, ממשקים, טיפוסים  | PascalCase       | `DirectoryService`, `UserProfile`     |
| פונקציות, משתנים          | camelCase        | `getDirectoryById`, `itemCount`       |
| קבועים                    | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## מוסכמות Commit

המאגר אוכף [Conventional Commits](https://www.conventionalcommits.org/) דרך **commitlint** ו-hooks של **husky** לפני commit.

| קידומת      | שימוש                                              |
| ----------- | -------------------------------------------------- |
| `feat:`     | תכונות חדשות                                       |
| `fix:`      | תיקוני באגים                                       |
| `docs:`     | שינויים בתיעוד                                     |
| `refactor:` | ארגון מחדש של קוד ללא שינוי בהתנהגות              |
| `test:`     | הוספה או עדכון בדיקות                              |
| `chore:`    | משימות תחזוקה, עדכוני תלויות                       |
| `style:`    | שינויי עיצוב (ללא שינוי לוגיקה)                    |
| `perf:`     | שיפורי ביצועים                                     |
| `ci:`       | שינויי הגדרת CI/CD                                 |

דוגמה:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## מתן שמות לענפים

השתמש בשמות ענף תיאוריים עם קידומת:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## תהליך Pull Request

1. **צור Fork** של המאגר (או צור ענף אם יש לך גישת כתיבה).
2. **צור ענף תכונה** מ-`main`.
3. **בצע שינויים** בהתאם לתקני הקוד לעיל.
4. **הרץ בדיקות איכות** לפני דחיפה (ראה להלן).
5. **דחוף** את הענף שלך ופתח Pull Request מול `main`.
6. **מלא את תבנית ה-PR** עם תיאור, issues קשורים והערות בדיקה.
7. **המתן לסקירה.** מתחזק יסקור את ה-PR שלך ועשוי לבקש שינויים.
8. לאחר אישור, מתחזק ימזג את ה-PR שלך.

### בדיקות איכות לפני הגשת PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # בדיקת TypeScript
pnpm build          # בניית ייצור מלאה
```

### בדיקות

ה-Template משתמש ב-**Playwright** לבדיקות end-to-end:

```bash
pnpm test:e2e
```

אם השינויים שלך נוגעים בפונקציונליות קיימת, וודא שכל הבדיקות הקשורות עוברות. אם אתה מוסיף פונקציונליות חדשה, כלול בדיקות עבורה.

## רישיון

Directory Web Template מורשה תחת **GNU Affero General Public License v3.0 (AGPL-3.0)**. בהגשת תרומה, אתה מסכים שעבודתך תהיה מורשית תחת אותו רישיון.

## קוד התנהגות

כל התורמים צפויים לעקוב אחר קוד ההתנהגות של הפרויקט. היה מכבד, בונה ושיתופי פעולה.

## קבלת עזרה

אם יש לך שאלות לגבי תרומה:

- פתח [דיון ב-GitHub](https://github.com/ever-works/directory-web-template/discussions)
- הצטרף ל[קהילת Discord](https://discord.gg/ever) לעזרה בזמן אמת
- שלח דוא"ל ל-[ever@ever.co](mailto:ever@ever.co) לפניות פרטיות
