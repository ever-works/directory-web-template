---
id: auth-config-reference
title: مرجع تكوين Auth.js
sidebar_label: مرجع تكوين Auth
sidebar_position: 11
---

# مرجع تكوين Auth.js

توثّق هذه الصفحة تكوين NextAuth (Auth.js) المحدد في `auth.config.ts`. يقوم هذا الملف بإعداد موفري المصادقة واستراتيجية الجلسة ومعالجة الأخطاء في القالب.

## نظرة عامة

يدعم القالب استراتيجيات مصادقة متعددة من خلال تكوين موحد:

- **NextAuth (Auth.js)** — المصادقة المستندة إلى OAuth وبيانات الاعتماد
- **Supabase Auth** — المصادقة الأصلية لـ Supabase
- **كلاهما** — وضع المزود المزدوج لأقصى قدر من المرونة

يقوم ملف `auth.config.ts` بتهيئة جانب NextAuth من هذا النظام.

## ملف التكوين

يصدّر `auth.config.ts` الجذري كائن `NextAuthConfig`:

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
    // الرجوع إلى بيانات الاعتماد فقط عند فشل OAuth
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

## الخصائص الرئيسية

### `trustHost`

اضبط القيمة على `true` للثقة بترويسة المضيف عند التشغيل خلف وكيل عكسي (مثل Vercel). هذا مطلوب لإنشاء عناوين URL لإعادة التوجيه بشكل صحيح في بيئات الإنتاج.

### `providers`

يُبنى مصفوفة المزودين ديناميكياً بناءً على مزودي OAuth الذين لديهم بيانات اعتماد صالحة مكوّنة. تقوم الدالة `configureProviders()` بـ:

1. استدعاء `configureOAuthProviders()` للتحقق من صحة متغيرات البيئة
2. تعيين كل مزود ممكّن إلى تكوين مزود NextAuth الخاص به
3. دائماً تضمين مزود بيانات الاعتماد كخيار احتياطي

## المزودون المدعومون

| المزود | متغيرات البيئة المطلوبة | ملاحظات |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | ربط حسابات البريد الإلكتروني معطّل افتراضياً |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | تدفق OAuth القياسي |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | تدفق OAuth القياسي |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | تدفق OAuth 2.0 |
| Credentials | لا شيء (ممكّن دائماً) | المصادقة بالبريد الإلكتروني/كلمة المرور |

## بنية المزود

تتضمن مسارات إنشاء المزود عدة ملفات تعمل معاً.

### مصنع المزود (`lib/auth/providers.ts`)

تعيّن الدالة `createNextAuthProviders` كائنات التكوين إلى نسخ مزود NextAuth الفعلية:

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

  // كتل مماثلة لـ GitHub وFacebook وTwitter...

  if (config.credentials?.enabled) {
    providers.push(credentialsProvider);
  }

  return providers;
}
```

### معالج أخطاء المصادقة (`lib/auth/error-handler.ts`)

يتحقق معالج أخطاء المصادقة من متغيرات البيئة ويوفر رسائل خطأ واضحة:

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

## التدهور السلس

مبدأ تصميمي رئيسي هو التدهور السلس. إذا فشل تكوين OAuth عند بدء التشغيل:

1. يُلتقط الخطأ كـ `AppError` منظم من النوع `CONFIG` والرمز `OAUTH_CONFIG_FAILED`
2. يُسجَّل الخطأ بسياق `"Auth Config"`
3. يرجع النظام إلى المصادقة ببيانات الاعتماد فقط
4. يستمر التطبيق في بدء التشغيل بشكل طبيعي

هذا يعني أن سر Google OAuth المكوَّن بشكل خاطئ لن يمنع التطبيق بأكمله من العمل — يمكن للمستخدمين تسجيل الدخول بالبريد الإلكتروني وكلمة المرور.

## المزودون المكوَّنون جزئياً

عندما يكون لدى المزود بعض متغيرات البيئة المطلوبة ولكن ليس كلها، يُسجَّل تحذير:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

يساعد هذا في تحديد مشاكل التكوين دون تعطل التطبيق.

## متغيرات البيئة المطلوبة

قم على أدنى تقدير بتكوين ما يلي لعمل NextAuth:

```env
# مطلوب لجميع تكوينات NextAuth
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# اختياري: أضف بيانات اعتماد المزود لتفعيل OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

لإنشاء `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## الموارد ذات الصلة

- [تكوين مزودي الخدمة](/template/configuration/provider-config) — الاختيار بين NextAuth وSupabase أو كليهما
- [مرجع البيئة](/template/configuration/environment-reference) — قائمة كاملة بمتغيرات البيئة
- [أنماط معالجة الأخطاء](/template/guides/error-handler-patterns) — بنية أخطاء المصادقة
