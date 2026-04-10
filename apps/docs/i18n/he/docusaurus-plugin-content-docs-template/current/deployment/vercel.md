---
id: vercel
title: פריסה ב-Vercel
sidebar_label: Vercel
sidebar_position: 3
---

# פריסה ב-Vercel

פרוס את אתר הדירקטוריון Ever Works שלך ב-Vercel להפצה גלובלית מהירה.

## דרישות מוקדמות

- חשבון Vercel
- מאגר GitHub המכיל את פרויקט Ever Works

## פריסה מהירה

### 1. חיבור מאגר

1. בקר ב-[vercel.com](https://vercel.com)
2. לחץ על "New Project"
3. ייבא את מאגר GitHub שלך
4. בחר את תיקיית `website` כמסלול שורש

### 2. הגדרת תצורת בנייה

Vercel יזהה Next.js אוטומטית. אמת את ההגדרות הבאות:

- **Framework Preset**: Next.js
- **מסלול שורש**: `website`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. משתני סביבה

הוסף את משתני הסביבה שלך בלוח הבקרה של Vercel:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=your-database-url

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.vercel.app

# OAuth Providers (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. פריסה

לחץ על "Deploy" ו-Vercel יבנה וייפרוס את האתר שלך אוטומטית.

## דומיין מותאם אישית

### 1. הוספת דומיין

בלוח הבקרה של פרויקט Vercel:
1. עבור ל-"Settings" → "Domains"
2. הוסף את הדומיין המותאם אישית שלך
3. עקוב אחר הוראות תצורת ה-DNS

### 2. תעודת SSL

Vercel מספק תעודות SSL אוטומטית לכל הדומיינים.

## תצורה מתקדמת

### קובץ תצורת Vercel

צור `vercel.json` בשורש הפרויקט שלך:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "website/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/website/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### אופטימיזציית בנייה

אופטימיזציית הבנייה עבור Vercel:

```javascript
// next.config.js
module.exports = {
  // Enable static optimization
  output: 'standalone',
  
  // Optimize images
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable compression
  compress: true,
}
```

## ניטור ואנליטיקה

### Vercel Analytics

אפשר Vercel Analytics בפרויקט שלך:

```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### ניטור ביצועים

נטר את ביצועי הפריסה שלך:
- Core Web Vitals
- זמן ביצוע פונקציות
- ביצועי בנייה

## פתרון בעיות

### בעיות נפוצות

1. **שגיאות בנייה**: בדוק יומני בנייה בלוח הבקרה של Vercel
2. **משתני סביבה**: ודא שכל המשתנים הנחוצים מוגדרים
3. **בעיות דומיין**: אמת תצורת DNS

### מצב ניפוי באגים

אפשר מצב ניפוי באגים ליומנים מפורטים:

```bash
# In your environment variables
DEBUG=1
```

## הצעדים הבאים

- [משתני סביבה](/docs/deployment/environment-variables) - הגדר את הפריסה
- [ניטור](/docs/deployment/monitoring) - נטר את האפליקציה
- [תמיכה](/docs/advanced-guide/support) - קבל עזרה
