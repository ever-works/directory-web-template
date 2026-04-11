---
id: auth-config-reference
title: עיון בהגדרות Auth.js
sidebar_label: עיון ב-Auth Config
sidebar_position: 11
---

# עיון בהגדרות Auth.js

דף זה מתעד את הגדרות NextAuth (Auth.js) המוגדרות ב-`auth.config.ts`. קובץ זה מגדיר ספקי אימות, אסטרטגיית סשן וטיפול בשגיאות עבור התבנית.

## סקירה כללית

התבנית תומכת במספר אסטרטגיות אימות דרך הגדרה מאוחדת:

- **NextAuth (Auth.js)** — אימות מבוסס OAuth ואישורים
- **Supabase Auth** — אימות ילידי של Supabase
- **שניהם** — מצב ספק כפול לגמישות מקסימלית

קובץ `auth.config.ts` מגדיר את צד NextAuth של מערכת זו.

## קובץ ההגדרות

`auth.config.ts` השורשי מייצא אובייקט `NextAuthConfig`:

```ts
import { NextAuthConfig } from "next-auth";
import { createNextAuthProviders } from "./lib/auth/providers";
import {
  configureOAuthProviders,
  logError,
} from "./lib/auth/error-handler";
import {
  ErrorType,
  createAppError,
} from "./lib/utils/error-handler";
import { authConfig } from "@/lib/config/config-service";

const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === "google")
        ? {
            enabled: true,
            clientId: authConfig.google.clientId || "",
            clientSecret: authConfig.google.clientSecret || "",
            options: {
              allowDangerousEmailAccountLinking: false,
            },
          }
        : { enabled: false },
      github: oauthProviders.find((p) => p.id === "github")
        ? {
            enabled: true,
            clientId: authConfig.github.clientId || "",
            clientSecret: authConfig.github.clientSecret || "",
          }
        : { enabled: false },
      facebook: oauthProviders.find((p) => p.id === "facebook")
        ? {
            enabled: true,
            clientId: authConfig.facebook.clientId || "",
            clientSecret: authConfig.facebook.clientSecret || "",
          }
        : { enabled: false },
      twitter: oauthProviders.find((p) => p.id === "twitter")
        ? {
            enabled: true,
            clientId: authConfig.twitter.clientId || "",
            clientSecret: authConfig.twitter.clientSecret || "",
          }
        : { enabled: false },
      credentials: {
        enabled: true,
      },
    });
  } catch (error) {
    // נפילה לאישורים בלבד כאשר OAuth נכשל
    const appError = createAppError(
      "Failed to configure OAuth providers. Falling back to credentials only.",
      ErrorType.CONFIG,
      "OAUTH_CONFIG_FAILED",
      error
    );
    logError(appError, "Auth Config");

    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      github: { enabled: false },
      facebook: { enabled: false },
      twitter: { enabled: false },
    });
  }
};

export default {
  trustHost: true,
  providers: configureProviders(),
} satisfies NextAuthConfig;
```

## מאפיינים מרכזיים

### `trustHost`

הגדר ל-`true` כדי לסמוך על כותרת המארח בעת הפעלה מאחורי פרוקסי הפוך (כגון Vercel). זה נדרש לצורך יצירת כתובת URL להפניה מחדש נכונה בסביבות ייצור.

### `providers`

מערך הספקים נבנה באופן דינמי בהתבסס על אילו ספקי OAuth מוגדרים עם אישורים תקפים. פונקציית `configureProviders()`:

1. קוראת ל-`configureOAuthProviders()` לאימות משתני הסביבה
2. ממפה כל ספק מופעל להגדרות ספק NextAuth שלו
3. תמיד כוללת את ספק האישורים כגיבוי

## ספקים נתמכים

| ספק | משתני סביבה נדרשים | הערות |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | קישור חשבונות דואר אלקטרוני מושבת כברירת מחדל |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | זרימת OAuth סטנדרטית |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | זרימת OAuth סטנדרטית |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | זרימת OAuth 2.0 |
| Credentials | ללא (תמיד מופעל) | אימות דואר אלקטרוני/סיסמה |

## ארכיטקטורת ספקים

צינור יצירת הספקים כולל מספר קבצים הפועלים יחדיו.

### מפעל ספקים (`lib/auth/providers.ts`)

פונקציית `createNextAuthProviders` ממפה אובייקטי הגדרות למופעי ספקי NextAuth בפועל:

```ts
export function createNextAuthProviders(
  config: OAuthProvidersConfig = defaultOAuthProvidersConfig
) {
  const providers = [];

  if (
    config.google?.enabled &&
    config.google.clientId &&
    config.google.clientSecret
  ) {
    providers.push(
      GoogleProvider({
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        ...config.google.options,
      })
    );
  }

  // בלוקים דומים עבור GitHub, Facebook, Twitter...

  if (config.credentials?.enabled) {
    providers.push(credentialsProvider);
  }

  return providers;
}
```

### מטפל שגיאות אימות (`lib/auth/error-handler.ts`)

מטפל שגיאות האימות מאמת משתני סביבה ומספק הודעות שגיאה קריאות:

```ts
export function validateAuthConfig() {
  const baseNextAuthVars = ["AUTH_SECRET", "NEXT_PUBLIC_APP_URL"];

  const providerEnvVars = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    facebook: ["FB_CLIENT_ID", "FB_CLIENT_SECRET"],
    microsoft: [
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
    ],
    supabase: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
  };

  const enabledProviders: Record<string, boolean> = {};

  Object.entries(providerEnvVars).forEach(([provider, vars]) => {
    const hasAllVars = vars.every(
      (varName) => !!process.env[varName]?.trim()
    );
    enabledProviders[provider] = hasAllVars;
  });

  return enabledProviders;
}
```

## שפל חינני

עיקרון עיצוב מפתח הוא שפל חינני. אם תצורת OAuth נכשלת בהפעלה:

1. השגיאה נלכדת כ-`AppError` מובנה עם סוג `CONFIG` וקוד `OAUTH_CONFIG_FAILED`
2. השגיאה נרשמת בלוג בהקשר `"Auth Config"`
3. המערכת נופלת לאימות עם אישורים בלבד
4. האפליקציה ממשיכה לפעול בצורה תקינה

המשמעות היא שסוד Google OAuth שגוי לא ימנע מהאפליקציה כולה לפעול — משתמשים עדיין יכולים להתחבר עם דואר אלקטרוני וסיסמה.

## ספקים שהוגדרו חלקית

כאשר לספק יש חלק ממשתני הסביבה הנדרשים אך לא את כולם, נרשמת אזהרה:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

זה עוזר לזהות בעיות תצורה מבלי לסכן את האפליקציה.

## משתני סביבה נדרשים

הגדר לפחות הדברים הבאים כדי ש-NextAuth יפעל:

```env
# נדרש לכל הגדרות NextAuth
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# אופציונלי: הוסף אישורי ספק כדי להפעיל OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

לויצירת `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## משאבים קשורים

- [הגדרת ספקים](/template/configuration/provider-config) — בחירה בין NextAuth, Supabase או שניהם
- [עיון בסביבה](/template/configuration/environment-reference) — רשימת משתני סביבה מלאה
- [תבניות טיפול בשגיאות](/template/guides/error-handler-patterns) — מבנה שגיאות אימות
