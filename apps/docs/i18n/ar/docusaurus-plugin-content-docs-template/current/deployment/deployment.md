---
id: deployment-introduction
title: مقدمة في النشر
sidebar_label: مقدمة في النشر
sidebar_position: 1
---

# مقدمة في النشر

يقدم هذا الدليل نظرة عامة شاملة حول نشر قالب Ever Works في بيئة الإنتاج. القالب مبني على Next.js 16 ويستخدم وضع الإخراج المستقل (standalone)، مما يجعله متوافقاً مع منصات الاستضافة المتنوعة ونشر الحاويات.

## نظرة عامة على البنية

ينتج قالب Ever Works **بناء Next.js مستقل** يحزم جميع التبعيات في وحدة نشر واحدة. يُكوَّن هذا في `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
};
```

يُنشئ إعداد `output: "standalone"` قطعة نشر مكتفية بذاتها تحتوي فقط على ملفات `node_modules` الضرورية، مما يقلل كثيراً من حجم النشر.

## المنصات المدعومة

### موصى به: Vercel

Vercel هي منصة النشر الموصى بها للقالب. توفر:

- نشر بدون إعداد مسبق لتطبيقات Next.js
- تكوين تلقائي لشهادات SSL
- جدولة مهام cron مدمجة عبر `vercel.json`
- دعم الوظائف بدون خوادم لمسارات API
- نشر معاينة لطلبات السحب

يتضمن القالب تكوين `vercel.json` مع جداول cron محددة مسبقاً:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### استضافة ذاتية: Docker

يدعم إخراج standalone إنشاء حاويات Docker. يستخدم النشر النموذجي وقت تشغيل Node.js لخدمة التطبيق المبني. المتطلب الرئيسي هو ضمان نسخ مجلد إخراج `standalone` إلى جانب مجلدي `public` و`.next/static` إلى صورة الحاوية.

### منصات سحابية أخرى

يمكن نشر القالب على أي منصة تدعم تطبيقات Node.js:

- **Railway** -- نشر full-stack بسيط مع PostgreSQL مدمج
- **DigitalOcean App Platform** -- نشر حاويات مُدار
- **AWS (EC2، ECS أو App Runner)** -- بنية تحتية سحابية قابلة للتوسع
- **Google Cloud Run** -- منصة حاويات بدون خوادم
- **Azure App Service** -- استضافة Node.js مُدارة

## المتطلبات الأساسية

### متطلبات النظام

- **Node.js**: الإصدار 20.19.0 أو أحدث (محدد في حقل `engines` بـ `package.json`)
- **مدير الحزم**: pnpm (المشروع يستخدم `pnpm-lock.yaml`)
- **قاعدة البيانات**: PostgreSQL (مطلوبة لميزات الإنتاج مثل المصادقة والاشتراكات والتحليلات)
- **الذاكرة**: يُوصى بـ 8 GB RAM على الأقل لعملية البناء

يُخصص سكريبت البناء ذاكرة إضافية صراحةً:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### متغيرات البيئة المطلوبة

قبل النشر، تأكد من تكوين هذه المتغيرات الحرجة. يتحقق منها سكريبت `scripts/check-env.js` تلقائياً:

