---
id: exercises
title: תרגולים מעשיים
sidebar_label: תרגולים
sidebar_position: 5
---

# תרגולים מעשיים

יישם את מה שלמדת עם משימות ואתגרים אמיתיים.

## 🎯 מטרות

- ✅ להתאמן על יצירת נקודות קצה API
- ✅ ליישם תקני תיעוד Swagger
- ✅ לממש אימות וטיפול בשגיאות
- ✅ לבנות פונקציונליות מלאה מאפס
- ✅ לבנות ביטחון בתהליך העבודה הפיתוחי

**זמן משוער**: 3–5 ימים

---

## תרגיל 1: נתיב GET פשוט

**רמת קושי**: ⭐ מתחיל  
**משך**: 15–30 דקות  
**מטרה**: לימוד מבנה הערות בסיסי ותהליך עבודה

### המשימה

צור נקודת קצה GET פשוטה שמחזירה מידע על השרת.

### שלבים

1. **צור קובץ**: `app/api/training/server-info/route.ts`

2. **ממש את הנתיב**:

```typescript
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/training/server-info:
 *   get:
 *     tags: ["System"]
 *     summary: "Get server information"
 *     description: "Returns basic server information including version, current timestamp, and uptime."
 *     responses:
 *       200:
 *         description: "Server information retrieved successfully"
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      server: "Ever Works API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
}
```

3. **בדוק את תהליך העבודה**:

```bash
yarn generate-docs
open http://localhost:3000/api/reference
curl http://localhost:3000/api/training/server-info
```

### קריטריוני הצלחה

- [ ] נקודת הקצה מופיעה ב-Scalar UI תחת תגית "System"
- [ ] כל שדות התגובה מתועדים עם דוגמאות
- [ ] נקודת הקצה עובדת בבדיקה ב-Scalar UI
- [ ] אין שגיאות יצירה

---

## תרגיל 2: נתיב POST עם אימות

**רמת קושי**: ⭐⭐ בינוני  
**משך**: 30–45 דקות  
**מטרה**: לימוד תיעוד גוף בקשה וטיפול בשגיאות

### המשימה

צור נקודת קצה POST לקבלת משוב משתמשים עם אימות.

### שלבים

1. **צור קובץ**: `app/api/training/feedback/route.ts`

2. **ממש עם אימות**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const feedbackSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  category: z.enum(['bug', 'feature', 'general']),
  message: z.string().min(10).max(1000),
  rating: z.number().min(1).max(5).optional()
});
```

3. **בדוק עם נתונים תקינים ולא תקינים**:

```bash
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "דוד לוי",
    "email": "david@example.co.il",
    "category": "feature",
    "message": "פלטפורמה מצוינת!",
    "rating": 5
  }'
```

---

## תרגיל 3: מימוש פונקציונליות מלאה

**רמת קושי**: ⭐⭐⭐ מתקדם  
**משך**: 1–2 ימים  
**מטרה**: בניית פונקציונליות מלאה עם פעולות CRUD ותיעוד

### המשימה

ממש API פשוט לניהול הערות עם פונקציונליות CRUD מלאה.

### דרישות

- `GET /api/training/notes` – רשימת כל ההערות
- `POST /api/training/notes` – יצירת הערה חדשה
- `GET /api/training/notes/[id]` – קבלת הערה בודדת
- `PUT /api/training/notes/[id]` – עדכון הערה
- `DELETE /api/training/notes/[id]` – מחיקת הערה
