---
id: cron-verification
title: التحقق من Cron في Vercel
sidebar_label: التحقق من Cron
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – قائمة التحقق

## 🎯 إجابات سريعة

### السؤال 1: هل يمكن التشغيل على Vercel بدون Trigger.dev؟
**✅ نعم** – تم تكوين النظام بشكل صحيح لاستخدام Vercel Crons عندما:
- `VERCEL=1` (يُعيَّن تلقائياً بواسطة Vercel)
- متغيرات بيئة Trigger.dev **غير** مُعيَّنة

### السؤال 2: كيف أتحقق من أن كل شيء يعمل؟
**✅ اتبع هذه الخطوات الأربع**

---

## 📊 حالة التكوين الحالية

### ✅ ما تم إصلاحه

| المكوّن | الحالة | التفاصيل |
|---------|--------|----------|
| `vercel.json` | ✅ **تم الإصلاح** | يحتوي الآن على **3 مهام cron** كاملة (كان يحتوي على 1 فقط سابقاً) |
| `initialize-jobs.ts` | ✅ **تم الإصلاح** | يسجّل الآن **3 مهام** كاملة (كان يسجّل 2 فقط سابقاً) |
| نقاط النهاية API | ✅ **جاهزة** | جميع النقاط الثلاث موجودة وتعمل |
| التوثيق | ✅ **تم الإنشاء** | دليل جديد `CRON_JOBS.md` |

### 📋 القائمة الكاملة لمهام Cron

| # | اسم المهمة | النقطة النهائية | الجدول الزمني | الغرض |
|---|-----------|----------------|---------------|-------|
| 1 | مزامنة المستودع | `/api/cron/sync` | `*/5 * * * *` | مزامنة المحتوى كل 5 دقائق |
| 2 | تذكيرات الاشتراك | `/api/cron/subscription-reminders` | `0 9 * * *` | إرسال رسائل التذكير يومياً الساعة 9:00 |
| 3 | انتهاء صلاحية الاشتراك | `/api/cron/subscription-expiration` | `0 0 * * *` | معالجة الاشتراكات المنتهية صلاحيتها عند منتصف الليل |

---

## 🔍 خطوات التحقق الأربع

### الخطوة 1: تحقق من لوحة تحكم Vercel – Cron Jobs

**قالب URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**ما يجب التحقق منه:**
- [ ] تظهر **3 مهام cron** (وليس 1 فقط)
- [ ] كل مهمة تحتوي على الجدول الزمني الصحيح
- [ ] جميعها تظهر كـ "نشطة"

**النتيجة المتوقعة:**

| المسار | الجدول الزمني | الحالة |
|--------|--------------|-------|
| `/api/cron/sync` | كل 5 دقائق | ✅ نشط |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ نشط |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ نشط |

---

### الخطوة 2: تحقق من سجلات Vercel

**قالب URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**تحقق من كل نقطة نهائية:**

#### أ. سجلات المزامنة
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] تظهر السجلات كل 5 دقائق
- [ ] رمز الحالة هو 200 (نجاح)
- [ ] لا توجد أخطاء 401 (مصادقة)
- [ ] لا توجد أخطاء 500 (فشل)

#### ب. سجلات التذكيرات
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] تظهر السجلات يومياً الساعة 9:00
- [ ] رمز الحالة هو 200 أو 207 (نجاح/نجاح جزئي)

#### ج. سجلات انتهاء الصلاحية
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] تظهر السجلات يومياً عند منتصف الليل
- [ ] رمز الحالة هو 200 (نجاح)

---

### الخطوة 3: تحقق من سجلات التطبيق

#### عند بدء تشغيل التطبيق
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ هذا يؤكد:** اكتشاف النظام لبيئة Vercel

#### عند كل مزامنة (كل 5 دقائق)
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### عند تذكيرات الاشتراك (يومياً الساعة 9:00)
```
[Cron] Subscription reminders job completed
```

#### عند انتهاء الصلاحية (يومياً عند منتصف الليل)
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### الخطوة 4: تحقق من متغيرات البيئة

**المطلوبة:**
```bash
CRON_SECRET=<تم التعيين في Vercel>
```

**يجب عدم التعيين (لاستخدام Vercel بدلاً من Trigger.dev):**
```bash
TRIGGER_SECRET_KEY=<يجب أن يكون فارغاً>
TRIGGER_API_KEY=<يجب أن يكون فارغاً>
TRIGGER_API_URL=<يجب أن يكون فارغاً>
```

**التحقق عبر Vercel CLI:**
```bash
vercel env ls
```

---

## 🚨 المشاكل الشائعة وحلولها

### المشكلة 1: تظهر مهمة cron واحدة فقط في Vercel

**السبب:** تم نشر `vercel.json` القديم  
**الحل:**
1. ✅ تم إصلاح `vercel.json` (3 مهام cron)
2. أعد النشر إلى Vercel: `git push` أو `vercel --prod`
3. انتظر 1-2 دقيقة حتى يسجّل Vercel المهام الجديدة

---

### المشكلة 2: خطأ 401 غير مصرح به

**السبب:** `CRON_SECRET` غير مُعيَّن أو غير متطابق  
**الحل:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

---

### المشكلة 3: المهام لا تعمل على الإطلاق

**السبب:** يتم استخدام وضع Trigger.dev بدلاً من وضع Vercel

**التحقق:**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
