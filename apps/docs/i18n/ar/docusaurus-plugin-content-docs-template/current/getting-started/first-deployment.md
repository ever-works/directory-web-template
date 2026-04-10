---
title: "النشر الأول"
sidebar_label: "النشر الأول"
sidebar_position: 4
---

# النشر الأول

## الخيار الأول: Vercel (موصى به)

1. ارفع الكود إلى GitHub
2. سجّل الدخول إلى [vercel.com](https://vercel.com) واستورد المشروع
3. أضف متغيرات البيئة اللازمة
4. انقر على "Deploy"

## الخيار الثاني: Docker

```bash
docker build -t directory-web-template .
docker run -p 3000:3000 directory-web-template
```

## الخيار الثالث: النشر اليدوي

```bash
pnpm build
pnpm start
```

تأكد من ضبط جميع متغيرات البيئة في بيئة الإنتاج.