```bash
# Core (critical -- application will not function without these)
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
AUTH_SECRET=<generated-secret>         # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cookie Configuration
COOKIE_SECRET=<generated-secret>       # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

يُصنِّف سكريبت فحص البيئة المتغيرات حسب فئة التكامل:

```
Core:            NODE_ENV, PORT, APP_*, BASE_URL
Database:        DATABASE_URL, DB_*, POSTGRES_*
Auth:            AUTH_*, GOOGLE_*, GITHUB_*, FB_*, TWITTER_*
Supabase:        SUPABASE_*, NEXT_PUBLIC_SUPABASE_*
Content:         DATA_REPOSITORY, GH_TOKEN
Email:           RESEND_API_KEY, EMAIL_*
Payment:         STRIPE_*, PAYPAL_*
Analytics:       POSTHOG_*, SENTRY_*
Background Jobs: TRIGGER_DEV_*
```

### التكاملات الاختيارية

تُفعّل متغيرات البيئة هذه ميزات اختيارية:

```bash
# OAuth Providers (each requires both CLIENT_ID and CLIENT_SECRET)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=...
```

## دليل النشر السريع

### الخطوة 1: تحضير البناء

شغّل عملية البناء الكاملة محلياً للتحقق من أن كل شيء يُجمَّع بنجاح:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

يُنفذ سكريبت `build` عدة خطوات بالتسلسل:

1. **فحص البيئة** (`scripts/check-env.js`) -- التحقق من المتغيرات المطلوبة
2. **توليد OpenAPI** (`scripts/generate-openapi.ts`) -- توليد توثيق API
3. **ترحيل قاعدة البيانات** (`scripts/build-migrate.ts`) -- تطبيق تغييرات المخطط المعلقة
4. **بناء Next.js** (`next build`) -- تجميع التطبيق

### الخطوة 2: ترحيل قاعدة البيانات أثناء البناء

يعمل سكريبت `scripts/build-migrate.ts` تلقائياً أثناء البناء. يتعامل مع البيئات المختلفة:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

السلوك الرئيسي:

- **بناء الإنتاج**: أخطاء الترحيل تتسبب في فشل البناء (يمنع النشر المعطوب)
- **نشر المعاينة**: يُتسامح مع أخطاء الاتصال (قاعدة البيانات قد لا تكون مُهيَّأة بعد)
- **بناء CI** (غير Vercel): يُتخطى الترحيل تماماً

### الخطوة 3: التهيئة في وقت التشغيل

عند بدء التطبيق، يُشغّل `instrumentation.ts` تهيئة قاعدة البيانات:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Auto-initialize database (migrate and seed if needed)
  try {
    await initializeDatabase();
  } catch (error) {
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In development/preview, allow app to start for debugging
  }
}
```

تسلسل التهيئة:

1. تشغيل الترحيلات المعلقة (يتعامل Drizzle مع الخاصية التكرارية)
2. فحص ما إذا كانت قاعدة البيانات قد زُرعت
3. إذا لم تكن كذلك، الحصول على قفل استشاري في PostgreSQL وتشغيل سكريبت البذر
4. تحرير القفل بعد البذر

### الخطوة 4: النشر على Vercel

لنشر Vercel، اربط مستودعك وهيّئ:

1. اضبط **Framework Preset** على Next.js
2. اضبط **Build Command** على `pnpm build`
3. اضبط **Install Command** على `pnpm install`
4. أضف جميع متغيرات البيئة المطلوبة في لوحة تحكم Vercel
5. نشّر

### الخطوة 5: التحقق من النشر

بعد النشر، تحقق من:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## رؤوس الأمان

يُهيئ القالب تلقائياً رؤوس الأمان في `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
        },
      ],
    },
  ];
}
```

## تكوين تجمع الاتصالات

يمكن تكوين تجمع اتصالات قاعدة البيانات عبر متغير البيئة `DB_POOL_SIZE`:

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

- **الإنتاج الافتراضي**: 20 اتصالاً
- **التطوير الافتراضي**: 10 اتصالات
- **النطاق القابل للتكوين**: 1 إلى 50 اتصالاً
- **مهلة الخمول**: 20 ثانية
- **مهلة الاتصال**: 30 ثانية

## الخطوات التالية

- [SSL والنطاقات المخصصة](./ssl-domains.md) -- تكوين النطاقات المخصصة وشهادات SSL
- [إدارة قاعدة البيانات](./database-management.md) -- عمليات قاعدة البيانات الإنتاجية
- [النسخ الاحتياطي والاسترداد](./backup-recovery.md) -- استراتيجيات النسخ الاحتياطي لقاعدة البيانات
- [المراقبة](./monitoring.md) -- تكوين تتبع الأخطاء ومراقبة الأداء
