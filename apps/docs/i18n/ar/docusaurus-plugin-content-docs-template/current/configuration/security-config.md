---
id: security-config
title: "تكوين الأمان"
sidebar_label: "تكوين الأمان"
sidebar_position: 5
---

# تكوين الأمان

يُطبّق القالب استراتيجية أمان متعددة الطبقات مع التحكم في الوصول المبني على الأذونات، والتحقق من المدخلات، واستجابات الخطأ الآمنة، وتنقية عناوين URL. يوثّق هذا الدليل كل طبقة أمان وكيفية تكوينها.

## نظام الأذونات

يستخدم القالب نموذج أذونات دقيق من نوع مورد-إجراء معرَّف في `lib/permissions/definitions.ts` ومُطبَّق عبر `lib/middleware/permission-check.ts`.

### تنسيق الأذونات

تتبع الأذونات تنسيق `resource:action`:

```
items:read
items:create
items:update
items:delete
items:review
items:approve
items:reject
categories:read
categories:create
users:assignRoles
analytics:read
system:settings
```

### دوال فحص الأذونات

يوفر middleware الأذونات في `lib/middleware/permission-check.ts` مجموعة شاملة من مساعدات التفويض:

```ts
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasResourcePermission,
  canManageResource,
  canReviewItems,
  canManageUsers,
  canManageRoles,
  canViewAnalytics,
  isSuperAdmin
} from '@/lib/middleware/permission-check';

// Check a single permission
hasPermission(userPermissions, 'items:create');

// Check if user has ANY of the given permissions
hasAnyPermission(userPermissions, ['items:review', 'items:approve']);

// Check if user has ALL of the given permissions
hasAllPermissions(userPermissions, ['items:read', 'items:update']);

// Check a resource:action pair (with validation)
hasResourcePermission(userPermissions, 'items', 'delete');

// Get all permissions for a resource
const itemPerms = getResourcePermissions(userPermissions, 'items');
// e.g., ['items:read', 'items:create', 'items:update']

// Check if user can manage (create/update/delete) a resource
canManageResource(userPermissions, 'categories');
```

### واجهة UserPermissions

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### فحوصات خاصة بالأدوار

```ts
// Check if user can review items (review, approve, or reject)
canReviewItems(userPermissions);

// Check if user can manage users
canManageUsers(userPermissions);

// Check if user can manage roles
canManageRoles(userPermissions);

// Check if user can view analytics
canViewAnalytics(userPermissions);
```

### اكتشاف المشرف الأعلى

تفحص الدالة `isSuperAdmin` شرطين:

1. يمتلك المستخدم دور `'super-admin'` (مُفضَّل)، أو
2. يمتلك المستخدم جميع أذونات النظام (بديل احتياطي)

```ts
export function isSuperAdmin(userPermissions: UserPermissions): boolean {
  if (userPermissions.roles.includes('super-admin')) {
    return true;
  }
  // Fallback: check if user has ALL system permissions
  const allPermissions: Permission[] = [
    'items:read', 'items:create', 'items:update', 'items:delete',
    'items:review', 'items:approve', 'items:reject',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'tags:read', 'tags:create', 'tags:update', 'tags:delete',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:assignRoles',
    'analytics:read', 'analytics:export',
    'system:settings'
  ];
  return hasAllPermissions(userPermissions, allPermissions);
}
```

### التحقق من صحة الأذونات

```ts
// Validate a permission string is recognized
validatePermission('items:read'); // true
validatePermission('invalid:perm'); // false

// Parse a permission into resource and action
parsePermission('items:create');
// Returns: { resource: 'items', action: 'create' }

// Get a summary grouped by resource
getPermissionSummary(userPermissions);
// Returns: { items: ['read', 'create'], categories: ['read'], ... }
```

## حماية مسارات API

تستخدم مسارات API المصادقة المبنية على الجلسات مع فحوصات دور المشرف:

```ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  // Proceed with authorized logic...
}
```

## التحقق من صحة المدخلات

يستخدم القالب مخططات Zod في جميع أنحاء التطبيق للتحقق من صحة المدخلات:

```ts
import { z } from 'zod';

const createNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  userId: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

// In API route
const body = await request.json();
const parsed = createNotificationSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
}
```

## تنقية عناوين URL

