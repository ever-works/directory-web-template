---
id: ci-cd
title: צינור CI/CD
sidebar_label: CI/CD
sidebar_position: 3
---

# צינור CI/CD

תבנית Ever Works כוללת צינור CI/CD מלא הבנוי על GitHub Actions. מדריך זה מכסה את מבנה זרימת העבודה, סריקת אבטחה, אסטרטגיות הגנת ענפים ותהליכי קידום פריסה.

## סקירת זרימת העבודה

הצינור מורכב משישה קבצי זרימת עבודה ב-`.github/workflows/`:

| זרימת עבודה | קובץ | טריגר | מטרה |
|---|---|---|---|
| CI | `ci.yml` | דחיפה/PR ל-`main`، `develop` | Lint, בדיקת סוגים, בנייה |
| CodeQL | `codeql.yml` | דחיפה/PR ל-`main`، `develop` + שבועי | ניתוח פגיעויות אבטחה |
| Dev Deploy | `deploy_dev.yaml` | דחיפה ל-`develop` | פריסה לסביבת תצוגה מקדימה |
| Prod Deploy | `deploy_prod.yaml` | דחיפה ל-`main` | פריסה לסביבת ייצור |
| Vercel Deploy | `deploy_vercel.yaml` | נקרא מ-dev/prod | לוגיקת פריסת Vercel משותפת |
| Disable CodeQL | `disable-default-codeql.yml` | ידני בלבד | כלי פתרון קונפליקטי CodeQL |

### זרימת הצינור

```
Feature Branch --> PR to develop --> CI runs
                                     |
                                     v
                               Merge to develop --> Dev Deploy (preview)
                                     |
                                     v
                               PR to main --> CI runs
                                     |
                                     v
                               Merge to main --> Prod Deploy (production)
```

## זרימת עבודה CI (ci.yml)

CI רץ על כל דחיפה ובקשת משיכה ל-`main` ו-`develop`. הוא מאמת איכות קוד ומבטיח שהפרויקט נבנה בהצלחה.

### משימות

זרימת העבודה מכילה משימה אחת `lint-and-build` הרצה על `ubuntu-latest`:

**שלבים**:

1. **שליפת קוד** -- שכפול מאגר המידע
2. **זיהוי מנהל חבילות** -- זיהוי אוטומטי של pnpm, yarn או npm מקובץ הנעילה
3. **הגדרת pnpm** -- התקנת pnpm v9 אם זוהה
4. **הגדרת Node.js** -- התקנת Node 20 עם שמירת מטמון למנהל חבילות
5. **התקנת תלויות** -- הרצת `pnpm install`
6. **הרצת Lint** -- הרצת `pnpm lint` (המשך עם שגיאה עבור PR)
7. **בדיקת סוגים** -- הרצת `pnpm typecheck` או `pnpm check:types`
8. **יצירת תיקיית תוכן** -- יצירת `.content/data` לבנייה
9. **בניית הפרויקט** -- הרצת `pnpm build` עם כל משתני הסביבה הנחוצים
10. **אימות הצלחת הבנייה** -- אימות שתיקיית `.next` נוצרה

### בקרת מקביליות

```yaml
concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true
```

אם דחיפה חדשה מתרחשת לאותו ענף במהלך הרצת CI, ההרצה הקודמת מבוטלת אוטומטית. זה חוסך דקות CI ומבטיח שרק הקומיט האחרון מאומת.

### משתני סביבה

זרימת עבודה CI משתמשת בשילוב של ברירות מחדל מקודדות וסודות GitHub:

| משתנה | מקור | מטרה |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | מקודד | URL האפליקציה לבנייה |
| `DATABASE_URL` | סוד או ברירת מחדל | חיבור מסד נתונים לבנייה |
| `AUTH_SECRET` | ערך CI מקודד | חתימת אסימון אימות (לא ייצור) |
| `DATA_REPOSITORY` | סוד או ברירת מחדל | URL מאגר תוכן |
| `CONTENT_WARNINGS_SILENT` | מקודד `true` | השתקת אזהרות תוכן ב-CI |
| `CI` | מקודד `true` | הצביע על סביבת CI |
| סודות OAuth | סודות GitHub | אישורי Google, GitHub, Facebook, Twitter |
| `RESEND_API_KEY` | סוד GitHub | שירות אימייל לבדיקות בנייה |

