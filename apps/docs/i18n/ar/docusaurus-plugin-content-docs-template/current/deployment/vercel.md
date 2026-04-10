---
id: vercel
title: النشر على Vercel
sidebar_label: Vercel
sidebar_position: 3
---

# النشر على Vercel

نشر موقع دليل Ever Works على Vercel للحصول على توزيع عالمي سريع.

## المتطلبات الأساسية

- حساب Vercel
- مستودع GitHub يحتوي على مشروع Ever Works

## النشر السريع

### 1. ربط المستودع

1. قم بزيارة [vercel.com](https://vercel.com)
2. انقر على "New Project"
3. استورد مستودع GitHub الخاص بك
4. اختر مجلد `website` كنطاق جذر

### 2. تكوين إعدادات البناء

سيكتشف Vercel Next.js تلقائياً. تحقق من الإعدادات التالية:

- **Framework Preset**: Next.js
- **النطاق الجذر**: `website`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. متغيرات البيئة

أضف متغيرات البيئة الخاصة بك في لوحة تحكم Vercel:

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

### 4. النشر

انقر على "Deploy" وسيبني Vercel موقعك وينشره تلقائياً.

## النطاق المخصص

### 1. إضافة نطاق

في لوحة تحكم مشروع Vercel:
1. اذهب إلى "Settings" → "Domains"
2. أضف نطاقك المخصص
3. اتبع تعليمات تكوين DNS

### 2. شهادة SSL

يوفر Vercel تلقائياً شهادات SSL لجميع النطاقات.

## التكوين المتقدم

### ملف تكوين Vercel

أنشئ `vercel.json` في جذر مشروعك:

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

### تحسين البناء

تحسين البناء من أجل Vercel:

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

## المراقبة والتحليلات

### Vercel Analytics

تفعيل Vercel Analytics في مشروعك:

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

### مراقبة الأداء

مراقبة أداء نشرك:
- Core Web Vitals
- وقت تنفيذ الوظائف
- أداء البناء

## استكشاف الأخطاء وإصلاحها

### المشكلات الشائعة

1. **أخطاء البناء**: تحقق من سجلات البناء في لوحة تحكم Vercel
2. **متغيرات البيئة**: تأكد من تعيين جميع المتغيرات المطلوبة
3. **مشكلات النطاق**: تحقق من تكوين DNS

### وضع التصحيح

تفعيل وضع التصحيح للحصول على سجلات مفصلة:

```bash
# In your environment variables
DEBUG=1
```

## الخطوات التالية

- [متغيرات البيئة](/docs/deployment/environment-variables) - تكوين النشر
- [المراقبة](/docs/deployment/monitoring) - مراقبة تطبيقك
- [الدعم](/docs/advanced-guide/support) - الحصول على مساعدة