يتضمن وحدة المحرر تنقية عناوين URL في `lib/editor/utils/utils.ts`:

```ts
export function isAllowedUri(uri: string | undefined, protocols?: ProtocolConfig): boolean {
  const allowedProtocols = [
    "http", "https", "ftp", "ftps", "mailto", "tel",
    "callto", "sms", "cid", "xmpp"
  ];
  // Validates URI against whitelist and strips ATTR_WHITESPACE
  // ...
}

export function sanitizeUrl(inputUrl: string, baseUrl: string, protocols?: ProtocolConfig): string {
  try {
    const url = new URL(inputUrl, baseUrl);
    if (isAllowedUri(url.href, protocols)) return url.href;
  } catch { /* invalid URL */ }
  return "#";
}
```

يمنع هذا تضمين `javascript:` وعناوين URL ذات البروتوكولات الخطرة الأخرى في محتوى المحرر.

## الحماية من تلوث النموذج الأولي

يحمي `ConfigManager` من تلوث النموذج الأولي عند تحديث مفاتيح التكوين المتداخلة:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

async updateNestedKey(keyPath: string, value: any): Promise<boolean> {
  const keys = keyPath.split('.');
  for (const key of keys) {
    if (this.isPrototypePollutingKey(key)) {
      return false; // Silently reject
    }
  }
  // ...
}
```

## أمان ملفات تعريف الارتباط

يتم التحقق من صحة تكوين ملفات تعريف الارتباط عبر مخطط Zod:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

للبيئة الإنتاجية، اضبط:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## رؤوس أمان Next.js

يُكوّن ملف `next.config.ts` رؤوس الأمان. الرؤوس الشائعة للضبط:

| الرأس | الغرض |
|-------|--------|
| `X-Frame-Options` | منع الاختطاف بالنقر |
| `X-Content-Type-Options` | منع استنشاق نوع MIME |
| `Referrer-Policy` | التحكم في معلومات المُحيل |
| `X-XSS-Protection` | تمكين تصفية XSS في المتصفح |
| `Strict-Transport-Security` | فرض HTTPS |
| `Permissions-Policy` | تقييد ميزات المتصفح |

## أمان متغيرات البيئة

يضمن نظام التكوين أن المتغيرات الحساسة تكون على جانب الخادم فقط:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

المتغيرات ذات البادئة `NEXT_PUBLIC_` تُعرَض للعميل. جميع المتغيرات الأخرى (المفاتيح السرية، وعناوين URL لقواعد البيانات، ورموز API) تظل على جانب الخادم فقط:

- `STRIPE_SECRET_KEY` -- على جانب الخادم فقط
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- آمن للعميل
- `DATABASE_URL` -- على جانب الخادم فقط
- `AUTH_SECRET` -- على جانب الخادم فقط

## أفضل الممارسات

1. **التحقق دائمًا من المدخلات** باستخدام مخططات Zod قبل المعالجة
2. **فحص المصادقة** في بداية كل معالج لمسار API
3. **استخدام فحوصات الأذونات** للتحكم في الوصول المبني على الأدوار
4. **تنقية عناوين URL** قبل تضمينها في المحتوى
5. **الحفاظ على الأسرار على جانب الخادم فقط** باستخدام حماية الاستيراد `server-only`
6. **ضبط `COOKIE_SECURE=true`** في الإنتاج
7. **استخدام أسرار قوية** لـ `AUTH_SECRET` و`COOKIE_SECRET` (32 بايت base64 على الأقل)
8. **مراجعة نموذج الأذونات** عند إضافة موارد أو إجراءات جديدة

## الملفات المرتبطة

| المسار | الوصف |
|--------|--------|
| `lib/middleware/permission-check.ts` | دوال تطبيق الأذونات |
| `lib/permissions/definitions.ts` | تعريفات الأذونات والأدوار |
| `lib/config/config-service.ts` | نمط Singleton للتكوين على جانب الخادم فقط |
| `lib/config/schemas/auth.schema.ts` | مخططات تكوين المصادقة/Cookie |
| `lib/editor/utils/utils.ts` | أدوات تنقية URL |
| `lib/config-manager.ts` | مدير YAML للتكوين مع الحماية من تلوث النموذج الأولي |
| `auth.config.ts` | تكوين NextAuth |
| `next.config.ts` | رؤوس الأمان و CSP |
