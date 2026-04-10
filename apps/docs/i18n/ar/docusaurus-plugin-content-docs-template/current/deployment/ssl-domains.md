---
id: ssl-domains
title: "SSL والنطاقات المخصصة"
sidebar_label: "SSL والنطاقات"
sidebar_position: 2
---

# SSL والنطاقات المخصصة

يغطي هذا الدليل تكوين النطاقات المخصصة وإدارة شهادات SSL وتكوين DNS ودعم النطاقات المتعددة لـ Ever Works Template. يأتي القالب مع رؤوس أمان للإنتاج ومُحسَّن لنشر Vercel مع HTTPS التلقائي، كما يدعم البيئات المستضافة ذاتياً مع تكوين SSL يدوي.

## رؤوس الأمان المدمجة

يُكوِّن القالب مجموعة شاملة من رؤوس الأمان في `next.config.ts`، تُطبَّق تلقائياً على كل مسار. تفرض هذه الرؤوس استخدام HTTPS وتمنع هجمات الويب الشائعة وتتحكم في تحميل الموارد.

### التكوين الكامل للرؤوس

كتلة الرؤوس الكاملة من `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';",
        },
      ],
    },
  ];
}
```

### وصف الرؤوس

| الرأس | القيمة | الغرض |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | يمنع هجمات استنشاق نوع MIME |
| `X-Frame-Options` | `DENY` | يمنع اختطاف النقرات بمنع التضمين في iframe |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | يتحكم في مقدار معلومات الـ referrer المشتركة |
| `X-DNS-Prefetch-Control` | `on` | يُفعّل الجلب المسبق لـ DNS لتحميل أسرع |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | يفرض استخدام HTTPS لمدة سنتين على جميع النطاقات الفرعية |
| `Content-Security-Policy` | انظر أعلاه | يحدد الموارد التي يمكن للمتصفح تحميلها |

### تفاصيل HSTS

يستخدم رأس Strict-Transport-Security الحد الأقصى من التكوين الموصى به:

- **max-age=63072000** – يتذكر المتصفحون استخدام HTTPS لمدة سنتين
- **includeSubDomains** – يجب على جميع النطاقات الفرعية أيضاً استخدام HTTPS
- **preload** – مؤهل للإدراج في قوائم HSTS preload للمتصفحات

:::caution
بمجرد تفعيل HSTS مع preload وإرسال نطاقك إلى قائمة preload، يصعح جداً التراجع عن ذلك. تأكد من تكوين شهادة SSL وإعدادها للتجديد التلقائي قبل تفعيل preload.
:::

### وصف سياسة أمان المحتوى

| التوجيه | القيمة | التأثير |
|-----------|-------|--------|
| `default-src` | `'self'` | تحميل الموارد من نفس الأصل افتراضياً فقط |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | نصوص برمجية من نفس الأصل والنصوص المضمّنة وـ SDK الدفع عبر LemonSqueezy |
| `style-src` | `'self' 'unsafe-inline'` | أنماط من نفس الأصل بالإضافة إلى الأنماط المضمّنة (ضرورية لـ CSS-in-JS) |
| `img-src` | `'self' data: https:` | صور من نفس الأصل وdata URIs وأي مصدر HTTPS |
| `font-src` | `'self'` | خطوط من نفس الأصل فقط |
| `connect-src` | `'self' https:` | استدعاءات API إلى نفس الأصل وأي نقطة نهاية HTTPS |
| `frame-ancestors` | `'none'` | يمنع تضمين الصفحة في إطارات |

## تكوين النطاق المخصص

### متغيرات البيئة لتكوين النطاق

عند تكوين نطاق مخصص، قم بتحديث هذه المتغيرات في بيئة النشر:

```bash
# عنوان URL للتطبيق – يُستخدم لعمليات رد الاتصال OAuth والـ URLs المعياري وhreflang وخرائط الموقع
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# نطاق ملف تعريف الارتباط – يجب أن يتطابق مع نطاقك لكي تعمل ملفات تعريف ارتباط الجلسة
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# عنوان URL للمصادقة – يُستخدمه NextAuth لعمليات رد الاتصال
NEXTAUTH_URL=https://yourdomain.com
```

تم الإعلان عن المتغير `NEXT_PUBLIC_APP_URL` كمتغير حرج في `scripts/check-env.js`:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: SSL التلقائي

عند النشر على Vercel، تُصدر شهادات SSL وتُجدَّد تلقائياً باستخدام Let's Encrypt. لا تتطلب العملية تكويناً يدوياً:

1. **إضافة النطاق** في لوحة تحكم مشروع Vercel ضمن الإعدادات ← النطاقات
2. **تكوين DNS** للإشارة إلى Vercel (انظر تكوين DNS أدناه)
3. **التحقق** – يصدر Vercel الشهادة تلقائياً بعد حل DNS

يدعم Vercel:

- إصدار شهادات Let's Encrypt تلقائياً
- شهادات Wildcard للنطاقات الفرعية
- التجديد التلقائي للشهادات قبل انتهاء الصلاحية
- إعادة التوجيه من HTTP إلى HTTPS (تلقائياً)

