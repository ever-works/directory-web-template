---
id: webauthn
title: WebAuthn / מפתחות גישה
sidebar_label: WebAuthn
sidebar_position: 6
---

# WebAuthn / מפתחות גישה

## סקירה כללית

WebAuthn מאפשר אימות ללא סיסמה באמצעות:
- אימות ביומטרי (טביעת אצבע, זיהוי פנים)
- מפתחות אבטחת חומרה (YubiKey)
- מאמתי פלטפורמה (Windows Hello, Touch ID)

## הגדרה

הפעל WebAuthn ב-`auth.config.ts`:

```typescript
import { WebAuthn } from 'next-auth/providers/webauthn';

providers: [
  WebAuthn,
]
```

## דרישות

- HTTPS בסביבת ייצור (localhost עובד בפיתוח)
- דפדפן מודרני עם תמיכת WebAuthn
- על המשתמש להחזיק מכשיר התומך במפתחות גישה

## חוויית משתמש

1. המשתמש לוחץ על "התחבר עם מפתח גישה"
2. הדפדפן מבקש אימות ביומטרי או מפתח אבטחה
3. המשתמש מאמת
4. הפעלה נוצרת
