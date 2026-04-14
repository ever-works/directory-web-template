---
id: vote-types
title: تعريفات نوع التصويت
sidebar_label: أنواع التصويت
sidebar_position: 5
---

# تعريفات نوع التصويت

**المصدر:** `lib/types/vote.ts`

يسمح نظام التصويت للمستخدمين بالتصويت لصالح العناصر. تحدد هذه الوحدة مخطط بيانات التصويت باستخدام Zod للتحقق من صحة وقت التشغيل، إلى جانب الاستجابة والخطأ وأنواع الحالة من جانب العميل.

## مخطط زود

### `voteSchema`

مخطط بيانات التصويت الأساسي المحدد باستخدام Zod. يعمل هذا كمدقق وقت التشغيل ومصدر لنوع TypeScript `Vote`.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## أنواع

### `Vote`

نوع بيانات التصويت، المستنتج من `voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

هذا يقرر ما يلي:

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`id`|`string`|معرف التصويت الفريد|
|`userId`|`string`|معرف المستخدم الذي أدلى بالتصويت|
|`itemId`|`string`|معرف أو سبيكة من العنصر الذي تم التصويت عليه|
|`createdAt`|`Date`|الطابع الزمني عندما تم التصويت|

### `VoteResponse`

تم إرجاع استجابة واجهة برمجة التطبيقات (API) بعد عملية تبديل التصويت.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`success`|`boolean`|ما إذا كانت العملية قد تمت بنجاح|
|`voteCount`|`number`|تم تحديث إجمالي عدد الأصوات لهذا العنصر|
|`hasVoted`|`boolean`|ما إذا كان المستخدم الحالي قد قام بالتصويت بعد العملية|
|`message`|`string?`|رسالة الحالة الاختيارية|

### `VoteError`

بنية الاستجابة للخطأ لعمليات التصويت الفاشلة.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`error`|`string`|رسالة خطأ يمكن قراءتها بواسطة الإنسان|
|`code`|`string?`|رمز خطأ يمكن قراءته آليًا للتعامل البرمجي|

### `VoteState`

حالة جانب العميل لمكون واجهة مستخدم التصويت. يُستخدم مع خطافات React لإدارة حالة التصويت في المتصفح.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`voteCount`|`number`|يتم عرض إجمالي عدد الأصوات الحالي للمستخدم|
|`hasVoted`|`boolean`|ما إذا كان المستخدم الحالي قد قام بالتصويت (حالة زر التحكم)|
|`isLoading`|`boolean`|ما إذا كانت عملية التصويت قيد التقدم (تعطيل الزر)|
|`error`|`string?`|رسالة الخطأ التي سيتم عرضها، إن وجدت|

## أمثلة الاستخدام

### التحقق من صحة بيانات التصويت مع Zod

```typescript
import { voteSchema } from '@/lib/types/vote';

const rawData = {
  id: 'vote-123',
  userId: 'user-456',
  itemId: 'my-tool',
  createdAt: new Date(),
};

const result = voteSchema.safeParse(rawData);
if (result.success) {
  console.log('Valid vote:', result.data);
} else {
  console.error('Invalid vote data:', result.error.issues);
}
```

### إدارة حالة التصويت في مكون React

```typescript
import type { VoteState, VoteResponse } from '@/lib/types/vote';
import { useState } from 'react';

function useVote(initialCount: number, initialVoted: boolean) {
  const [state, setState] = useState<VoteState>({
    voteCount: initialCount,
    hasVoted: initialVoted,
    isLoading: false,
  });

  async function toggleVote(itemId: string) {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const res = await fetch(`/api/items/${itemId}/vote`, {
        method: 'POST',
      });
      const data: VoteResponse = await res.json();

      if (data.success) {
        setState({
          voteCount: data.voteCount,
          hasVoted: data.hasVoted,
          isLoading: false,
        });
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to toggle vote',
      }));
    }
  }

  return { ...state, toggleVote };
}
```

### معالجة أخطاء التصويت

```typescript
import type { VoteError } from '@/lib/types/vote';

function handleVoteError(error: VoteError) {
  switch (error.code) {
    case 'UNAUTHORIZED':
      // Redirect to login
      break;
    case 'RATE_LIMITED':
      // Show rate limit message
      break;
    default:
      // Show generic error
      console.error(error.error);
  }
}
```

## ملاحظات التصميم

### تبديل السلوك

يستخدم نظام التصويت نمط تبديل: يؤدي استدعاء نقطة نهاية التصويت لعنصر ما إلى إضافة تصويت المستخدم أو إزالته. يشير الحقل `VoteResponse.hasVoted` إلى الحالة الجديدة بعد التبديل.

### تكامل Zod + TypeScript

النوع `Vote` مشتق من مخطط Zod بدلاً من تعريفه بشكل منفصل. وهذا يضمن أن التحقق من صحة وقت التشغيل والتحقق من نوع وقت الترجمة يستخدمان نفس التعريف:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### فصل حالة العميل والخادم

- `Vote` يمثل سجل قاعدة البيانات
- `VoteResponse` هي استجابة API بعد حدوث طفرة
- `VoteState` هي حالة واجهة المستخدم من جانب العميل
- `VoteError` هو هيكل الاستجابة للخطأ

يؤدي هذا الفصل إلى إبقاء المخاوف واضحة بين طبقة البيانات وطبقة API وطبقة واجهة المستخدم.

## الأنواع ذات الصلة

- [`Comment`](./comment-types.md) - نوع آخر لتفاعل المستخدم لكل عنصر
- [`ItemData`](./item-types.md) - العنصر الأصلي الذي ينتمي إليه التصويت
