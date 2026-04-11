---
id: ssl-domains
title: "SSL ודומיינים מותאמים"
sidebar_label: "SSL ודומיינים"
sidebar_position: 2
---

# SSL ודומיינים מותאמים

מדריך זה מכסה הגדרת דומיינים מותאמים אישית, ניהול אישורי SSL, תצורת DNS ותמיכה בדומיינים מרובים עבור Ever Works Template. התבנית מגיעה עם כותרות אבטחה לייצור ומאופטמת לפריסה ב-Vercel עם HTTPS אוטומטי, אך תומכת גם בסביבות אחסון עצמאי עם תצורת SSL ידנית.

## כותרות אבטחה מובנות

התבנית מגדירה סט מקיף של כותרות אבטחה ב-`next.config.ts`, המוחלות אוטומטית על כל מסלול. כותרות אלו אוכפות HTTPS, מונעות התקפות ווב נפוצות ושולטות בטעינת משאבים.

### תצורת כותרות מלאה

גוש הכותרות המלא מ-`next.config.ts`:

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

### תיאור כותרות

| כותרת | ערך | מטרה |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | מונע התקפות זיהוי סוג MIME |
| `X-Frame-Options` | `DENY` | חוסם clickjacking על ידי מניעת הטמעה ב-iframe |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | שולט בכמות מידע ה-referrer המשותף |
| `X-DNS-Prefetch-Control` | `on` | מאפשר DNS prefetching לטעינה מהירה יותר |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | אוכף HTTPS למשך שנתיים על כל הנדומיינים |
| `Content-Security-Policy` | ראה לעיל | מגביל אילו משאבים הדפדפן יכול לטעון |

### פרטי HSTS

כותרת Strict-Transport-Security משתמשת בתצורה המקסימלית המומלצת:

- **max-age=63072000** – דפדפנים זוכרים להשתמש ב-HTTPS למשך שנתיים
- **includeSubDomains** – כל הנדומיינים חייבים גם הם להשתמש ב-HTTPS
- **preload** – כשיר להכללה ברשימות HSTS preload של דפדפנים

:::caution
לאחר שה-HSTS עם preload מופעל והדומיין שלך נשלח לרשימת ה-preload, קשה מאוד לבטל זאת. ודא שאישור ה-SSL מוגדר כראוי ומוגדר לחידוש אוטומטי לפני הפעלת preload.
:::

### תיאור מדיניות אבטחת תוכן

| הוראה | ערך | השפעה |
|-----------|-------|--------|
| `default-src` | `'self'` | ברירת מחדל לטעינת משאבים מאותו מקור בלבד |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | סקריפטים מאותו מקור, סקריפטים מוטמעים ו-SDK תשלום LemonSqueezy |
| `style-src` | `'self' 'unsafe-inline'` | סגנונות מאותו מקור ועם סגנונות מוטמעים (נדרש ל-CSS-in-JS) |
| `img-src` | `'self' data: https:` | תמונות מאותו מקור, data URIs וכל מקור HTTPS |
| `font-src` | `'self'` | גופנים מאותו מקור בלבד |
| `connect-src` | `'self' https:` | קריאות API לאותו מקור ולכל נקודת קצה HTTPS |
| `frame-ancestors` | `'none'` | מונע הטמעת הדף במסגרות |

## הגדרת דומיין מותאם אישית

### משתני סביבה לתצורת דומיין

בעת הגדרת דומיין מותאם אישית, עדכן משתנים אלו בסביבת הפריסה:

```bash
# כתובת URL לאפליקציה – משמשת ל-OAuth callbacks, כתובות URL קנוניות, hreflang, מפות אתר
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# דומיין עוגיות – חייב להתאים לדומיין שלך כדי שעוגיות סשן יפעלו
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# כתובת URL לאימות – משמשת NextAuth לcallbacks
NEXTAUTH_URL=https://yourdomain.com
```

המשתנה `NEXT_PUBLIC_APP_URL` מוכרז כקריטי ב-`scripts/check-env.js`:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: SSL אוטומטי

בפריסה על Vercel, אישורי SSL מונפקים ומחודשים אוטומטית באמצעות Let's Encrypt. התהליך אינו דורש תצורה ידנית:

1. **הוספת הדומיין** בלוח הבקרה של פרויקט Vercel תחת הגדרות ← דומיינים
2. **הגדרת DNS** להצביע ל-Vercel (ראה תצורת DNS למטה)
3. **אימות** – Vercel מנפיק את האישור אוטומטית לאחר פתרון DNS

Vercel תומך ב:

- הנפקת אישורי Let's Encrypt אוטומטית
- אישורי Wildcard עבור נדומיינים
- חידוש אוטומטי של אישורים לפני תפוגה
- הפניה מ-HTTP ל-HTTPS (אוטומטית)

