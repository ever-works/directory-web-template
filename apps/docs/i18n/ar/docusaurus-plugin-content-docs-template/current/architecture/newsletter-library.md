---
id: newsletter-library
title: مكتبة النشرة
sidebar_label: مكتبة النشرة
sidebar_position: 35
---

# مكتبة النشرة

توفر مكتبة الرسائل الإخبارية وظائف التكوين والتحقق من الصحة والأداة المساعدة لإدارة اشتراكات الرسائل الإخبارية عبر البريد الإلكتروني. إنه يعتمد على [Mail Factory](./mail-factory.md) لتسليم البريد الإلكتروني.

## هيكل الملف

```
lib/newsletter/
  config.ts     # Configuration, types, Zod schemas, email config creation
  utils.ts      # Email sending, subscription validation, logging, templates
```

## التكوين (`config.ts`)

### ثوابت النشرة

يقوم الكائن `NEWSLETTER_CONFIG` بمركزية جميع الثوابت المتعلقة بالرسائل الإخبارية:

```ts
export const NEWSLETTER_CONFIG = {
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",

  SOURCES: {
    FOOTER: "footer",
    POPUP: "popup",
    SIGNUP: "signup",
  } as const,

  ERRORS: {
    INVALID_EMAIL: "Please enter a valid email address",
    ALREADY_SUBSCRIBED: "Email is already subscribed to the newsletter",
    NOT_SUBSCRIBED: "Email is not subscribed to the newsletter",
    SUBSCRIPTION_FAILED: "Failed to create subscription. Please try again.",
    UNSUBSCRIPTION_FAILED: "Failed to unsubscribe. Please try again.",
    EMAIL_SEND_FAILED: "Failed to send email. Please try again.",
    STATS_FAILED: "Failed to get newsletter statistics",
  } as const,

  SUCCESS: {
    SUBSCRIBED: "Successfully subscribed to newsletter",
    UNSUBSCRIBED: "Successfully unsubscribed from newsletter",
  } as const,
} as const;
```

### أنواع

```ts
// Source of the subscription action
type NewsletterSource = "footer" | "popup" | "signup";

// Email provider configuration
interface EmailConfig {
  provider: string;
  defaultFrom: string;
  domain: string;
  apiKeys: { resend: string; novu: string };
  novu?: { templateId?: string; backendUrl?: string };
}

// Action result for subscribe/unsubscribe operations
interface NewsletterActionResult {
  success?: boolean;
  error?: string;
  email?: string;
}

// Newsletter statistics
interface NewsletterStats {
  totalActive: number;
  recentSubscriptions: number;
}
```

### مخططات التحقق من الصحة

يتعامل مخططان Zod مع التحقق من صحة البريد الإلكتروني لعمليات النشرة الإخبارية:

```ts
import { z } from "zod";

// Basic email validation
export const emailSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
});

// Full subscription schema with source tracking
export const newsletterSubscriptionSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
  source: z
    .enum(["footer", "popup", "signup"])
    .default("footer"),
});
```

### إنشاء التكوين

```ts
import { createEmailConfig, getCompanyName } from '@/lib/newsletter/config';

// Build email config from app settings and environment
const config = await createEmailConfig();
// => { provider: "resend", defaultFrom: "...", domain: "...", apiKeys: {...} }

// Get company name with fallback
const name = await getCompanyName();
// => "Ever Works" or value from content config
```

## المرافق (`utils.ts`)

### إرسال رسائل البريد الإلكتروني بأمان

تعمل وظيفة `sendEmailSafely` على تغليف إرسال البريد الإلكتروني بمعالجة شاملة للأخطاء:

```ts
import { sendEmailSafely, createEmailService } from '@/lib/newsletter/utils';

const { service, config } = await createEmailService();

const result = await sendEmailSafely(
  service,
  config,
  { subject: "Welcome!", html: "<p>Hi</p>", text: "Hi" },
  "user@example.com",
  "welcome"
);

if (result.success) {
  // Email sent
} else {
  console.log(result.error);
}
```

### التحقق من صحة الاشتراك