### הרשאות

זרימת העבודה מבקשת הרשאות מינימליות:

```yaml
permissions:
  contents: read
```

משימת CI צריכה רק הרשאות קריאה לתוכן המאגר.

## ניתוח אבטחת CodeQL (codeql.yml)

### מה הוא עושה

CodeQL מבצע ניתוח סמנטי של קוד JavaScript/TypeScript לזיהוי פגיעויות אבטחה. רץ כאשר:

- כל דחיפה ובקשת משיכה ל-`main` ו-`develop`
- כל יום שני ב-6:00 UTC (סריקה מתוזמנת)
- כאשר מופעל ידנית

### שלבי הניתוח

1. **שליפה** ו**הגדרת** Node.js + pnpm
2. **אתחול CodeQL** עם שפה `javascript-typescript`
3. **תצורת סביבת CodeQL** דרך `scripts/codeql-setup.js`
4. **התקנת תלויות**/הקשר ניתוח
5. **Autobuild** -- זיהוי בנייה אוטומטי של CodeQL
6. **העלאת ניתוח** -- העלאת תוצאות ללשונית Security ב-GitHub
7. **ניתוח גיבוי** -- ניתוח ללא העלאה אם ההעלאה נכשלת

### הרשאות

CodeQL צריך הרשאות רחבות יותר לדיווח על אירועי אבטחה:

```yaml
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
```

### צפייה בתוצאות

לאחר הרצה מוצלחת עם העלאה:
1. עבור למאגר ב-GitHub
2. לך ל-**Security** > **Code scanning**
3. בדוק תוצאות, סנן לפי חומרה ונהל התראות

### פתרון קונפליקטי CodeQL

אם נתקלת בקונפליקטי עיבוד SARIF עם תצורת CodeQL הברירמחדלית של GitHub, השתמש בזרימת העבודה `disable-default-codeql.yml`:

```bash
# Trigger manually from GitHub Actions tab
# This disables the default configuration that may conflict with your custom setup
```

## זרימת הפריסה

### מיפוי ענף-סביבה

| ענף | זרימת עבודה | סביבה | דומיין |
|---|---|---|---|
| `develop` | `deploy_dev.yaml` | `preview` | URL תצוגה מקדימה של Vercel |
| `main` | `deploy_prod.yaml` | `production` | דומיין ייצור |

### שער ספק הפריסה

שתי זרימות עבודה הפריסה בודקות משתנה מאגר לפני המשך:

```yaml
jobs:
  Vercel:
    if: ${{ vars.DEPLOY_PROVIDER == 'vercel' }}
```

הגדר `DEPLOY_PROVIDER=vercel` ב-**Settings > Variables** במאגר כדי לאפשר פריסת Vercel. זה מאפשר החלפת ספק פריסה ללא שינוי קבצי זרימת עבודה.

### פריסת Vercel (deploy_vercel.yaml)

זרימת עבודה פריסת Vercel המשותפת מטפלת בפריסות תצוגה מקדימה וייצור.

**אסטרטגיית הפריסה**: זרימת העבודה משתמשת בגישה של שני שלבים:

1. **פריסת API** (ראשי): הפעלת פריסה דרך Vercel API לבנייה מהירה יותר
2. **גיבוי CLI**: חזרה ל-`vercel build` + `vercel deploy --prebuilt` אם קריאת API נכשלת

**שלבים**:

1. **שליפת** קוד
2. **זיהוי מנהל חבילות** והגדרת pnpm
3. **התקנת Vercel CLI** גלובלית
4. **קישור פרויקט Vercel** עם `VERCEL_TOKEN` ו-scope הצוות האופציונלי
5. **הגדרת משתני סביבה** דרך Vercel CLI (DATA_REPOSITORY, GH_TOKEN, CRON_SECRET)
6. **שליפת הגדרות Vercel** עבור סביבת היעד
7. **הפעלת פריסת API** או חזרה לבנייה/פריסת CLI
8. **עדכון תזמון cron** דרך `scripts/update-cron.ts`

