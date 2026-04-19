---
id: permission-definitions
title: הגדרות הרשאה
sidebar_label: הגדרות הרשאה
sidebar_position: 32
---

# הגדרות הרשאה

התבנית כוללת מערכת הרשאות משובחת המאורגנת בהגדרות מבוססות משאבים, קבוצות ידידותיות לממשק משתמש וכלי שירות לניהול מדינה. מערכת זו שולטת בגישה לתכונות ניהול, ניהול תוכן וניתוח.

## מבנה הקובץ

```
lib/permissions/
  definitions.ts    # Permission constants, types, default roles
  groups.ts         # UI-oriented permission groups, formatting helpers
  utils.ts          # State management utilities for permission UIs
```

## הגדרות הרשאה (`definitions.ts`)

כל ההרשאות עוקבות אחר מוסכמות שמות של `resource:action`. האובייקט `PERMISSIONS` הוא המקור היחיד של האמת:

```ts
export const PERMISSIONS = {
  items: {
    read: 'items:read',
    create: 'items:create',
    update: 'items:update',
    delete: 'items:delete',
    review: 'items:review',
    approve: 'items:approve',
    reject: 'items:reject',
  },
  categories: {
    read: 'categories:read',
    create: 'categories:create',
    update: 'categories:update',
    delete: 'categories:delete',
  },
  tags: {
    read: 'tags:read',
    create: 'tags:create',
    update: 'tags:update',
    delete: 'tags:delete',
  },
  roles: {
    read: 'roles:read',
    create: 'roles:create',
    update: 'roles:update',
    delete: 'roles:delete',
  },
  users: {
    read: 'users:read',
    create: 'users:create',
    update: 'users:update',
    delete: 'users:delete',
    assignRoles: 'users:assignRoles',
  },
  analytics: {
    read: 'analytics:read',
    export: 'analytics:export',
  },
  system: {
    settings: 'system:settings',
  },
} as const;
```

### סוג הרשאה

הסוג `Permission` נגזר אוטומטית מהאובייקט `PERMISSIONS`, מה שמבטיח בטיחות סוג ללא שכפול ידני:

```ts
type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string ? V : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;
// Results in: 'items:read' | 'items:create' | ... | 'system:settings'
```

### פונקציות שירות

```ts
// Get all permissions as a flat array
getAllPermissions(): Permission[]

// Get permissions for a specific resource
getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[]

// Type guard to validate a string is a valid permission
isValidPermission(permission: string): permission is Permission
```

דוגמה לשימוש:

```ts
import { getAllPermissions, getPermissionsForResource, isValidPermission } from '@/lib/permissions/definitions';

const allPerms = getAllPermissions();
// => ['items:read', 'items:create', ..., 'system:settings']

const itemPerms = getPermissionsForResource('items');
// => ['items:read', 'items:create', 'items:update', ...]

if (isValidPermission(userInput)) {
  // userInput is typed as Permission
}
```

### תפקידי ברירת מחדל

שתי הגדרות תפקיד מובנות מספקות ברירות מחדל הגיוניות:

```ts
export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    id: 'super-admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: getAllPermissions(),
  },
  CONTENT_MANAGER: {
    id: 'content-manager',
    name: 'Content Manager',
    description: 'Manage content including items, categories, and tags',
    permissions: [
      ...getPermissionsForResource('items'),
      ...getPermissionsForResource('categories'),
      ...getPermissionsForResource('tags'),
    ],
  },
} as const;
```

## קבוצות הרשאות (`groups.ts`)

קבוצות הרשאות מארגנות הרשאות לתצוגה ברכיבי ממשק משתמש אדמין כגון עורכי תפקידים:

```ts
export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  icon: string;        // Lucide icon name
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'content',
    name: 'Content Management',
    description: 'Manage items, categories, and tags',
    icon: 'FileText',
    permissions: [
      ...getPermissionsForResource('items'),
      ...getPermissionsForResource('categories'),
      ...getPermissionsForResource('tags'),
    ],
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage users and their roles',
    icon: 'Users',
    permissions: [
      ...getPermissionsForResource('users'),
      ...getPermissionsForResource('roles'),
    ],
  },
  {
    id: 'system',
    name: 'System & Analytics',
    description: 'System settings and analytics access',
    icon: 'Settings',
    permissions: [
      ...getPermissionsForResource('analytics'),
      ...getPermissionsForResource('system'),
    ],
  },
];
```

