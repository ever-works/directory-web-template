---
id: type-definitions
title: הקלד סקירת מערכת
sidebar_label: סוג הגדרות
sidebar_position: 41
---

# הקלד סקירת מערכת

התבנית מרכזת את הגדרות סוג ה-TypeScript שלה ב-`template/lib/types/`. ספרייה זו מכילה ממשקים, כינויים של סוגים, סכימות אימות Zod ו-DTOs לבקש/תגובה המשמשים במאגרים, שירותים ומסלולי API.

**ספריית מקור:** `template/lib/types/`

---

## Directory Listing

| File | Purpose |
|------|---------|
| `item.ts` | Item data model, create/update/review requests, list options, status types |
| `user.ts` | Authentication user data, create/update requests, Zod validation schemas, list options |
| `role.ts` | Role data model, create/update requests, list options, role-with-count type |
| `tag.ts` | Tag data model, create/update requests, paginated list response |
| `category.ts` | Category data model with count, create/update requests, validation constants, list options |
| `comment.ts` | Comment data structures |
| `vote.ts` | Vote data structures |
| `client.ts` | Client profile types |
| `client-item.ts` | Client-facing item types |
| `profile.ts` | User profile types |
| `survey.ts` | Survey data structures |
| `location.ts` | Location/geography types |
| `sponsor-ad.ts` | Sponsor and advertisement types |
| `twenty-crm-config.types.ts` | Twenty CRM integration configuration types |
| `twenty-crm-entities.types.ts` | Twenty CRM entity model types |
| `twenty-crm-errors.types.ts` | Twenty CRM error handling types |
| `twenty-crm-sync.types.ts` | Twenty CRM synchronization types |

---

## סוגי תחום ליבה

### סוגי פריטים (`item.ts`)

מערכת סוגי הפריטים היא הנרחבת ביותר, המכסה את מחזור החיים המלא של רישום ספריות.

**סוגי מפתחות:**

- **`ItemData`** -- מודל נתוני הפריט הראשי עם שדות עבור `id`, `name`, `slug`, `description`, `source_url`, `status`@0, @@TOK006@@@0, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at`, ועוד
- **`CreateItemRequest`** -- DTO ליצירת פריט; דורש `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** -- DTO חלקי לעדכוני פריט; כל השדות אופציונליים
- **`ReviewRequest`** -- מכיל `status` (`'approved'` או `'rejected'`) ואופציונלי `review_notes`
- **`ItemListOptions`** -- אפשרויות סינון ועימוד: `status`, `categories`, `tags`, `submittedBy`, `search`, @@@TOK006@@K@, @0@TO@@0@0, @0@@@0

### סוגי משתמשים (`user.ts`)

סוגי משתמשים ברמת אימות עם סכימות אימות Zod.

**סוגי מפתחות:**