تحقق مما إذا كان يمكن الاشتراك في البريد الإلكتروني أو إلغاء الاشتراك فيه:

```ts
import { canSubscribe, canUnsubscribe } from '@/lib/newsletter/utils';

// Check if email is not already active
const subCheck = await canSubscribe("user@example.com");
if (!subCheck.canSubscribe) {
  console.log(subCheck.error); // "Email is already subscribed..."
}

// Check if email is currently active
const unsubCheck = await canUnsubscribe("user@example.com");
if (!unsubCheck.canUnsubscribe) {
  console.log(unsubCheck.error); // "Email is not subscribed..."
}
```

تستعلم الدالة `validateSubscriptionStatus` الأساسية عن قاعدة البيانات:

```ts
const validation = await validateSubscriptionStatus(email, shouldBeActive);
// => { isValid: boolean, error?: string, subscription?: any }
```

### التسجيل والمراقبة

```ts
import { logNewsletterActivity, trackNewsletterMetric } from '@/lib/newsletter/utils';

// Log activity for monitoring
logNewsletterActivity("subscribe", "user@example.com", "footer");
// Output: Newsletter Activity: { timestamp, action, email, source }

// Track metrics (wraps logNewsletterActivity)
trackNewsletterMetric("subscription", "user@example.com", "popup");
```

### أدوات مساعدة للنماذج

```ts
import { getTemplateWithCompany } from '@/lib/newsletter/utils';

// Automatically injects the company name into a template function
const template = await getTemplateWithCompany(
  (email, companyName) => ({
    subject: `Welcome to ${companyName}`,
    html: `<p>Thanks for subscribing, ${email}!</p>`,
    text: `Thanks for subscribing, ${email}!`,
  }),
  "user@example.com"
);
```

### الاستجابات الموحدة

```ts
import { createErrorResponse, createSuccessResponse } from '@/lib/newsletter/utils';

const error = createErrorResponse("Invalid email", "bad@", "subscribe");
// => { error: "Invalid email", email: "bad@", context: "subscribe" }

const success = createSuccessResponse("user@example.com", "subscribe");
// => { success: true, email: "user@example.com", context: "subscribe" }
```

## تدفق التكامل

تدفق الاشتراك في النشرة الإخبارية النموذجي:

1. **التحقق من صحة الإدخال** باستخدام `newsletterSubscriptionSchema`
2. **التحقق من الأهلية** باستخدام `canSubscribe`
3. **إنشاء سجل قاعدة البيانات** عبر مستودع الرسائل الإخبارية
4. **أرسل بريدًا إلكترونيًا ترحيبيًا** باستخدام `sendEmailSafely`
5. ** سجل النشاط ** باستخدام `logNewsletterActivity`
6. **إرجاع النتيجة** باستخدام `createSuccessResponse` أو `createErrorResponse`

```ts
// Simplified server action example
async function subscribeToNewsletter(formData: FormData) {
  const parsed = newsletterSubscriptionSchema.safeParse({
    email: formData.get('email'),
    source: formData.get('source'),
  });
  if (!parsed.success) {
    return createErrorResponse(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL);
  }

  const { email, source } = parsed.data;
  const eligibility = await canSubscribe(email);
  if (!eligibility.canSubscribe) {
    return createErrorResponse(eligibility.error || "Cannot subscribe");
  }

  // Create subscription in database...
  // Send welcome email...

  logNewsletterActivity("subscribe", email, source);
  return createSuccessResponse(email, "subscribe");
}
```

## الملفات ذات الصلة

- `lib/newsletter/config.ts` - التكوين والأنواع ومخططات التحقق من الصحة
- `lib/newsletter/utils.ts` - أدوات مساعدة للبريد الإلكتروني والتحقق من الصحة والتسجيل والقوالب
- `lib/mail/` - مصنع وخدمة مزود البريد الإلكتروني
- `lib/mail/templates/newsletter-*.ts` - قوالب البريد الإلكتروني للرسائل الإخبارية
- `lib/db/queries.ts` - استعلامات قاعدة البيانات لسجلات الاشتراك
