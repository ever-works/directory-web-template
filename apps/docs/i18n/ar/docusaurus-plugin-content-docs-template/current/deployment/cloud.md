---
id: cloud
title: النشر على السحابة
sidebar_label: مزودو السحابة
sidebar_position: 4
---

# النشر على السحابة

نشر موقع دليل Ever Works على مختلف مزودي الخدمات السحابية.

## النشر على AWS

### استخدام AWS Amplify

1. **ربط المستودع**

    ```bash
    # Install Amplify CLI
    npm install -g @aws-amplify/cli

    # Initialize Amplify
    amplify init
    ```

2. **تكوين إعدادات البناء**
    ```yaml
    # amplify.yml
    version: 1
    frontend:
        phases:
            preBuild:
                commands:
                    - cd website
                    - npm install
            build:
                commands:
                    - npm run build
        artifacts:
            baseDirectory: website/.next
            files:
                - '**/*'
    ```

### استخدام EC2

النشر على نسخة EC2:

```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template/website
npm install
npm run build

# Start with PM2
pm2 start npm --name "ever-works" -- start
pm2 startup
pm2 save
```

## منصة Google Cloud

### استخدام Cloud Run

1. **إنشاء Dockerfile**

    ```dockerfile
    FROM node:18-alpine
    WORKDIR /app
    COPY website/package*.json ./
    RUN npm install
    COPY website/ ./
    RUN npm run build
    EXPOSE 3000
    CMD ["npm", "start"]
    ```

2. **النشر على Cloud Run**

    ```bash
    # Build and push to Container Registry
    gcloud builds submit --tag gcr.io/PROJECT_ID/ever-works

    # Deploy to Cloud Run
    gcloud run deploy ever-works \
      --image gcr.io/PROJECT_ID/ever-works \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated
    ```

## Microsoft Azure

### استخدام Azure Static Web Apps

1. **سير عمل GitHub Actions**

    ```yaml
    # .github/workflows/azure-static-web-apps.yml
    name: Azure Static Web Apps CI/CD

    on:
        push:
            branches: [main]

    jobs:
        build_and_deploy_job:
            runs-on: ubuntu-latest
            steps:
                - uses: actions/checkout@v2
                - name: Build And Deploy
                  uses: Azure/static-web-apps-deploy@v1
                  with:
                      azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
                      repo_token: ${{ secrets.GITHUB_TOKEN }}
                      action: 'upload'
                      app_location: '/website'
                      output_location: '.next'
    ```

## DigitalOcean

### استخدام App Platform

1. **إنشاء مواصفات التطبيق**

    ```yaml
    # .do/app.yaml
    name: ever-works
    services:
        - name: web
          source_dir: /website
          github:
              repo: your-username/directory-web-template
              branch: main
          run_command: npm start
          build_command: npm run build
          environment_slug: node-js
          instance_count: 1
          instance_size_slug: basic-xxs
          envs:
              - key: NODE_ENV
                value: production
    ```

2. **النشر**
    ```bash
    # Using doctl CLI
    doctl apps create --spec .do/app.yaml
    ```

## تكوين البيئة

### متغيرات البيئة الشائعة

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://your-api.com

# Database
DATABASE_URL=your-database-connection-string

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### اعتبارات الأمان

1. **إدارة الأسرار**
    - استخدم خدمة إدارة الأسرار لدى موفر السحابة
    - لا تلتزم أبداً بالأسرار في التحكم بالإصدار
    - دوّر الأسرار بانتظام

2. **أمان الشبكة**
    - تكوين جدران الحماية ومجموعات الأمان
    - استخدام شهادات HTTPS/TLS
    - تمكين حماية DDoS

3. **التحكم في الوصول**
    - تطبيق سياسات IAM المناسبة
    - اتباع مبدأ أقل الصلاحيات
    - تمكين سجلات التدقيق

## المراقبة والتوسعة

### فحص الصحة

تطبيق نقطة نهاية فحص الصحة:

```javascript
// pages/api/health.js
export default function handler(req, res) {
	res.status(200).json({
		status: 'healthy',
		timestamp: new Date().toISOString()
	});
}
```

### التوسع التلقائي

تكوين التوسع التلقائي بناءً على:

- استخدام CPU
- استخدام الذاكرة
- عدد الطلبات
- المقاييس المخصصة

## الخطوات التالية

- [متغيرات البيئة](/deployment/environment-variables) - تكوين النشر الخاص بك
- [المراقبة](/deployment/monitoring) - مراقبة تطبيقك
- [الدعم](/advanced-guide/support) - الحصول على مساعدة في النشر
