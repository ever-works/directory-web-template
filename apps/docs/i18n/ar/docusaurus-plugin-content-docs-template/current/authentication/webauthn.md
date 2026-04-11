---
id: webauthn
title: WebAuthn / مفاتيح المرور
sidebar_label: WebAuthn
sidebar_position: 6
---

# WebAuthn / مفاتيح المرور

## نظرة عامة

يُتيح WebAuthn المصادقة بدون كلمة مرور باستخدام:
- المصادقة البيومترية (بصمة الإصبع، التعرف على الوجه)
- مفاتيح الأمان المادية (YubiKey)
- منصات المصادقة (Windows Hello، Touch ID)

## الإعداد

تفعيل WebAuthn في `auth.config.ts`:

```typescript
import { WebAuthn } from 'next-auth/providers/webauthn';

providers: [
  WebAuthn,
]
```

## المتطلبات

- HTTPS في الإنتاج (localhost يعمل في التطوير)
- متصفح حديث يدعم WebAuthn
- يجب أن يمتلك المستخدم جهازاً يدعم مفاتيح المرور

## تجربة المستخدم

1. يضغط المستخدم على "تسجيل الدخول بمفتاح المرور"
2. يطلب المتصفح المصادقة البيومترية أو مفتاح الأمان
3. يقوم المستخدم بالمصادقة
4. تُنشأ الجلسة
