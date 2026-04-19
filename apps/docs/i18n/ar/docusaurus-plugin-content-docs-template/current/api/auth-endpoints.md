---
id: auth-endpoints
title: نقاط نهاية واجهة برمجة تطبيقات المصادقة
sidebar_label: نقاط النهاية للمصادقة
sidebar_position: 4
---

# نقاط نهاية واجهة برمجة تطبيقات المصادقة

تتعامل نقاط نهاية المصادقة مع معالجة مسار NextAuth.js وإدارة كلمة المرور واسترجاع جلسة المستخدم الحالية. يقوم مسار التقاط الكل NextAuth الأساسي بإدارة جميع عمليات رد اتصال OAuth وإدارة الجلسة وحماية CSRF تلقائيًا.

## معالج المصادقة التالي (`/api/auth/[...nextauth]`)

يقوم مسار التقاط الكل بتصدير معالجات NextAuth من `lib/auth/index.ts`:

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

يعالج هذا المسار الفردي جميع عمليات NextAuth:

### الحصول على نقاط النهاية (عبر NextAuth)

|المسار|الوصف|
|------|-------------|
|`/api/auth/signin`|عرض صفحة تسجيل الدخول أو إعادة التوجيه إلى الموفر|
|`/api/auth/signout`|التعامل مع تسجيل الخروج|
|`/api/auth/session`|احصل على الجلسة الحالية كـ JSON|
|`/api/auth/csrf`|احصل على رمز CSRF|
|`/api/auth/providers`|قائمة موفري المصادقة المتاحة|
|`/api/auth/callback/[provider]`|معالج رد الاتصال OAuth|

### نقاط نهاية POST (عبر NextAuth)

|المسار|الوصف|
|------|-------------|
|`/api/auth/signin/[provider]`|ابدأ تسجيل الدخول مع الموفر|
|`/api/auth/signout`|عملية تسجيل الخروج|
|`/api/auth/callback/credentials`|عملية تسجيل الدخول لبيانات الاعتماد|
|`/api/auth/_log`|Auth.js التسجيل الداخلي|

### تدفق رد اتصال OAuth

عندما يقوم المستخدم بالمصادقة مع موفر OAuth:

```
1. User clicks "Sign in with Google"
2. Redirect to Google consent screen
3. Google redirects back to /api/auth/callback/google
4. NextAuth verifies the OAuth code
5. signIn callback runs (lib/auth/index.ts)
   -> Validates user email
   -> Allows account linking for OAuth
6. jwt callback enriches token
   -> Sets userId, provider, isAdmin
   -> Creates client profile for new OAuth users
7. Session created, user redirected to callback URL
```

### الصفحات المخصصة

تم تكوين NextAuth لاستخدام صفحات المصادقة المخصصة بدلاً من واجهة مستخدم NextAuth الافتراضية:

|الغرض|مسار مخصص|
|---------|-------------|
|تسجيل الدخول|`/auth/signin`|
|تسجيل الخروج|`/auth/signout`|
|خطأ|`/auth/error`|
|التحقق من الطلب|`/auth/verify-request`|
|تسجيل مستخدم جديد|`/auth/register`|

## إدارة كلمة المرور (`/api/auth/change-password`)

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`POST`|`/api/auth/change-password`|تغيير كلمة مرور المستخدم المصادق عليه|

### هيئة الطلب

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

### المصادقة

يتطلب جلسة صالحة. تتحقق نقطة النهاية من كلمة المرور الحالية قبل التحديث.

### الاستجابة

```json
// Success
{ "success": true, "message": "Password changed successfully" }

// Error
{ "success": false, "error": "Current password is incorrect" }
```

## المستخدم الحالي (`/api/current-user`)

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/current-user`|الحصول على بيانات المستخدم الحالية المصادق عليها|

### الاستجابة

إرجاع كائن مستخدم الجلسة المعزز بالحقول الخاصة بالتطبيق:

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "isAdmin": false,
    "clientProfileId": "profile-uuid",
    "provider": "google"
  }
}
```

### استجابة غير مصادق عليها

يُرجع `null` أو حالة `401` في حالة عدم وجود جلسة عمل صالحة.

## التعامل مع رمز الجلسة

يقوم NextAuth بتخزين الرموز المميزة للجلسة في ملفات تعريف الارتباط HTTP فقط:

|اسم ملف تعريف الارتباط|البيئة|
|------------|-------------|
|`next-auth.session-token`|التطوير (HTTP)|
|`__Secure-next-auth.session-token`|الإنتاج (HTTPS)|

### حماية CSRF

يتضمن NextAuth حماية CSRF مدمجة. يتم تعيين ملف تعريف الارتباط للرمز المميز CSRF (`next-auth.csrf-token`) على العميل ويجب تضمينه مع طلبات POST إلى نقاط نهاية NextAuth.

## معالجة الأخطاء

يتم تعيين أخطاء المصادقة إلى رسائل سهلة الاستخدام في `lib/auth/error-handler.ts`:

|نمط الخطأ|رسالة المستخدم|
|--------------|--------------|
|`GOOGLE_CLIENT_ID` ذو صلة|لم يتم تكوين مصادقة Google بشكل صحيح|
|`GITHUB_CLIENT_ID` ذو صلة|لم يتم تكوين مصادقة GitHub بشكل صحيح|
|`FB_CLIENT_ID` ذو صلة|لم يتم تكوين مصادقة Facebook بشكل صحيح|
|`MICROSOFT_CLIENT_ID` ذو صلة|لم يتم تكوين مصادقة Microsoft بشكل صحيح|
|`SUPABASE` ذو صلة|لم يتم تكوين مصادقة Supabase بشكل صحيح|
|`NEXTAUTH` ذو صلة|لم يتم تكوين NextAuth بشكل صحيح|

تكتشف الدالة `handleAuthError()` هذه الأخطاء وترجع استجابة منظمة `{ error: string }`.

## أحداث المصادقة

يعالج تكوين NextAuth في `lib/auth/index.ts` أحداث دورة الحياة:

### حدث تسجيل الخروج

يبطل صلاحية ذاكرة التخزين المؤقت للجلسة للمستخدم لضمان عدم تقديم بيانات الجلسة القديمة:

```typescript
events: {
  signOut: async (event) => {
    const token = 'token' in event ? event.token : undefined;
    if (token?.userId) {
      await invalidateSessionCache(undefined, token.userId);
    }
  }
}
```

### حدث تحديث المستخدم

يبطل صلاحية ذاكرة التخزين المؤقت للجلسة عندما تتغير بيانات المستخدم (على سبيل المثال، تحديث الملف الشخصي، تغيير الدور):

```typescript
events: {
  updateUser: async ({ user }) => {
    if (user?.id) {
      await invalidateSessionCache(undefined, user.id);
    }
  }
}
```

## التكوين ذات الصلة

|ملف|الغرض|
|------|---------|
|`auth.config.ts`|تكوين موفر المستوى الأعلى|
|`lib/auth/index.ts`|مثيل NextAuth مع عمليات الاسترجاعات والأحداث|
|`lib/auth/providers.ts`|مصنع مزود OAuth|
|`lib/auth/credentials.ts`|مزود البريد الإلكتروني/كلمة المرور|
|`lib/auth/cached-session.ts`|طبقة التخزين المؤقت للجلسة|
|`lib/auth/admin-guard.ts`|الوسيطة طريق المشرف|
