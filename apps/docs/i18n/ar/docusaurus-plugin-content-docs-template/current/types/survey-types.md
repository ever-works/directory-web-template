---
id: survey-types
title: تعريفات نوع المسح
sidebar_label: أنواع المسح
sidebar_position: 6
---

# تعريفات نوع المسح

**المصدر:** `lib/types/survey.ts`

تحدد هذه الوحدة جميع تعريفات الأنواع المشتركة للاستطلاعات واستجابات الاستطلاع. إنه بمثابة المصدر الوحيد للحقيقة لهياكل البيانات ذات الصلة بالاستطلاع التي تستخدمها خدمة المسح وعميل واجهة برمجة التطبيقات للمسح ومعالجات مسار واجهة برمجة التطبيقات.

## التعدادات

### `SurveyTypeEnum`

يحدد ما إذا كان الاستطلاع ينطبق عالميًا أم يتم تحديد نطاقه على عنصر معين.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|القيمة|الوصف|
|-------|-------------|
|`GLOBAL`|يظهر الاستطلاع على مستوى الموقع، ولا يرتبط بأي عنصر محدد|
|`ITEM`|يرتبط الاستطلاع بعنصر محدد (عبر `itemId`)|

### `SurveyStatusEnum`

حالات دورة الحياة للاستطلاع.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|القيمة|الوصف|
|-------|-------------|
|`DRAFT`|يتم الآن إنشاء/تحرير الاستطلاع وهو غير مرئي للمستجيبين|
|`PUBLISHED`|الاستطلاع مباشر ويقبل الردود|
|`CLOSED`|لم يعد الاستطلاع يقبل الردود ولكن يتم الاحتفاظ بالبيانات|

## واجهات

### `CreateSurveyData`

البيانات المطلوبة لإنشاء استطلاع جديد.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  surveyJson: any;
}
```

|الميدان|اكتب|مطلوب|الوصف|
|-------|------|----------|-------------|
|`title`|`string`|نعم|عرض عنوان الاستطلاع|
|`description`|`string`|لا|وصف/عنوان فرعي اختياري|
|`type`|`SurveyTypeEnum`|نعم|ما إذا كان الاستطلاع عالميًا أو على نطاق البند|
|`itemId`|`string`|لا|معرف العنصر (مطلوب عندما يكون `type` هو `ITEM`)|
|`status`|`SurveyStatusEnum`|لا|الحالة الأولية (الافتراضيات هي `DRAFT`)|
|`surveyJson`|`any`|نعم|تعريف JSON المتوافق مع Survey.js|

### `UpdateSurveyData`

بيانات لتحديث المسح الحالي. جميع الحقول اختيارية.

```typescript
interface UpdateSurveyData {
  title?: string;
  slug?: string;
  description?: string;
  status?: SurveyStatusEnum;
  surveyJson?: any;
}
```

### `SubmitResponseData`

بيانات لتقديم استجابة المسح من المستجيب.

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;
  itemId?: string;
  data: any;
  ipAddress?: string;
  userAgent?: string;
}
```

|الميدان|اكتب|مطلوب|الوصف|
|-------|------|----------|-------------|
|`surveyId`|`string`|نعم|معرف الاستطلاع الذي يتم الرد عليه|
|`userId`|`string`|لا|معرف المستخدم الذي تمت مصادقته (خالي للمجهول)|
|`itemId`|`string`|لا|سياق العنصر للاستطلاعات على نطاق العنصر|
|`data`|`any`|نعم|كائن بيانات استجابة Survey.js|
|`ipAddress`|`string`|لا|IP المستجيب للتحليلات/إلغاء البيانات المكررة|
|`userAgent`|`string`|لا|سلسلة وكيل مستخدم المتصفح|

### `SurveyFilters`

عوامل التصفية للاستعلام عن الاستطلاعات في نقاط نهاية القائمة.

```typescript
interface SurveyFilters {
  type?: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  page?: number;
  limit?: number;
}
```

### `ResponseFilters`

مرشحات للاستعلام عن ردود الاستطلاع.

```typescript
interface ResponseFilters {
  itemId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`itemId`|`string?`|تصفية الاستجابات حسب العنصر|
|`userId`|`string?`|تصفية الاستجابات حسب المستخدم|
|`startDate`|`string?`|سلسلة تاريخ ISO لبداية النطاق|
|`endDate`|`string?`|سلسلة تاريخ ISO لنهاية النطاق|
|`page`|`number?`|رقم صفحة ترقيم الصفحات|
|`limit`|`number?`|النتائج لكل صفحة|

## أمثلة الاستخدام

### إنشاء مسح عالمي

```typescript
import type { CreateSurveyData } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const surveyData: CreateSurveyData = {
  title: 'User Satisfaction Survey',
  description: 'Help us improve by sharing your experience',
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.DRAFT,
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'satisfaction',
            title: 'How satisfied are you with our platform?',
            rateMin: 1,
            rateMax: 5,
          },
          {
            type: 'comment',
            name: 'feedback',
            title: 'Any additional feedback?',
          },
        ],
      },
    ],
  },
};
```

### إنشاء استطلاع على نطاق العنصر

```typescript
import { SurveyTypeEnum } from '@/lib/types/survey';

const itemSurvey: CreateSurveyData = {
  title: 'Product Review',
  type: SurveyTypeEnum.ITEM,
  itemId: 'my-tool-slug',
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'quality',
            title: 'Rate this product',
          },
        ],
      },
    ],
  },
};
```

### تصفية المسوحات

```typescript
import type { SurveyFilters } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const filters: SurveyFilters = {
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.PUBLISHED,
  page: 1,
  limit: 10,
};
```

### تقديم الرد

```typescript
import type { SubmitResponseData } from '@/lib/types/survey';

const response: SubmitResponseData = {
  surveyId: 'survey-uuid-123',
  userId: 'user-uuid-456',
  data: {
    satisfaction: 4,
    feedback: 'The platform is easy to use!',
  },
};
```

### تصفية الاستجابات حسب النطاق الزمني

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## ملاحظات التصميم

### التكامل Survey.js

يستخدم الحقل `surveyJson` النوع `any` لقبول تعريفات Survey.js JSON. Survey.js هي مكتبة تابعة لجهة خارجية تُعرّف الاستطلاعات على أنها كائنات JSON تصف الصفحات والعناصر وتكوينها. يقوم القالب بتخزين JSON كما هو ويعرضه باستخدام مكون Survey.js React.

### دورة حياة المسح

1. **مسودة** - يتم إنشاء الاستطلاع ويمكن تحريره بحرية
2. **تم النشر** - الاستطلاع مباشر؛ يمكن تقديم الردود
3. **مغلق** - يتوقف الاستطلاع عن قبول الإجابات؛ يتم الحفاظ على البيانات الموجودة

### المسوحات العالمية مقابل العناصر

- **الاستطلاعات العامة** (`SurveyTypeEnum.GLOBAL`) تظهر على مستوى الموقع وليست مرتبطة بأي عنصر
- **استطلاعات العناصر** (`SurveyTypeEnum.ITEM`) تظهر في صفحات تفاصيل عناصر محددة وتتطلب `itemId`

يتحكم الحقل `ItemData.showSurveys` (من `item.ts`) في ما إذا كان سيتم عرض قسم الاستطلاعات في صفحة العنصر.

## الأنواع ذات الصلة

- [`ItemData.showSurveys`](./item-types.md) - يتحكم في رؤية الاستطلاع لكل عنصر
- [`ItemData.action`](./item-types.md) - يرتبط الإجراء `'start-survey'` بالاستطلاع