- **`AuthUserData`** -- מייצג רשומת משתמש מאומתת (מזהה, אימייל, create_at וכו')
- **`CreateUserRequest`** -- דוא"ל וסיסמה ליצירת משתמש
- **`UpdateUserRequest`** -- שדות עדכון חלקיים
- **`UserListOptions`** -- אפשרויות עימוד וסינון
- **`AuthUserListResponse`** -- תגובה מעומדת עם `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** -- סכימת Zod עבור אימות מלא של יצירת משתמש
- **`updateUserValidationSchema`** -- סכימת Zod עבור אימות חלקי של עדכוני משתמש

### סוגי תפקידים (`role.ts`)

סוגי נתוני תפקידים עבור מערכת RBAC.

**סוגי מפתחות:**

- **`RoleData`** -- שיא תפקידים עם `id`, `name`, `description`, `permissions`, `isDefault`, `status`, חותמות זמן
- **`CreateRoleRequest`** -- שדות הדרושים ליצירת תפקיד חדש
- **`UpdateRoleRequest`** -- עדכון תפקיד חלקי
- **`RoleListOptions`** -- אפשרויות סינון כולל `status`, חיפוש ועימוד
- **`RoleWithCount`** -- מרחיב את `RoleData` עם `userCount` לתצוגת מנהל מערכת

### סוגי תגים (`tag.ts`)

סוגי נתוני תגים עבור מערכת התיוג/תיוג.

**סוגי מפתחות:**

- **`TagData`** -- רשומת תג עם `id`, `name`, ומטא נתונים אופציונליים
- **`CreateTagRequest`** -- דורש `id` ו-`name`
- **`UpdateTagRequest`** -- עדכון תג חלקי
- **`TagListResponse`** -- רשימת תגים מעומדת עם `tags`, `total`, `page`, `limit`, `totalPages`

### סוגי קטגוריות (`category.ts`)

סוגי נתוני קטגוריות עבור הטקסונומיה הארגונית.

**סוגי מפתחות:**

- **`CategoryData`** -- רשומת קטגוריה עם `id`, `name`, `description`, ומטא נתונים
- **`CategoryWithCount`** -- מרחיב את `CategoryData` עם ספירת פריטים
- **`CreateCategoryRequest`** -- דורש `id`, `name`, אופציונלי `description`
- **`UpdateCategoryRequest`** -- עדכון קטגוריה חלקי (דורש `id`)
- **`CategoryListOptions`** -- אפשרויות סינון, מיון ועימוד
- **`CATEGORY_VALIDATION`** -- קבועים עבור אימות אורך שדה (שם מינימום/מקסימום, מקסימום תיאור, אילוצי מזהה)

---

## Integration Types

### Twenty CRM Types

Four files define the type system for the Twenty CRM integration:

| File | Contents |
|------|----------|
| `twenty-crm-config.types.ts` | Configuration types for CRM connection settings |
| `twenty-crm-entities.types.ts` | Entity models mapping to CRM objects |
| `twenty-crm-errors.types.ts` | Error types for CRM API error handling |
| `twenty-crm-sync.types.ts` | Synchronization state and operation types |

---

## מוסכמות דפוסי סוג

### DTOs בקשה/תשובה

בסיס הקוד עוקב אחר דפוס עקבי עבור אובייקטי העברת נתונים:

- **`Create[Entity]Request`** -- מכיל את כל השדות הנדרשים ליצירה
- **`Update[Entity]Request`** -- סוג חלקי שבו רוב השדות הם אופציונליים; בדרך כלל דורש `id`
- **`[Entity]ListOptions`** -- פרמטרים של סינון, מיון ועימוד
- **`[Entity]ListResponse`** -- תגובה מעומדת עם `items`, `total`, `page`, `limit`, `totalPages`

### סכימות אימות

סכימות Zod ממוקמות יחד עם הסוגים התואמים להן:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

מאגרים משתמשים ב-@@TOK000@@@ או `.pick()` בסכמות אלו לפני ביצוע מוטציות.

### קבועי אימות

עבור ישויות מגובות Git (קטגוריות, אוספים), קבועי אימות מיוצאים כאובייקטים פשוטים:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

אלה מוזכרים בשיטות אימות המאגר.

---

## Type Relationships

```
ItemData
  ├── references CategoryData (via category field)
  ├── references TagData (via tags field)
  ├── references Collection (via collections field)
  └── referenced by ClientDashboardRepository

AuthUserData
  ├── references RoleData (via role assignments)
  └── referenced by UserRepository

RoleData
  ├── contains Permission[] (from permissions/definitions)
  └── referenced by RoleRepository

CategoryData
  └── referenced by items (category field)

TagData
  └── referenced by items (tags field)
```

---

## הנחיות שימוש

1. **תמיד ייבא סוגים מ-`@/lib/types/`** במקום להכריז עליהם מחדש ברכיבים או בנתיבי API
2. **השתמש ב-DTOs של בקשה** עבור אימות קלט של מטפל API, לא במודל הנתונים המלא
3. **השתמש בסכימות Zod** היכן שזמינות (סוגי משתמשים) לאימות זמן ריצה
4. **השתמש בקבועי אימות** (קטגוריות, אוספים) לאילוצי שדה עקביים ב-frontend ו-backend
5. **הרחבת סוגים מקומית** רק כאשר אתה צריך טיפוסים נגזרים ספציפיים לרכיבים שאינם שייכים לשכבה המשותפת

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
