---
id: sentry-config
title: הגדרת Sentry
sidebar_label: הגדרת Sentry
sidebar_position: 10
---

# הגדרת Sentry

דף זה מתעד את אינטגרציית Sentry למעקב אחר שגיאות, ניטור ביצועים והפעלה חוזרת של סשנים בתבנית. התצורה מחולקת בין שלושה קבצים: `sentry.config.ts` (תוסף webpack), `instrumentation.ts` (אתחול בצד השרת) ו-`instrumentation-client.ts` (אתחול בצד הלקוח).

## סקירה כללית

התבנית משתמשת ב-SDK `@sentry/nextjs` כדי לתפוס שגיאות ונתוני ביצועים הן בצד השרת והן בצד הלקוח. Sentry הוא לחלוטין אופציונלי -- אם לא מוגדר DSN, כל אתחול Sentry מדולג.

## הגדרת תוסף Webpack

הקובץ `sentry.config.ts` בשורש הפרויקט מגדיר את תוסף webpack של Sentry המשמש במהלך הבנייה:

```ts
export const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "your-org-name",
  project: process.env.SENTRY_PROJECT || "your-project-name",

  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
};
```

### אפשרויות התוסף

| אפשרות | ברירת מחדל | תיאור |
|--------|---------|-------|
| `silent` | `true` | מדכא פלט קונסולה של תוסף webpack במהלך הבנייות |
| `org` | משתנה הסביבה `SENTRY_ORG` | ה-slug של ארגון Sentry שלך |
| `project` | משתנה הסביבה `SENTRY_PROJECT` | ה-slug של פרויקט Sentry שלך |
| `widenClientFileUpload` | `true` | מעלה קבוצה רחבה יותר של קבצי מקור בצד הלקוח לעקבות מחסנית טובות יותר |
| `transpileClientSDK` | `true` | מתמיר את SDK של Sentry לתאימות רחבה יותר עם דפדפנים |
| `tunnelRoute` | `"/monitoring"` | מנתב בקשות Sentry דרך האפליקציה שלך כדי לעקוף חוסמי מודעות |
| `hideSourceMaps` | `true` | מונע גישה ציבורית למפות מקור בייצור |
| `disableLogger` | `true` | מבטל את לוגר Sentry להפחתת גודל ה-bundle |

### אינטגרציה עם הגדרות Next.js

אפשרויות התוסף נצרכות ב-`next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## משתני סביבה

Sentry מסתמך על משתני הסביבה הבאים, המוגדרים ב-`lib/constants.ts`:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| משתנה | נדרש | תיאור |
|-------|------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | לא | ה-DSN של Sentry (שם מקור הנתונים). אם לא מוגדר, Sentry מושבת. |
| `SENTRY_ORG` | לא | ה-slug של ארגון Sentry להעלאת מפות מקור |
| `SENTRY_PROJECT` | לא | ה-slug של פרויקט Sentry להעלאת מפות מקור |
| `SENTRY_AUTH_TOKEN` | לא | אסימון אימות להעלאת מפות מקור במהלך הבנייות |
| `SENTRY_ENABLE_DEV` | לא | הגדר כ-`"true"` כדי להפעיל את Sentry במצב פיתוח |
| `SENTRY_DEBUG` | לא | הגדר כ-`"true"` כדי להפעיל רישום debug של SDK Sentry |

## אתחול בצד השרת

Sentry בצד השרת מאותחל ב-`instrumentation.ts`, שרץ פעם אחת כשהשרת Next.js מתחיל:

```ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_DEBUG } from "@/lib/constants";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Only initialize Sentry if DSN is configured
  if (SENTRY_DSN.value) {
    Sentry.init({
      dsn: SENTRY_DSN.value,
      tracesSampleRate:
        process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: SENTRY_DEBUG.value === "true",
    });
  }

  // Database initialization follows...
}

// Capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
```

### קצבי דגימה של השרת

- **ייצור:** דגימת מעקב ב-10% (`0.1`) לאיזון בין עלות לנראות
- **פיתוח:** דגימת מעקב ב-100% (`1.0`) לנראות ניפוי שגיאות מלאה

### דיווח על שגיאות

כשלים באתחול בסיס הנתונים מדווחים ל-Sentry עם תגיות הקשריות:

```ts
if (SENTRY_DSN.value) {
  Sentry.captureException(error, {
    tags: {
      component: "instrumentation",
      phase: "database_init",
      environment:
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        "unknown",
    },
  });
}
```

## אתחול בצד הלקוח

Sentry בצד הלקוח מאותחל ב-`instrumentation-client.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
import { Replay } from "@sentry/replay";
import {
  SENTRY_DSN,
  SENTRY_DEBUG,
  SENTRY_ENABLED,
} from "@/lib/constants";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || !SENTRY_ENABLED)
    return;

  Sentry.init({
    dsn: SENTRY_DSN.value,
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: SENTRY_DEBUG.value === "true",

    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      new Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Router transition instrumentation
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
```

### תכונות בצד הלקוח

**הפעלה חוזרת של סשן** מוגדרת עם ברירות מחדל ממוקדות פרטיות:

- `maskAllText: true` -- כל תוכן הטקסט מוסתר בהפעלות החוזרות
- `blockAllMedia: true` -- כל אלמנטי המדיה חסומים בהפעלות החוזרות
- הפעלות חוזרות של שגיאות נלכדות ב-100% (`replaysOnErrorSampleRate: 1.0`)
- הפעלות חוזרות כלליות של סשן נלכדות ב-10% בייצור

**מעברי נתב** ממדדים דרך `onRouterTransitionStart` כדי לעקוב אחר ביצועי ניווט בדפים.

## מסלול מנהרה

האפשרות `tunnelRoute: "/monitoring"` מנתבת שליחות אירועי Sentry דרך האפליקציה שלך בנקודת הקצה `/monitoring`. זה עוזר לעקוף חוסמי מודעות ומדיניות אבטחת תוכן שעלולות לחסום בקשות ישירות לשרתי Sentry.

## סיכום קצבי הדגימה

| מדד | פיתוח | ייצור |
|-----|-------|-------|
| קצב דגימת מעקב (שרת) | 100% | 10% |
| קצב דגימת מעקב (לקוח) | 100% | 10% |
| קצב הפעלה חוזרת של שגיאות | 100% | 100% |
| קצב הפעלה חוזרת של סשן | 100% | 10% |

## הפעלת Sentry

כדי להפעיל את Sentry בפריסה שלך:

1. צור פרויקט Sentry ב-[sentry.io](https://sentry.io)
2. הגדר את משתני הסביבה הנדרשים:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. לפיתוח, הגדר גם:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## משאבים קשורים

- [מדריך מדידה](/template/guides/instrumentation) -- תיעוד מלא של מחזור חיי המדידה
- [דפוסי טיפול בשגיאות](/template/guides/error-handler-patterns) -- כיצד שגיאות מובנות ומתועדות
- [עיון בסביבה](/template/configuration/environment-reference) -- כל משתני הסביבה