### סודות נחוצים

הגדר אלה בסודות מאגר GitHub:

| סוד | נחוץ | מטרה |
|---|---|---|
| `VERCEL_TOKEN` | כן | אימות Vercel API |
| `VERCEL_TEAM_SCOPE` | בעת שימוש בצוות | Slug צוות Vercel |
| `DATA_REPOSITORY` | כן | שם מאגר תוכן |
| `GH_TOKEN` | כן | אסימון GitHub לשכפול תוכן |
| `CRON_SECRET` | מומלץ | אימות קריאות נקודות קצה cron |
| `DATABASE_URL` | זמן בנייה | מחרוזת חיבור מסד נתונים |
| סודות OAuth | בעת שימוש ב-OAuth | אישורי ספק |

### עדכון תזמון Cron

לאחר פריסה מוצלחת, זרימת העבודה מריצה `scripts/update-cron.ts` לסנכרון תזמון cron:

```yaml
- name: Update cron schedule
  if: success() && steps.trigger_deployment.outputs.deployment_id != ''
  run: npx tsx scripts/update-cron.ts
```

## כללי הגנת ענפים

### הגדרות מומלצות עבור `main`

| הגדרה | ערך | מטרה |
|---|---|---|
| דרוש בקשת משיכה | כן | מניעת דחיפות ישירות לייצור |
| ביקורות נחוצות | 1+ | ביקורת קוד לפני מיזוג |
| בדיקות סטטוס נחוצות | CI (lint-and-build) | CI חייב לעבור לפני מיזוג |
| נחוץ CodeQL | ניתוח CodeQL | סריקת אבטחה חייבת לעבור |
| ענף מעודכן נחוץ | כן | PR חייב להיות מבוסס על main העדכני |
| כולל מנהלים | כן | כללים חלים על כולם |

### הגדרות מומלצות עבור `develop`

| הגדרה | ערך | מטרה |
|---|---|---|
| דרוש בקשת משיכה | אופציונלי | מאפשר דחיפות ישירות לאיטרציה מהירה |
| בדיקות סטטוס נחוצות | CI (lint-and-build) | שער איכות בסיסי |
| ענף מעודכן נחוץ | לא | מאפשר איטרציה מהירה יותר |

### הגדרת הגנת ענפים

1. עבור ל-**Settings** > **Branches** במאגר
2. לחץ על **Add branch protection rule**
3. הכנס את תבנית שם הענף (למשל `main`)
4. הגדר הגדרות מהטבלה לעיל
5. שמור שינויים

## זרימת קידום

התבנית עוקבת אחר זרימת קידום סטנדרטית:

### מחזור פיתוח

```
1. Create feature branch from develop
2. Implement changes
3. Open PR to develop
4. CI validates (lint, type check, build)
5. CodeQL scans for vulnerabilities
6. Code review and approval
7. Merge to develop --> automatic preview deployment
```

### שחרור ייצור

```
1. Open PR from develop to main
2. CI validates against main
3. CodeQL security scan
4. Final code review
5. Merge to main --> automatic production deployment
```

### זרימת תיקון חם

```
1. Create hotfix branch from main
2. Implement fix
3. Open PR directly to main
4. CI + CodeQL validation
5. Emergency review and merge
6. Backport to develop
```

## התאמה אישית

### הוספת שלבי CI חדשים

להוספת בדיקות או אימות נוסף, הוסף שלבים למשימה ב-`ci.yml`:

```yaml
- name: Run unit tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test

- name: Run E2E tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test:e2e
```

### הוספת התראות פריסה

הוסף שלב התראה בסוף זרימת עבודה הפריסה:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text": "Deployed to ${{ inputs.environment }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### משתני סביבה ספציפיים לסביבה

השתמש ב-**Environments** ב-GitHub כדי להגביל סודות ליעדי פריסה ספציפיים:

1. עבור ל-**Settings** > **Environments**
2. צור סביבות `production` ו-`preview`
3. הוסף סודות ספציפיים לסביבה
4. הפנה אליהם עם תצורת `environment:` בזרימת עבודה
