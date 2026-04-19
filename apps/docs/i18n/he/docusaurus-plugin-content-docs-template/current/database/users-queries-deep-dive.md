---
id: users-queries-deep-dive
title: שאילתות משתמש Deep Dive
sidebar_label: שאילתות משתמש Deep Dive
sidebar_position: 61
---

# שאילתות משתמש Deep Dive

התייחסות מקיפה לכל פונקציות שאילתת מסד הנתונים הקשורות למשתמש, כולל חיפוש משתמשים, עוזרי אימות, בדיקות תפקידי מנהל וכלי עזר לניהול פרופיל לקוח.

## סקירה כללית

שכבת שאילתת המשתמש מפוצלת על פני מספר מודולים:

- **`user.queries.ts`** -- פעולות CRUD של משתמש ליבה, חיפושי אימות ובדיקות מנהל
- **`client.queries.ts`** -- ניהול פרופיל לקוח, חיפוש, סטטיסטיקה ופעולות חשבון
- **`utils.ts`** -- כלי עזר משותפים ליצירת שמות משתמש ועיבוד דוא"ל
- **`auth.queries.ts`** -- איפוס סיסמה וניהול אסימון אימות בדוא"ל

## קבצי מקור

```
lib/db/queries/user.queries.ts
lib/db/queries/client.queries.ts (profile CRUD section)
lib/db/queries/utils.ts
lib/db/queries/auth.queries.ts
```

---

## Function Reference: user.queries.ts

### `getUserByEmail`

Looks up a user by their email address. Includes a guard for missing `DATABASE_URL`.

```typescript
async function getUserByEmail(email: string): Promise<User | null>
```

**Parameters:**

| Parameter | Type     | Required | Description |
|-----------|----------|----------|-------------|
| `email`   | `string` | Yes      | User email  |

**Returns:** `Promise<User | null>` -- User object or `null` if not found or database unavailable

**SQL Pattern:**

```sql
SELECT * FROM users WHERE email = ? LIMIT 1;
```

**Performance Notes:**
- Checks `DATABASE_URL` env var before querying; returns `null` immediately if unset
- Uses `.limit(1)` for efficient single-row retrieval
- Logs warnings for missing users and database errors

---

### `getUserById`

מחפש משתמש לפי תעודת הזהות שלו.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|-----------|----------|----------|-------------|
|`id`|`string`|כן|מזהה משתמש|

**מחזירות:** `Promise<User | null>` -- אובייקט משתמש או `null` אם לא נמצא

**דפוס SQL:**

```sql
SELECT * FROM users WHERE id = ? LIMIT 1;
```

---

### `insertNewUser`

Creates a new user record.

```typescript
async function insertNewUser(user: NewUser): Promise<User[]>
```

**Parameters:**

| Parameter | Type      | Required | Description     |
|-----------|-----------|----------|-----------------|
| `user`    | `NewUser` | Yes      | New user data   |

**Returns:** `Promise<User[]>` -- Array containing the created user (via `RETURNING`)

**SQL Pattern:**

```sql
INSERT INTO users (...) VALUES (...) RETURNING *;
```

---

### `updateUserPassword`

מעדכן את ה-hash של סיסמת המשתמש.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|כן|hash חדש של bcrypt|
|`userId`|`string`|כן|מזהה משתמש יעד|

**דפוס SQL:**

```sql
UPDATE users SET password_hash = ? WHERE id = ?;
```

---

### `updateUser`

Updates user details (currently limited to email).

```typescript
async function updateUser(
  values: Pick<NewUser, 'email'>,
  userId: string
): Promise<void>
```

**Parameters:**

| Parameter | Type                       | Required | Description      |
|-----------|----------------------------|----------|------------------|
| `values`  | `Pick<NewUser, 'email'>`   | Yes      | Fields to update |
| `userId`  | `string`                   | Yes      | Target user ID   |

---

### `updateUserVerification`

מגדיר או מנקה את חותמת הזמן של אימות הדוא"ל עבור משתמש.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|------------|-----------|----------|------------------------|
|`email`|`string`|כן|דוא"ל משתמש|
|`verified`|`boolean`|כן|סטטוס אימות|

