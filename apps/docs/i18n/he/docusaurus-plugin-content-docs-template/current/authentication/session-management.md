---
id: session-management
title: ניהול הפעלות
sidebar_label: ניהול הפעלות
sidebar_position: 5
---

# ניהול הפעלות

## אסטרטגיית הפעלה

התבנית תומכת בשתי אסטרטגיות הפעלה:
1. **JWT** (ברירת מחדל) — חסר מצב, מאוחסן בעוגיות
2. **Database** — מאוחסן בבסיס נתונים, תומך בביטול

## הגדרת הפעלה

```typescript
// auth.config.ts
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 ימים
  }
}
```

## אבטחה

- עוגיות HttpOnly מונעות XSS
- SameSite=Lax מונע CSRF
- רענון הפעלה אוטומטי
- דגל Secure בסביבת ייצור

## התנתקות

ההפעלה נמחקת בעת התנתקות. ניתן לבטל את כל ההפעלות הפעילות על ידי שינוי `AUTH_SECRET`.
