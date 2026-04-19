---
id: types-overview
title: הקלד סקירת מערכת
sidebar_label: סקירה כללית
sidebar_position: 0
---

# הקלד סקירת מערכת

התבנית משתמשת במערכת מקיפה מסוג TypeScript הממוקמת ב-`lib/types/`. הגדרות סוגים אלה משמשות כמקור האמת היחיד למבני נתונים המשמשים בנתיבי API, שירותים, מאגרים ורכיבי ממשק משתמש.

## הקלד קבצים

הספרייה `lib/types/` מכילה את המודולים הבאים:

|קובץ|תיאור|
|------|-------------|
|`item.ts`|נתוני פריטים, בקשות CRUD, אפשרויות רשימה, קבועי אימות והגדרות סטטוס|
|`user.ts`|נתוני משתמש של מנהל מערכת, סוגי אימות, סכימות אימות Zod ופונקציות מסייעות|
|`profile.ts`|מבנה פרופיל משתמש ציבורי כולל קישורים חברתיים, מיומנויות, תיק עבודות והגשות|
|`category.ts`|נתוני קטגוריה, בקשות CRUD, אפשרויות רשימה וקבועי אימות|
|`comment.ts`|סוגי הערות שנגזרו מסכימת מסד הנתונים, כולל הערות מועשרות על ידי משתמשים|
|`vote.ts`|סכימת הצבעה (Zod), סוגי תגובות, סוגי שגיאות ומצב הצבעה בצד הלקוח|
|`survey.ts`|סוגי תגובות לסקר וסקר, אפשרויות סינון וספי סטטוס/סוג|
|`location.ts`|הגדרות מיקום, סוגי שאילתות גיאוגרפיות, סוגי ספקי מפות ונתוני תיאום|
|`sponsor-ad.ts`|סוגי פרסומות של חסות כולל בקשות, תגובות, נתונים סטטיסטיים ונתוני לוח מחוונים|
|`client.ts`|סוגי פרופילי לקוח עבור הפורטל הפונה ללקוח, כולל לוח מחוונים וסטטיסטיקה|
|`client-item.ts`|סוגי הגשת פריטים בצד הלקוח עם מדדי מעורבות ומסנני סטטוס|
|`role.ts`|סוגי תפקידים והרשאות עבור מערכת RBAC|
|`tag.ts`|נתוני תגים, בקשות CRUD, אפשרויות רשימה וקבועי אימות|
|`twenty-crm-config.types.ts`|עשרים סוגי תצורת אינטגרציית CRM ובדיקות חיבור|
|`twenty-crm-entities.types.ts`|עשרים סוגי ישויות CRM עבור רשומות אדם וחברות|
|`twenty-crm-errors.types.ts`|סוגי שגיאות מובנים, קודי שגיאה ומגני סוגים עבור שגיאות CRM|
|`twenty-crm-sync.types.ts`|העלאת פעולות, ערכי מטמון וסוגים הקשורים לסנכרון|

## דפוסי אדריכלות

### דפוס CRUD עקבי

רוב סוגי הישויות עוקבים אחר דפוס עקבי של ממשקים:

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### קבועי אימות

כל מודול ישות מייצא אובייקט קבועי אימות באמצעות `as const` לבטיחות סוג:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

קבועים אלה משמשים גם באימות בצד השרת וגם באימות טפסים בצד הלקוח, מה שמבטיח כללים עקביים בכל הערימה.

### תגובות האיגוד המופלות

סוגי תגובות API משתמשים באיגודים מובחנים לטיפול בשגיאות בטוחות מסוג:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

דפוס זה משמש את `SponsorAdResponse`, `ClientResponse`, `ClientListResponse` ואחרים.

### Zod Schema Integration

מספר מודולים משתמשים ב-Zod לאימות זמן ריצה לצד סוגי TypeScript:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

זה משמש ב-`vote.ts` (עבור סכימת ההצבעה) וב-`user.ts` (לאימות משתמש).

### סוגים מורחבים עם מערכות יחסים

סוגים הכוללים נתונים קשורים משתמשים במילת המפתח `extends`:

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## אמנות ייבוא

סוגים מיובאים באמצעות מילת המפתח `type` לייבוא מסוג בלבד:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

זה מבטיח שהסוגים יימחקו בזמן ההידור ואינם משפיעים על גודל החבילה.

## תצורה לעומת סוגי זמן ריצה

מודול המיקום מדגים דפוס המשמש לתצורה:

- **סוגי תצורה** השתמשו ב-`snake_case` כדי להתאים לקובצי התצורה של YAML
- **סוגי זמן ריצה** משתמשים ב-`camelCase` לשימוש אידיומטי ב-TypeScript
- פונקציית מיפוי ממירה בין שני הפורמטים

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## רשימות מצבים ותוויות

ערכי סטטוס מוגדרים כאובייקטים קונסטרוקטיביים עם מיפויי תווית וצבע מתאימים:

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## סוגי מסד נתונים

סוגים מסוימים מוסקים ישירות מסכימת טפטוף ORM:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

גישה זו מבטיחה שהסוגים יישארו מסונכרנים עם העברות מסדי נתונים באופן אוטומטי.

## תיעוד קשור

- [סוגי פריט](./item-types.md) - מבני נתונים של פריט ליבה
- [סוגי משתמש](./user-types.md) - אימות משתמש וסוגי פרופיל
- [סוגי קטגוריות](./category-types.md) - סוגי ניהול קטגוריות
- [סוגי תגובות](./comment-types.md) - סוגי הערות וביקורות
- [סוגי הצבעה](./vote-types.md) - סוגי מערכות הצבעה
- [סוגי סקר](./survey-types.md) - סוגי סקר ותגובות
- [סוגי מיקום](./location-types.md) - מיקום גיאוגרפי וסוגי מפות
- [סוגי מודעות חסות](./sponsor-ad-types.md) - סוגי חסות ופרסום
- [סוגי CRM](./crm-types.md) - עשרים סוגי אינטגרציה של CRM
