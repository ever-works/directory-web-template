---
title: "التثبيت"
sidebar_label: "التثبيت"
sidebar_position: 1
---

# التثبيت

## المتطلبات الأساسية

- **Node.js >= 20.19.0**
- **pnpm** – مدير الحزم
- **Git**
- **PostgreSQL** (اختياري للتطوير المحلي)

## متطلبات النظام

- **نظام التشغيل**: Windows أو macOS أو Linux
- **الذاكرة**: 4 GB RAM كحد أدنى
- **مساحة التخزين**: 2 GB كحد أدنى

## خطوات التثبيت

### 1. استنساخ المستودع

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

### 2. تثبيت التبعيات

```bash
pnpm install
```

### 3. إعداد البيئة

```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. تكوين المتغيرات

قم بتحرير `apps/web/.env.local` وتعيين القيم اللازمة.

### 5. تشغيل خادم التطوير

```bash
pnpm run dev
```
