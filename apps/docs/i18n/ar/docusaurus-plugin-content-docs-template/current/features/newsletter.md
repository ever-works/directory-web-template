---
id: newsletter
title: نظام النشرة الإخبارية
sidebar_label: النشرة الإخبارية
sidebar_position: 5
---

# نظام النشرة الإخبارية

يتضمن قالب Ever Works نظام اشتراك في الرسائل الإخبارية مع تكامل البريد الإلكتروني ومصادر الاشتراك المتعددة وإحصائيات المسؤول.

## التكوين

يوفر نظام الرسائل الإخبارية الموجود في `lib/newsletter/config.ts` تكوينًا مركزيًا:

```typescript
const NEWSLETTER_CONFIG = {
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",

  SOURCES: {
    FOOTER: "footer",       // Footer subscription form
    POPUP: "popup",         // Popup/modal subscription
    SIGNUP: "signup",       // Account registration
  },
};
```

### إعداد مزود البريد الإلكتروني

تستخدم النشرة الإخبارية نفس مزود البريد الإلكتروني الذي يستخدمه نظام الإشعارات:

```typescript
interface EmailConfig {
  provider: string;        // "resend" or "novu"
  defaultFrom: string;     // Sender email address
  domain: string;          // App domain
  apiKeys: {
    resend: string;        // RESEND_API_KEY
    novu: string;          // NOVU_API_KEY
  };
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}
```

يتم حل التكوين من تكوين الموقع مع الرجوع إلى متغيرات البيئة:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## إدارة الاشتراكات

### التحقق من الصحة

يتم التحقق من صحة عناوين البريد الإلكتروني وتطبيعها باستخدام مخططات Zod:

```typescript
import { emailSchema, newsletterSubscriptionSchema } from '@/lib/newsletter/config';

// Simple email validation
const result = emailSchema.parse({ email: "user@example.com" });

// Full subscription validation (includes source)
const subscription = newsletterSubscriptionSchema.parse({
  email: "user@example.com",
  source: "footer",
});
```

يتم كتابة رسائل البريد الإلكتروني بأحرف صغيرة وقصها تلقائيًا أثناء التحقق من الصحة.

### مصادر الاشتراك

يسجل كل اشتراك المكان الذي قام فيه المستخدم بالتسجيل:

| المصدر | الموقع | الوصف |
|--------|----------|-------------|
| `footer` | تذييل الموقع | نموذج الاشتراك المرئي دائمًا |
| `popup` | مشروط/المنبثقة | مطالبة الاشتراك المشغلة |
| `signup` | التسجيل | الاشتراك أثناء إنشاء الحساب |

### إحصائيات

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## نقاط نهاية واجهة برمجة التطبيقات

| الطريقة | نقطة النهاية | الوصف |
|--------|----------|-------------|
| مشاركة | `/api/newsletter` | اشترك في النشرة الإخبارية |
| حذف | `/api/newsletter` | إلغاء الاشتراك في النشرة الإخبارية |
| احصل على | `/api/newsletter/stats` | الحصول على إحصائيات الاشتراك (المسؤول) |

## رسائل الخطأ

يوفر النظام رسائل خطأ متسقة وسهلة الاستخدام:

| الكود | رسالة |
|------|---------|
| `INVALID_EMAIL` | الرجاء إدخال عنوان بريد إلكتروني صالح |
| 4ـ | البريد الإلكتروني مشترك بالفعل في النشرة الإخبارية |
| 5 ــ | البريد الإلكتروني غير مشترك في النشرة الإخبارية |
| 6ـ | فشل في إنشاء الاشتراك. يرجى المحاولة مرة أخرى. |

## وظائف المرافق

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
