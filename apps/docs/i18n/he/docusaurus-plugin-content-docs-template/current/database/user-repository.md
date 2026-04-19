---
id: user-repository
title: מאגר משתמשים
sidebar_label: מאגר משתמשים
sidebar_position: 17
---

# מאגר משתמשים

המחלקה `UserRepository` מספקת את שכבת הגישה לנתונים עבור רשומות משתמש ברמת האימות. זה עוטף `UserDbService` אימות (באמצעות סכימות Zod), בדיקות ייחודיות וטיפול עקבי בשגיאות.

**קובץ מקור:** `template/lib/repositories/user.repository.ts`

---

## Architecture Overview

```
API Route / Server Action
        |
  UserRepository           <-- validation, uniqueness checks, error wrapping
        |
  UserDbService            <-- database CRUD via Drizzle ORM
        |
  PostgreSQL / SQLite      <-- users table
```

Unlike the Git-backed repositories (items, tags, categories), the User Repository operates directly against the relational database through `UserDbService`.

---

## הגדרת כיתה

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### תלות

|ייבוא|מטרה|
|--------|---------|
|`UserDbService`|שירות מסד נתונים עבור פעולות CRUD של משתמשים|
|`AuthUserData`|סוג המייצג רשומת משתמש מאומתת|
|`CreateUserRequest` / `UpdateUserRequest`|בקש DTOs ליצירה ולעדכון|
|`UserListOptions`|אפשרויות סינון ועימוד|
|`AuthUserListResponse`|סוג תגובה עם עימוד|
|`userValidationSchema` / `updateUserValidationSchema`|סכימות אימות Zod|

---

## Query Methods

### `findAll(options?): Promise<AuthUserListResponse>`

Returns a paginated list of users with optional filtering.

```ts
async findAll(options: UserListOptions = {}): Promise<AuthUserListResponse>
```

**Return type:**

```ts
interface AuthUserListResponse {
  users: AuthUserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Delegates to `userDbService.findUsers(options)` and maps the result into the standard paginated response shape. Wraps all database errors with a generic "Failed to retrieve users" message.

---

### `findById(id): Promise<AuthUserData | null>`

מאחזר משתמש בודד לפי המזהה הייחודי שלו.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

מחזירה `null` כאשר אין משתמש תואם.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

מחזיר נתונים סטטיסטיים מצטברים של משתמשים.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

נציגים אל `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

בודק אם כתובת אימייל כבר נמצאת בשימוש. מבצע השוואה לא תלוית רישיות על ידי טעינת כל המשתמשים וסינון בזיכרון.

```ts
async emailExists(email: string, excludeId?: string): Promise<boolean>
```

---

## Mutation Methods

### `create(data): Promise<AuthUserData>`

Creates a new user after validation and uniqueness enforcement.

```ts
async create(data: CreateUserRequest): Promise<AuthUserData>
```

**Processing steps:**

1. Validates `email` and `password` fields using `userValidationSchema.pick(...)` (Zod)
2. Checks email uniqueness via `userDbService.emailExists`
3. Creates the user record through `userDbService.createUser`

Throws an `Error("Email already in use")` if the email is taken.

---

### `update(id, data): Promise<AuthUserData>`

מעדכן משתמש קיים לאחר אימות ובדיקת קיום.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**שלבי עיבוד:**

1. מאמת קלט עם `updateUserValidationSchema.parse(data)` (זוד)
2. מאמת שהמשתמש קיים באמצעות `findById`
3. מחיל את העדכון דרך `userDbService.updateUser`

זורק `Error("User not found")` אם משתמש היעד אינו קיים.

---

### `delete(id): Promise<void>`

Permanently deletes a user record.

```ts
async delete(id: string): Promise<void>
```

**Processing steps:**

1. Verifies the user exists via `findById`
2. Deletes through `userDbService.deleteUser`

Throws an `Error("User not found")` if the target does not exist.

> **Note:** Role-based deletion checks are handled at the profile level since `AuthUserData` contains only authentication information.

---

## דפוס טיפול בשגיאות

כל השיטות הציבוריות עוקבות אחר אסטרטגיית טיפול עקבית בשגיאות:

```ts
try {
  // ... operation ...
} catch (error) {
  if (error instanceof Error) {
    throw error;           // Re-throw domain errors (validation, not-found)
  }
  console.error('Error [operation]:', error);
  throw new Error('Failed to [operation]');  // Generic fallback
}
```

זה מבטיח שגיאות ספציפיות לדומיין (דוא"ל נלקח, המשתמש לא נמצא) מתפשטות בצורה נקייה לנתיבי API בעוד שגיאות בלתי צפויות נרשמות ומוחלפות בהודעות בטוחות.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## דוגמה לשימוש

```ts
import { UserRepository } from '@/lib/repositories/user.repository';

const userRepo = new UserRepository();

// List users with pagination
const result = await userRepo.findAll({ page: 1, limit: 25 });

// Create a new user
const newUser = await userRepo.create({
  email: 'new@example.com',
  password: 'securePassword123',
});

// Check availability
const taken = await userRepo.emailExists('test@example.com');

// Get statistics
const stats = await userRepo.getStats();
// => { total: 150, active: 142, inactive: 8 }
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/services/user-db.service.ts` | Underlying database service |
| `lib/types/user.ts` | Type definitions and Zod schemas |
| `lib/db/drizzle.ts` | Database connection and Drizzle instance |
| `lib/repositories/role.repository.ts` | Role management (related to user permissions) |