### תצורת DNS

**עבור דומיין שורש** (למשל `example.com`):

```
סוג:  A
שם:  @
ערך: 76.76.21.21
```

**עבור נדומיין www** (למשל `www.example.com`):

```
סוג:  CNAME
שם:  www
ערך: cname.vercel-dns.com
```

**אימות DNS** לאחר הגדרת רשומות:

```bash
# בדיקת רשומת A
dig yourdomain.com A +short

# בדיקת רשומת CNAME
dig www.yourdomain.com CNAME +short

# בדיקת התפשטות ממיקומים מרובים
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

התפשטות DNS עשויה לקחת עד 48 שעות, אם כי רוב השינויים נכנסים לתוקף תוך דקות.

### אחסון עצמאי: Nginx עם Let's Encrypt

לפריסות אחסון עצמאי מאחורי Nginx, הגדר סיום SSL ברמת הפרוקסי:

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

התקן והגדר Certbot לניהול אוטומטי של אישורים:

```bash
# התקנת Certbot
sudo apt install certbot python3-certbot-nginx

# קבלת והתקנת אישור
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# אימות חידוש אוטומטי
sudo certbot renew --dry-run
```

## כתובות URL ל-OAuth Callback

בעת מעבר לדומיין מותאם אישית, עדכן את כתובות ה-URL לcallback בקונסול של כל ספק OAuth:

| ספק | כתובת URL לCallback |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

התבנית מאמתת אוטומטית את תצורת ה-OAuth בהפעלה. מ-`auth.config.ts`:

```typescript
const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === 'google')
        ? { enabled: true, clientId: authConfig.google.clientId || '', ... }
        : { enabled: false },
      // ... ספקים נוספים
    });
  } catch (error) {
    // fallback לאישורים בלבד
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

אם ספק כלשהו מוגדר בצורה שגויה, התבנית עוברת לאימות אישורים בלבד.

## תמיכה בדומיינים מרובים

התבנית תומכת בדומיינים מרובים דרך תצורת אופטימיזציית תמונות של Next.js:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

כלי `generateImageRemotePatterns()` יוצר דינמית דפוסי תמונות מרוחקות, המאפשרים ל-Next.js לאופטם תמונות מדומיינים חיצוניים מוגדרים.

## תצורת עוגיות

הגדרות עוגיות חייבות להתאים לתצורת הדומיין שלך:

```bash
# פיתוח (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# ייצור (דומיין מותאם אישית)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

הגדרת `COOKIE_SECURE=true` מבטיחה שעוגיות מועברות רק דרך חיבורי HTTPS. זה חיוני למניעת חטיפת סשן. סקריפט בדיקת הסביבה מאמת תצורת עוגיות כחלק מקטגוריית האבטחה.

## פתרון בעיות

### אישור SSL לא הונפק

1. אמת שרשומות DNS מצביעות ליעד הנכון
2. כבה כל פרוקסי DNS (כגון מצב הפרוקסי של Cloudflare) שעלול ליירט את אתגר ACME
3. המתן להתפשטות DNS מלאה (בדוק עם פקודות `dig` לעיל)
4. סקור את לוח הבקרה של הפלטפורמה לשגיאות אישור ספציפיות

### אזהרות תוכן מעורב

אם הדפדפן מדווח על תוכן מעורב לאחר הפעלת HTTPS:

1. ודא שה-`NEXT_PUBLIC_APP_URL` מתחיל ב-`https://`
2. אמת שכל כתובות URL של משאבים חיצוניים משתמשות ב-HTTPS
3. הוראות CSP `img-src` ו-`connect-src` כוללות `https:` כברירת מחדל

### אי התאמה ב-OAuth Redirect

אם כניסת OAuth נכשלת עם שגיאת אי התאמה ב-redirect URI:

1. עדכן את כתובת ה-URL לcallback בקונסול המפתחים של כל ספק OAuth
2. ודא שה-`NEXTAUTH_URL` תואם לדומיין המדויק כולל הפרוטוקול
3. נקה עוגיות דפדפן ואחסון סשן לפני ניסיון חוזר

## קבצים קשורים

| קובץ | מטרה |
|------|---------|
| `next.config.ts` | כותרות אבטחה, CSP, דפוסי תמונות מרוחקות |
| `auth.config.ts` | תצורת ספקי OAuth והגדרת callback |
| `scripts/check-env.js` | אימות משתני סביבה לתצורות דומיין |
| `lib/seo/hreflang.ts` | יצירת קישורי hreflang חלופיים ל-i18n |
| `lib/utils/url-cleaner.ts` | כלי כתובת URL בסיסית שמשתמש ב-`NEXT_PUBLIC_APP_URL` |