### פונקציות שירות קבוצתי

```ts
// Find which group a permission belongs to
getPermissionGroup(permission: Permission): PermissionGroup | undefined

// Get all permissions in a group by ID
getPermissionsByGroup(groupId: string): Permission[]

// Format "items:read" into "Read Items"
formatPermissionName(permission: Permission): string

// Format "items:read" into "View and access items and submissions"
formatPermissionDescription(permission: Permission): string
```

דוגמה לשימוש:

```ts
import {
  getPermissionGroup,
  formatPermissionName,
  formatPermissionDescription,
} from '@/lib/permissions/groups';

const group = getPermissionGroup('items:read');
// => { id: 'content', name: 'Content Management', ... }

formatPermissionName('items:approve');
// => "Approve Items"

formatPermissionDescription('users:assignRoles');
// => "Assign roles to users"
```

## כלי עזר למדינת הרשאה (`utils.ts`)

פונקציות אלה מנהלות את מצב החלפת ההרשאה בממשקי ממשק ניהול (כגון יצירת תפקידים או טפסי עריכה):

### יצירת מצב הרשאה

המר מערך הרשאות למפה בוליאנית עבור ממשקי משתמש מבוססי תיבת סימון:

```ts
import { createPermissionState, getSelectedPermissions } from '@/lib/permissions/utils';

const currentPerms: Permission[] = ['items:read', 'items:create'];

const state = createPermissionState(currentPerms);
// => { 'items:read': true, 'items:create': true }

// After user toggles checkboxes...
state['items:update'] = true;
state['items:read'] = false;

const selected = getSelectedPermissions(state);
// => ['items:create', 'items:update']
```

### חישוב שינויים

קבע מה נוסף והוסר בעת השוואת ערכי הרשאות:

```ts
import { calculatePermissionChanges } from '@/lib/permissions/utils';

const original = ['items:read', 'items:create'];
const updated = ['items:read', 'items:update'];

const changes = calculatePermissionChanges(original, updated);
// => { added: ['items:update'], removed: ['items:create'] }
```

### השוואת הרשאות

בדוק אם שני מערכי הרשאות מכילים את אותן הרשאות ללא קשר לסדר:

```ts
import { arePermissionsEqual } from '@/lib/permissions/utils';

arePermissionsEqual(['items:read', 'items:create'], ['items:create', 'items:read']);
// => true
```

### הרשאות סינון

חפש באמצעות הרשאות לפי מילת מפתח:

```ts
import { filterPermissions } from '@/lib/permissions/utils';

const allPerms = getAllPermissions();
const results = filterPermissions(allPerms, 'delete');
// => ['items:delete', 'categories:delete', 'tags:delete', ...]
```

## דפוסים נפוצים

### בדיקת הרשאות ברכיב

```ts
import { PERMISSIONS } from '@/lib/permissions/definitions';

function canUserApprove(userPermissions: string[]): boolean {
  return userPermissions.includes(PERMISSIONS.items.approve);
}
```

### בניית עורך תפקידים

```ts
import { PERMISSION_GROUPS } from '@/lib/permissions/groups';
import { createPermissionState, getSelectedPermissions } from '@/lib/permissions/utils';

function RoleEditor({ role }) {
  const [permState, setPermState] = useState(
    createPermissionState(role.permissions)
  );

  // Render groups with toggleable checkboxes
  return PERMISSION_GROUPS.map(group => (
    <PermissionGroupCard key={group.id} group={group} state={permState} />
  ));
}
```

## קבצים קשורים

- `lib/permissions/definitions.ts` - קבועי הרשאות, סוגים ותפקידי ברירת מחדל
- `lib/permissions/groups.ts` - קבוצות ממשק משתמש ועוזרי עיצוב
- `lib/permissions/utils.ts` - כלי עזר לניהול המדינה
- `lib/guards/` - מגני מסלולים ורכיבים שצורכים הרשאות
