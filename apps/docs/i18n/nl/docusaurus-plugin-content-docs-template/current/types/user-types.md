---
id: user-types
title: Definities van gebruikers- en profieltypen
sidebar_label: Gebruikerstypen
sidebar_position: 2
---

# Definities van gebruikers- en profieltypen

**Bron:** `lib/types/user.ts` en `lib/types/profile.ts`

Deze modules definiëren typen voor admin-gebruikers (authenticatie en beheer) en openbare gebruikersprofielen (display en portfolio).

## Gebruikerstypen (`user.ts`)

### Typ aliassen

#### `UserStatus`

```typescript
type UserStatus = 'active' | 'inactive';
```

### Interfaces

#### `AuthUserData`

Gebruikersgegevens met alleen authenticatie opgeslagen in de `users` tabel. Dit is de minimale gebruikersrepresentatie die wordt gebruikt voor verificatiestromen.

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

Volledige gebruikersgegevens inclusief profielinformatie van `clientProfiles`. Dit is de volledige gebruikersrepresentatie die in het beheerdersdashboard wordt gebruikt.

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

**Verschil met `AuthUserData`:** In `UserData`, `username`, `name`, `role`, `status` en `created_by` zijn allemaal vereist (niet-optioneel).

#### `CreateUserRequest`

Payload voor het maken van een nieuwe beheerdersgebruiker.

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

Payload voor het bijwerken van een bestaande gebruiker. Alle velden zijn optioneel.

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

Gepagineerd antwoord voor authenticatiegebruikerslijsten.

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

Gepagineerd antwoord voor volledige gebruikerslijsten.

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

Reactiewrapper voor één gebruiker.

```typescript
interface UserResponse {
  user: UserData;
}
```

#### `UserListOptions`

Queryparameters voor het filteren en pagineren van gebruikerslijsten.

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

Uitgebreide gebruikersgegevens met een optioneel telveld voor statistieken.

```typescript
interface UserWithCount extends UserData {
  count?: number;
}
```

### Zod-validatieschema's

#### `userValidationSchema`

Volledig validatieschema voor het maken van een gebruiker:

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

Gedeeltelijk schema voor updates (exclusief wachtwoord):

```typescript
const updateUserValidationSchema = userValidationSchema
  .partial()
  .omit({ password: true });
```

### Validatieconstanten

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

### Helperfuncties

#### `isValidUserStatus`

Type guard dat een tekenreeks versmalt tot `UserStatus`:

```typescript
function isValidUserStatus(status: string): status is UserStatus {
  return status === 'active' || status === 'inactive';
}
```

#### `generateUserId`

Genereert een UUID voor een nieuwe gebruiker:

```typescript
function generateUserId(): string {
  return crypto.randomUUID();
}
```

#### `formatDateForYaml`

Formatteert een `Date` als een YAML-compatibele tekenreeks (`YYYY-MM-DD HH:mm`):

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
    title: touwtje;
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
    title: touwtje;
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