### تكوين DNS

**لنطاق الجذر** (مثل `example.com`):

```
النوع:  A
الاسم:  @
القيمة: 76.76.21.21
```

**لنطاق www الفرعي** (مثل `www.example.com`):

```
النوع:  CNAME
الاسم:  www
القيمة: cname.vercel-dns.com
```

**التحقق من DNS** بعد تعيين السجلات:

```bash
# التحقق من سجل A
dig yourdomain.com A +short

# التحقق من سجل CNAME
dig www.yourdomain.com CNAME +short

# التحقق من الانتشار من مواقع متعددة
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

قد يستغرق انتشار DNS ما يصل إلى 48 ساعة، رغم أن معظم التغييرات تسري خلال دقائق.

### الاستضافة الذاتية: Nginx مع Let's Encrypt

لعمليات النشر المستضافة ذاتياً خلف Nginx، قم بتكوين إنهاء SSL على مستوى الوكيل:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

تثبيت وتكوين Certbot للإدارة التلقائية للشهادات:

```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx

# الحصول على الشهادة وتثبيتها
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# التحقق من التجديد التلقائي
sudo certbot renew --dry-run
```

## عناوين URL لرد اتصال OAuth

عند التبديل إلى نطاق مخصص، قم بتحديث عناوين URL لرد الاتصال في وحدة تحكم كل موفر OAuth:

| الموفر | عنوان URL لرد الاتصال |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

يتحقق القالب تلقائياً من تكوين OAuth عند بدء التشغيل. من `auth.config.ts`:

```typescript
const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === 'google')
        ? { enabled: true, clientId: authConfig.google.clientId || '', ... }
        : { enabled: false },
      // ... موفرون آخرون
    });
  } catch (error) {
    // التحويل إلى بيانات الاعتماد فقط
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

إذا كان أي موفر مُكوَّناً بشكل غير صحيح، فسيتحول القالب إلى المصادقة بيانات الاعتماد فقط.

## دعم النطاقات المتعددة

يدعم القالب نطاقات متعددة عبر تكوين تحسين الصور في Next.js:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

تُنشئ أداة `generateImageRemotePatterns()` أنماط صور بعيدة بشكل ديناميكي، مما يسمح لـ Next.js بتحسين الصور من النطاقات الخارجية المُكوَّنة.

## تكوين ملفات تعريف الارتباط

يجب أن تتوافق إعدادات ملفات تعريف الارتباط مع تكوين نطاقك:

```bash
# التطوير (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# الإنتاج (نطاق مخصص)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

يضمن تعيين `COOKIE_SECURE=true` نقل ملفات تعريف الارتباط فقط عبر اتصالات HTTPS. هذا ضروري لمنع اختطاف الجلسات. يتحقق نص التحقق من البيئة من تكوين ملفات تعريف الارتباط كجزء من فئة الأمان.

## استكشاف الأخطاء وإصلاحها

### لم يتم إصدار شهادة SSL

1. تحقق من أن سجلات DNS تشير إلى الهدف الصحيح
2. قم بتعطيل أي وكيل DNS (مثل وضع وكيل Cloudflare) قد يعترض مصادقة ACME
3. انتظر انتشار DNS الكامل (تحقق باستخدام أوامر `dig` أعلاه)
4. راجع لوحة تحكم المنصة بحثاً عن أخطاء شهادة محددة

### تحذيرات المحتوى المختلط

إذا أبلغ المتصفح عن محتوى مختلط بعد تفعيل HTTPS:

1. تأكد من بدء `NEXT_PUBLIC_APP_URL` بـ `https://`
2. تحقق من استخدام جميع عناوين URL للموارد الخارجية لـ HTTPS
3. تتضمن توجيهي `img-src` و`connect-src` في CSP `https:` بشكل افتراضي

### عدم تطابق إعادة توجيه OAuth

إذا فشل تسجيل الدخول عبر OAuth بسبب عدم تطابق URI إعادة التوجيه:

1. قم بتحديث عنوان URL لرد الاتصال في وحدة تحكم المطور لكل موفر OAuth
2. تأكد من تطابق `NEXTAUTH_URL` مع النطاق الدقيق بما في ذلك البروتوكول
3. امسح ملفات تعريف ارتباط المتصفح وتخزين الجلسة قبل إعادة المحاولة

## الملفات ذات الصلة

| الملف | الغرض |
|------|---------|
| `next.config.ts` | رؤوس الأمان وCSP وأنماط الصور البعيدة |
| `auth.config.ts` | تكوين موفر OAuth وإعداد رد الاتصال |
| `scripts/check-env.js` | التحقق من صحة متغيرات البيئة لتكوينات النطاق |
| `lib/seo/hreflang.ts` | إنشاء روابط hreflang البديلة لـ i18n |
| `lib/utils/url-cleaner.ts` | أداة عنوان URL الأساسية باستخدام `NEXT_PUBLIC_APP_URL` |