**דפוס SQL:**

```sql
UPDATE users SET email_verified = CASE WHEN ? THEN NOW() ELSE NULL END
WHERE email = ?;
```

---

### `softDeleteUser`

Soft deletes a user by setting `deletedAt` and mangling the email to prevent reuse.

```typescript
async function softDeleteUser(userId: string): Promise<void>
```

**Parameters:**

| Parameter | Type     | Required | Description  |
|-----------|----------|----------|--------------|
| `userId`  | `string` | Yes      | User ID      |

**SQL Pattern:**

```sql
UPDATE users
SET deleted_at = CURRENT_TIMESTAMP,
    email = CONCAT(email, '-', id, '-deleted')
WHERE id = ?;
```

**Design Note:** The email is mangled with the user ID and a `-deleted` suffix to free up the original email address for potential re-registration while maintaining audit traceability.

---

### `updateClientProfileName`

מעדכן את השם בפרופיל לקוח.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|-----------|----------|----------|--------------|
|`userId`|`string`|כן|מזהה משתמש|
|`name`|`string`|כן|שם חדש|

---

### `isUserAdmin`

Checks if a user has an active admin role by joining `userRoles` with `roles`.

```typescript
async function isUserAdmin(userId: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type     | Required | Description  |
|-----------|----------|----------|--------------|
| `userId`  | `string` | Yes      | User ID      |

**Returns:** `Promise<boolean>` -- `true` if user has an active admin role

**SQL Pattern:**

```sql
SELECT roles.is_admin FROM user_roles
INNER JOIN roles ON user_roles.role_id = roles.id
WHERE user_roles.user_id = ?
  AND roles.is_admin = true
  AND roles.status = 'active'
LIMIT 1;
```

**Performance Notes:**
- Uses `INNER JOIN` for efficient filtering
- Checks both `isAdmin` flag and `active` status
- Returns `false` silently when `DATABASE_URL` is not set

---

## הפניה לפונקציה: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

מאחזר אסימון איפוס סיסמה בדוא"ל. מחזיר את רשומת האסימון או `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

מאחזר אסימון איפוס סיסמה על ידי מחרוזת האסימון עצמה.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

מוחק אסימון לאיפוס סיסמה לאחר צריכתו.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

מאחזר אסימון אימות דוא"ל בדוא"ל.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

מאחזר אסימון אימות דוא"ל לפי מחרוזת האסימון.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

מוחק אסימון אימות לאחר צריכתו.

---

## Function Reference: utils.ts

### `extractUsernameFromEmail`

Safely extracts a username from an email address.

```typescript
function extractUsernameFromEmail(email: string): string | null
```

**Rules:**
- Splits email at `@` and takes the local part
- Removes invalid characters (keeps `a-zA-Z0-9._-`)
- Truncates to 30 characters
- Normalizes to lowercase
- Returns `null` for malformed input

### `ensureUniqueUsername`

Generates a unique username by appending numeric suffixes if needed.

```typescript
async function ensureUniqueUsername(baseUsername: string): Promise<string>
```

**Behavior:**
- Checks if `baseUsername` is available in `clientProfiles`
- If taken, tries `baseUsername1`, `baseUsername2`, etc.
- Fails after 1000 attempts with an error

---

## הערות ביצועים

1. **DATABASE_URL guard** -- `getUserByEmail`, `getUserById`, ו-`isUserAdmin` בדוק את `DATABASE_URL` לפני השאילתה. זה מאפשר ליישום להתדרדר בחן כאשר לא מוגדר מסד נתונים.

2. **דפוס מחיקה רך** -- `softDeleteUser` משתמש בטיפול בדוא"ל במקום במחיקה פיזית, שומר על שלמות ההתייחסות בכל המערכת.

3. **בדיקת תפקידים** -- `isUserAdmin` משתמש בשאילתת JOIN אחת ולא במספר חיפושים, בודק הן את דגל הניהול והן את המצב הפעיל בפעולה אחת.

## דוגמאות לשימוש

### בדיקת גישת מנהל בתוכנת האמצע

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### זרימת רישום משתמש

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
