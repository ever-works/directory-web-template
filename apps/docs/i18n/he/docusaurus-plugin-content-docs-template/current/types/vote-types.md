---
id: vote-types
title: הגדרות סוג הצבעה
sidebar_label: סוגי הצבעות
sidebar_position: 5
---

# הגדרות סוג הצבעה

**מקור:** `lib/types/vote.ts`

מערכת ההצבעה מאפשרת למשתמשים להצביע בעד פריטים. מודול זה מגדיר את סכימת נתוני ההצבעה באמצעות Zod עבור אימות זמן ריצה, יחד עם סוגי תגובה, שגיאה ומצבים בצד הלקוח.

## Zod Schema

### `voteSchema`

סכימת נתוני ההצבעה הקנונית שהוגדרה עם Zod. זה משמש גם כמאמת זמן הריצה וגם כמקור לסוג `Vote` TypeScript.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## סוגים

### `Vote`

סוג נתוני ההצבעה, המוסיק מ-`voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

זה פותר ל:

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`id`|`string`|מזהה הצבעה ייחודי|
|`userId`|`string`|תעודת זהות של המשתמש שהצביע|
|`itemId`|`string`|תעודת זהות או שבלול של הפריט שהוצבע|
|`createdAt`|`Date`|חותמת זמן מתי התקבלה ההצבעה|

### `VoteResponse`

תגובת API הוחזרה לאחר פעולת החלפת הצבעה.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`success`|`boolean`|האם הפעולה הסתיימה בהצלחה|
|`voteCount`|`number`|מספר ההצבעות הכולל מעודכן עבור הפריט|
|`hasVoted`|`boolean`|האם המשתמש הנוכחי הצביע לאחר הפעולה|
|`message`|`string?`|הודעת סטטוס אופציונלית|

### `VoteError`

מבנה תגובת שגיאה עבור פעולות הצבעה שנכשלו.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`error`|`string`|הודעת שגיאה הניתנת לקריאה על ידי אדם|
|`code`|`string?`|קוד שגיאה קריא במכונה לטיפול פרוגרמטי|

### `VoteState`

מצב בצד הלקוח עבור רכיב ממשק המשתמש של הצבעה. משמש עם React hooks לניהול מצב ההצבעה בדפדפן.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`voteCount`|`number`|ספירת הקולות הכוללת הנוכחית המוצגת למשתמש|
|`hasVoted`|`boolean`|האם המשתמש הנוכחי הצביע (שולט על מצב הלחצן)|
|`isLoading`|`boolean`|האם מתבצעת פעולת הצבעה (משבית את הכפתור)|
|`error`|`string?`|הודעת שגיאה להצגה, אם בכלל|

## דוגמאות לשימוש

### אימות נתוני הצבעה עם Zod

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

### ניהול מצב הצבעה ברכיב React

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

### טיפול בשגיאות הצבעה

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

## הערות עיצוב

### החלף התנהגות

מערכת ההצבעה משתמשת בדפוס החלפת מצב: קריאה לנקודת קצה ההצבעה עבור פריט מוסיפה או מסירה את ההצבעה של המשתמש. השדה `VoteResponse.hasVoted` מציין את המצב החדש לאחר החלפה.

### שילוב Zod + TypeScript

הסוג `Vote` נגזר מסכימת Zod במקום להיות מוגדר בנפרד. זה מבטיח שאימות זמן ריצה ובדיקת סוג זמן קומפילציה משתמשים באותה הגדרה:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### הפרדת מצב לקוח-שרת

- `Vote` מייצג את רשומת מסד הנתונים
- `VoteResponse` היא תגובת ה-API לאחר מוטציה
- `VoteState` הוא מצב ממשק המשתמש בצד הלקוח
- `VoteError` הוא מבנה תגובת השגיאה

הפרדה זו שומרת על חששות ברורים בין שכבת הנתונים, שכבת ה-API ושכבת ממשק המשתמש.

## סוגים קשורים

- [`Comment`](./comment-types.md) - סוג אינטראקציה אחר של משתמש לכל פריט
- [`ItemData`](./item-types.md) - פריט האב שההצבעה שייכת לו
