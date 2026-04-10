---
id: exercises
title: تمارين عملية
sidebar_label: تمارين
sidebar_position: 5
---

# تمارين عملية

طبّق ما تعلمته من خلال مهام وتحديات حقيقية.

## 🎯 الأهداف

- ✅ التدرب على إنشاء نقاط نهاية API
- ✅ تطبيق معايير توثيق Swagger
- ✅ تنفيذ التحقق ومعالجة الأخطاء
- ✅ بناء وظائف كاملة من الصفر
- ✅ بناء الثقة في سير عمل التطوير

**الوقت التقديري**: ثلاثة إلى خمسة أيام

---

## التمرين 1: مسار GET بسيط

**الصعوبة**: ⭐ مبتدئ  
**المدة**: 15 – 30 دقيقة  
**الهدف**: تعلّم بنية التعليقات الأساسية وسير العمل

### المهمة

أنشئ نقطة نهاية GET بسيطة تُعيد معلومات الخادم.

### الخطوات

1. **إنشاء الملف**: `app/api/training/server-info/route.ts`

2. **تنفيذ المسار**:

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

3. **اختبار سير العمل**:

```bash
yarn generate-docs
open http://localhost:3000/api/reference
curl http://localhost:3000/api/training/server-info
```

### معايير النجاح

- [ ] تظهر نقطة النهاية في Scalar UI تحت علامة "System"
- [ ] جميع حقول الاستجابة موثقة مع أمثلة
- [ ] تعمل نقطة النهاية عند اختبارها في Scalar UI
- [ ] لا توجد أخطاء في التوليد

---

## التمرين 2: مسار POST مع التحقق

**الصعوبة**: ⭐⭐ متوسط  
**المدة**: 30 – 45 دقيقة  
**الهدف**: تعلّم توثيق جسم الطلب ومعالجة الأخطاء

### المهمة

أنشئ نقطة نهاية POST لتلقي تعليقات المستخدمين مع التحقق.

### الخطوات

1. **إنشاء الملف**: `app/api/training/feedback/route.ts`

2. **التنفيذ مع التحقق**:

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

3. **الاختبار ببيانات صحيحة وغير صحيحة**:

```bash
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "أحمد محمد",
    "email": "ahmed@example.com",
    "category": "feature",
    "message": "منصة رائعة!",
    "rating": 5
  }'
```

---

## التمرين 3: تنفيذ ميزة كاملة

**الصعوبة**: ⭐⭐⭐ متقدم  
**المدة**: يوم إلى يومين  
**الهدف**: بناء ميزة كاملة مع عمليات CRUD والتوثيق

### المهمة

نفّذ API لإدارة الملاحظات مع وظيفة CRUD كاملة.

### المتطلبات

- `GET /api/training/notes` – عرض جميع الملاحظات
- `POST /api/training/notes` – إنشاء ملاحظة جديدة
- `GET /api/training/notes/[id]` – استرجاع ملاحظة واحدة
- `PUT /api/training/notes/[id]` – تحديث ملاحظة
- `DELETE /api/training/notes/[id]` – حذف ملاحظة
