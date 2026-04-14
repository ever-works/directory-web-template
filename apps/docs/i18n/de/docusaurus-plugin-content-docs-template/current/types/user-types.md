---
id: user-types
title: Benutzer- und Profiltypdefinitionen
sidebar_label: Benutzertypen
sidebar_position: 2
---

# Benutzer- und Profiltypdefinitionen

**Quelle:** `lib/types/user.ts` und `lib/types/profile.ts`

Diese Module definieren Typen für Admin-Benutzer (Authentifizierung und Verwaltung) und öffentliche Benutzerprofile (Anzeige und Portfolio).

## Benutzertypen (`user.ts`)

### Geben Sie Aliase ein

#### `UserStatus`

```typescript
type UserStatus = 'active' | 'inactive';
```

### Schnittstellen

#### `AuthUserData`

Nur zur Authentifizierung dienende Benutzerdaten, die in der Tabelle `users` gespeichert sind. Dies ist die minimale Benutzerdarstellung, die für Authentifizierungsflüsse verwendet wird.

```typescript
interface AuthUserData {
  id: string;
  email: string;
  username?: string;
  name?: string;
  title?: string;
  avatar?: string;
  role?: string;
  roleName?: string;
  status?: UserStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
```

#### `UserData`

Vollständige Benutzerdaten, einschließlich Profilinformationen von `clientProfiles`. Dies ist die vollständige Benutzerdarstellung, die im gesamten Admin-Dashboard verwendet wird.

```typescript
interface UserData {
  id: string;
  username: string;
  email: string;
  name: string;
  title?: string;
  avatar?: string;
  role: string;
  roleName?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
}
```

**Unterschied zu `AuthUserData`:** In `UserData` sind `username`, `name`, `role`, `status` und `created_by` alle erforderlich (nicht optional).

#### `CreateUserRequest`

Payload zum Erstellen eines neuen Admin-Benutzers.

```typescript
interface CreateUserRequest {
  username: string;
  email: string;
  name: string;
  title?: string;
  avatar?: string;
  role: string;
  password: string;
}
```

#### `UpdateUserRequest`

Nutzlast zum Aktualisieren eines vorhandenen Benutzers. Alle Felder sind optional.

```typescript
interface UpdateUserRequest {
  username?: string;
  email?: string;
  name?: string;
  title?: string;
  avatar?: string;
  role?: string;
  status?: UserStatus;
}
```

#### `AuthUserListResponse`

Paginierte Antwort für Authentifizierungsbenutzerlisten.

```typescript
interface AuthUserListResponse {
  users: AuthUserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### `UserListResponse`

Paginierte Antwort für vollständige Benutzerlisten.

```typescript
interface UserListResponse {
  users: UserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### `UserResponse`

Einzelbenutzer-Antwort-Wrapper.

```typescript
interface UserResponse {
  user: UserData;
}
```

#### `UserListOptions`

Abfrageparameter zum Filtern und Paginieren von Benutzerlisten.

```typescript
interface UserListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'username' | 'email' | 'role' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: UserStatus;
}
```

#### `UserWithCount`

Erweiterte Benutzerdaten mit einem optionalen Zählfeld für Statistiken.

```typescript
interface UserWithCount extends UserData {
  count?: number;
}
```

### Zod-Validierungsschemata

#### `userValidationSchema`

Vollständiges Validierungsschema zum Erstellen eines Benutzers:

```typescript
const userValidationSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  title: z.string()
    .max(100, 'Title must be less than 100 characters')
    .optional(),
  role: z.string()
    .min(1, 'Role is required'),
  status: z.enum(['active', 'inactive']).optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, '
      + 'one uppercase letter, and one number'),
});
```

#### `updateUserValidationSchema`

Teilschema für Updates (ohne Passwort):

```typescript
const updateUserValidationSchema = userValidationSchema
  .partial()
  .omit({ password: true });
```

### Validierungskonstanten

```typescript
const USER_VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  TITLE_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 8,
  AVATAR_MAX_SIZE: 2 * 1024 * 1024, // 2MB
  AVATAR_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;
```

### Hilfsfunktionen

#### `isValidUserStatus`

Typschutz, der eine Zeichenfolge auf `UserStatus` einschränkt:

```typescript
function isValidUserStatus(status: string): status is UserStatus {
  return status === 'active' || status === 'inactive';
}
```

#### `generateUserId`

Erzeugt eine UUID für einen neuen Benutzer:

```typescript
function generateUserId(): string {
  return crypto.randomUUID();
}
```

#### `formatDateForYaml`

Formatiert ein `Date` als YAML-kompatible Zeichenfolge (`YYYY-MM-DD HH:mm`):

```typescript
function formatDateForYaml(date: Date = new Date()): string;

// Example: formatDateForYaml(new Date('2025-03-15T10:30:00'))
// => "2025-03-15 10:30"
```

---

## Profile Types (`profile.ts`)

### `Profile`

Public-facing user profile structure used for the profile display page.

```typescript
interface Profile {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  location: string;
  company: string;
  jobTitle: string;
  website: string;
  socialLinks: Array<{
    platform: string;
    url: string;
    displayName: string;
  }>;
  skills: Array<{
    name: string;
    level: number;
  }>;
  interests: string[];
  portfolio: Array<{
    id: string;
    title: Schnur;
    description: string;
    imageUrl: string;
    externalUrl: string;
    tags: string[];
    isFeatured: boolean;
  }>;
  themeColor: string;
  isPublic: boolean;
  memberSince: string;
  submissions: Array<{
    id: string;
    title: Schnur;
    description: string;
    category: string;
    status: 'approved' | 'pending' | 'rejected';
    submittedAt: string;
    updatedAt: string;
    url: string;
    imageUrl?: string;
  }>;
}
```

**Nested types explained:**

- `socialLinks` - Links to external social platforms (GitHub, LinkedIn, Twitter, etc.)
- `skills` - Skill entries with a proficiency `level` (e.g., 1-5 or 1-100)
- `portfolio` - Showcase items with optional featured flag for prominent display
- `submissions` - Items submitted by this user, with their current review status

## Usage Examples

### Creating a user with validation

```typescript
import { userValidationSchema } from '@/lib/types/user';
import type { CreateUserRequest } from '@/lib/types/user';

const input: CreateUserRequest = {
  username: 'johndoe',
  email: 'john@example.com',
  name: 'John Doe',
  role: 'editor',
  password: 'SecurePass1',
};

const result = userValidationSchema.safeParse(input);
if (!result.success) {
  console.error(result.error.flatten());
}
```

### Filtering users

```typescript
import type { UserListOptions } from '@/lib/types/user';

const options: UserListOptions = {
  role: 'editor',
  status: 'active',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  limit: 25,
  search: 'john',
};
```

### Using the profile type

```typescript
import type { Profile } from '@/lib/types/profile';

function renderProfile(profile: Profile) {
  const visibleSkills = profile.skills
    .filter(s => s.level >= 3)
    .sort((a, b) => b.level - a.level);

  const featuredPortfolio = profile.portfolio
    .filter(p => p.isFeatured);

  return { visibleSkills, featuredPortfolio };
}
```

## Related Types

- [`RoleData`](./category-types.md) from `role.ts` defines the roles referenced in `UserData.role`
- [`ClientProfileWithAuth`](./user-types.md) from `lib/db/queries` is the database-level user profile representation
- [`Profile`](#profile) is the public-facing profile, while `UserData` is the admin-facing representation
