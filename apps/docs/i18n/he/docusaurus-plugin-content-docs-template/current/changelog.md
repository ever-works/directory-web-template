---
id: changelog
title: יומן שינויים
sidebar_label: יומן
---

# יומן שינויים

דף זה מסביר כיצד Directory Web Template מנהל גרסאות, מהדורות ונתיבי שדרוג.

## גרסאות סמנטיות

התבנית עוקבת אחר [Semantic Versioning (SemVer)](https://semver.org/). מספרי הגרסאות משתמשים בפורמט **MAJOR.MINOR.PATCH**:

| רכיב       | מתי להגדיל                                                      |
| ---------- | --------------------------------------------------------------- |
| **MAJOR**  | שינויים שוברים הדורשים שלבי העברה                               |
| **MINOR**  | תכונות חדשות שנוספו בצורה תואמת לאחור                          |
| **PATCH**  | תיקוני באגים תואמי לאחור ושיפורים קלים                         |

גרסאות טרום-מהדורה עשויות להשתמש בסיומות כגון `-alpha.1`, `-beta.2` או `-rc.1` לבדיקות מוקדמות.

## העברות בסיס נתונים

התבנית משתמשת ב-**Drizzle ORM** עם PostgreSQL. שינויי סכמת בסיס הנתונים מנוהלים דרך Drizzle Kit:

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio for visual database management
pnpm db:studio
```

קבצי ההעברה מאוחסנים בספריית `lib/db/migrations/`. כל העברה היא קובץ SQL שנוצר משינויים בהגדרות הסכמה של Drizzle ב-`lib/db/schema/`.

## שדרוג התבנית

בעת שדרוג לגרסה חדשה יותר:

```bash
cd directory-web-template

# Pull latest changes
git pull origin main

# Install updated dependencies
pnpm install

# Apply database migrations
pnpm db:migrate

# Verify build
pnpm build
```

### טיפול בקונפליקטים בעת שדרוג

אם התאמת את התבנית, ייתכן שתיתקל בקונפליקטי מיזוג בעת שליפת עדכונים. הגישה המומלצת:

1. **שמור התאמות אישיות בקבצים נפרדים** כאשר אפשר (קומפוננטים מותאמים, מסלולים חדשים, שירותים נוספים).
2. **השתמש ב-CMS מבוסס Git** לשינויי תוכן במקום לשנות קבצי ליבה.
3. **עיין בהערות המהדורה** לפני השדרוג כדי להבין אילו קבצים השתנו.
4. **בדוק ביסודיות** לאחר פתרון הקונפליקטים על ידי הרצת `pnpm lint`, `pnpm tsc --noEmit` ו-`pnpm build`.

## מעקב אחר מהדורות

### GitHub Releases

מהדורות מפורסמות ב-GitHub בכתובת [github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases).

כל מהדורה כוללת:

- תג גרסה (לדוגמה, `v0.1.0`)
- הערות מהדורה המתארות שינויים, תכונות חדשות, תיקוני באגים ושינויים שוברים
- קישורים ל-pull requests ו-issues רלוונטיים

### היסטוריית Commits

המאגר משתמש ב-[Conventional Commits](https://www.conventionalcommits.org/), מה שמקל על סריקת היסטוריית ה-commits לאיתור שינויים:

```bash
# View recent commits with conventional commit prefixes
git log --oneline --since="2025-01-01"

# Filter for feature commits only
git log --oneline --grep="^feat:"

# Filter for breaking changes
git log --oneline --grep="BREAKING CHANGE"
```

## מדיניות שינויים שוברים

שינויים שוברים נלקחים ברצינות. הפרויקט פועל לפי עקרונות אלה:

1. **הודעה מוקדמת.** שינויים שוברים מוכרזים לפחות מהדורת minor אחת לפני כניסתם לתוקף, כאשר אפשר.
2. **מדריכי העברה.** כל שינוי שובר כולל מדריך העברה בהערות המהדורה.
3. **מזעור שיבושים.** שינויים שוברים מקובצים במהדורות major במקום לפוזרם על פני מהדורות minor מרובות.
4. **תאימות לאחור של בסיס הנתונים.** ההעברות מתוכננות להיות לא הרסניות. הוספת עמודות ויצירת טבלאות מועדפות על פני מחיקות או שינויי שם.

### דוגמאות לשינויים שוברים

- הסרה או שינוי שם של נקודת קצה ציבורית של API
- שינוי מבנה גוף בקשות או תגובות API
- הסרה או שינוי שם של עמודות או טבלאות בסיס נתונים
- שינוי משתני סביבה נדרשים
- הפסקת תמיכה בגרסת Node.js
- שינוי התנהגות אימות או הרשאה
- הסרה או שינוי שם של טיפוסים או ממשקי TypeScript מיוצאים

### דוגמאות לשינויים שאינם שוברים

- הוספת נקודות קצה חדשות ל-API
- הוספת שדות אופציונליים חדשים לגוף הבקשות או התגובות
- הוספת עמודות בסיס נתונים חדשות עם ערכי ברירת מחדל
- הוספת משתני סביבה חדשים עם ברירות מחדל הגיוניות
- הוספת תכונות או אינטגרציות חדשות
- שיפורי ביצועים
- תיקוני באגים

## פורמט יומן השינויים

הערות המהדורה עוקבות אחר מבנה זה:

```markdown
## [0.2.0] - 2025-04-15

### Added

- Category-based directory filtering
- New Polar payment provider integration

### Changed

- Improved authentication flow with better error messages

### Fixed

- Resolved race condition in concurrent directory updates
- Fixed pagination offset calculation for search results

### Deprecated

- Legacy REST endpoints under /api/v1/ (use /api/v2/ instead)

### Breaking Changes

- Removed `LEGACY_AUTH_MODE` environment variable
- Renamed `DirectoryItem` type to `Item` across all APIs
```

פורמט זה עוקב אחר מוסכמות [Keep a Changelog](https://keepachangelog.com/).
