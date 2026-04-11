---
id: session-management
title: إدارة الجلسات
sidebar_label: إدارة الجلسات
sidebar_position: 5
---

# إدارة الجلسات

## استراتيجية الجلسة

يدعم القالب استراتيجيتين للجلسة:
1. **JWT** (افتراضي) — بدون حالة، مخزّن في ملفات تعريف الارتباط
2. **Database** — مخزّن في قاعدة البيانات، يدعم الإلغاء

## تكوين الجلسة

```typescript
// auth.config.ts
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 يوماً
  }
}
```

## الأمان

- ملفات تعريف الارتباط HttpOnly تمنع XSS
- SameSite=Lax يمنع CSRF
- تجديد تلقائي للجلسة
- علامة Secure في الإنتاج

## تسجيل الخروج

يُمسح الجلسة عند تسجيل الخروج. يمكن إبطال جميع الجلسات النشطة بتغيير `AUTH_SECRET`.
