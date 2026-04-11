---
id: docker
title: النشر باستخدام Docker
sidebar_label: Docker
sidebar_position: 2
---

# النشر باستخدام Docker

نشر موقع دليل Ever Works باستخدام حاويات Docker.

## المتطلبات الأساسية

- تثبيت Docker على نظامك
- Docker Compose (اختياري لكن موصى به)

## البدء السريع مع Docker

### 1. بناء صورة Docker

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. تشغيل الحاوية

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

سيكون موقعك متاحاً عبر `http://localhost:3000`.

## تكوين Docker Compose

أنشئ ملف `docker-compose.yml`:

```yaml
version: '3.8'

services:
    app:
        build: .
        ports:
            - '3000:3000'
        environment:
            - NODE_ENV=production
            - NEXT_PUBLIC_API_BASE_URL=https://your-api.com
        volumes:
            - ./.content:/app/.content
        restart: unless-stopped

    # Optional: Add a database service
    postgres:
        image: postgres:15
        environment:
            POSTGRES_DB: everworks
            POSTGRES_USER: user
            POSTGRES_PASSWORD: password
        volumes:
            - postgres_data:/var/lib/postgresql/data
        restart: unless-stopped

volumes:
    postgres_data:
```

### التشغيل باستخدام Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## متغيرات البيئة

تكوين نشرك باستخدام متغيرات البيئة:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## اعتبارات الإنتاج

### الأمان

- استخدام إدارة الأسرار للبيانات الحساسة
- تمكين HTTPS باستخدام reverse proxy (nginx، Traefik)
- التحديثات الأمنية الدورية

### الأداء

- استخدام multi-stage builds لتقليل حجم الصورة
- تكوين حدود الموارد المناسبة
- تمكين تخزين الطبقات مؤقتاً

### المراقبة

- إضافة فحوصات الصحة
- تكوين التسجيل
- إعداد المراقبة والتنبيهات

## الخطوات التالية

- [متغيرات البيئة](/docs/deployment/environment-variables) - تكوين النشر
- [المراقبة](/docs/deployment/monitoring) - مراقبة تطبيقك
- [الدعم](/docs/advanced-guide/support) - الحصول على مساعدة
