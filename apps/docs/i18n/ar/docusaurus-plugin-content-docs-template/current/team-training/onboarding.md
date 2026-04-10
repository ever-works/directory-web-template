---
id: onboarding
title: دليل الاستقبال
sidebar_label: الاستقبال
sidebar_position: 2
---

# دليل الاستقبال

مرحباً بك في Ever Works! يساعدك هذا الدليل على إعداد بيئة التطوير وتقديم أول مساهمة لك.

## 🎯 الأهداف

بعد إتمام هذه الوحدة:

- ✅ ستمتلك بيئة تطوير مُعدَّة بالكامل
- ✅ ستفهم هيكل المشروع
- ✅ ستتمكن من تشغيل التطبيق محلياً
- ✅ ستجري أول تعديل على الكود
- ✅ ستفهم سير عمل التطوير

**الوقت التقديري**: يوم إلى يومين

---

## الخطوة 1: إعداد البيئة

### 1.1 تثبيت الأدوات المطلوبة

اتبع [دليل التثبيت](/getting-started/installation) المفصَّل لتثبيت:

- Node.js 20.19.0+
- pnpm ([التثبيت](https://pnpm.io/installation))
- PostgreSQL 14+
- Git
- VS Code (موصى به)

### 1.2 استنساخ المستودع

```bash
git clone https://github.com/ever-co/ever-works.git
cd ever-works
pnpm install
```

### 1.3 ضبط متغيرات البيئة

**قائمة التحقق السريعة**:

- [ ] تم ضبط اتصال قاعدة البيانات
- [ ] تم تعيين مفاتيح المصادقة السرية
- [ ] تمت إضافة مفاتيح مزود الدفع (اختياري للتطوير)

---

## الخطوة 2: إعداد قاعدة البيانات

### 2.1 تشغيل PostgreSQL

```bash
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14
```

### 2.2 تنفيذ الترحيل

```bash
cd apps/web
pnpm exec drizzle-kit push
pnpm run db:seed
```

---

## الخطوة 3: تشغيل خادم التطوير

```bash
pnpm run dev
```

التحقق في المتصفح:

- [ ] تُحمَّل الصفحة الرئيسية على `http://localhost:3000`
- [ ] يمكن إنشاء حساب
- [ ] يمكن تسجيل الدخول والخروج
- [ ] توثيق API متاح على `http://localhost:3000/api/reference`

---

## الخطوة 4: فهم هيكل المشروع

```
directory-web-template/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   └── messages/
│   └── web-e2e/
├── packages/
└── turbo.json
```

---

## الخطوة 5: سير عمل التطوير

### 5.1 إنشاء فرع الميزة

```bash
git checkout main
git pull origin main
git checkout -b feature/اسم-الميزة
```

### 5.2 التسليم والرفع

```bash
git add .
git commit -m "feat: إضافة نظام إشعارات المستخدمين"
git push origin feature/اسم-الميزة
```

---

## ✅ قائمة التحقق من الإلحاق

- [ ] بيئة التطوير مُعدَّة بالكامل
- [ ] التطبيق يعمل محلياً
- [ ] قاعدة البيانات متصلة ومملوءة بالبيانات
- [ ] هيكل المشروع مفهوم
- [ ] تم إنشاء الفرع الأول
- [ ] تم تنفيذ أول commit

---

## الخطوات التالية

1. [توثيق API](/team-training/api-documentation) – تعلّم نظام التوثيق
2. [أفضل الممارسات](/team-training/best-practices) – تعلّم معايير الكود
3. [التمارين](/team-training/exercises) – تدرّب على مهام حقيقية

تحتاج إلى مساعدة؟ استشر مرشدك أو تحقق من قناة Slack الخاصة بالفريق! 🚀
