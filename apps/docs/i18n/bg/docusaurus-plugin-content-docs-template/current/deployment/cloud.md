---
id: cloud
title: Внедряване в Облак
sidebar_label: Облачни Доставчици
sidebar_position: 4
---

# Внедряване в Облак

Внедрете своя сайт-директория Ever Works при различни облачни доставчици.

## Внедряване в AWS

### Използване на AWS Amplify

1. **Свързване на Хранилището**

    ```bash
    # Install Amplify CLI
    npm install -g @aws-amplify/cli

    # Initialize Amplify
    amplify init
    ```

2. **Конфигуриране на Настройките за Сборка**
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

### Използване на EC2

Внедряване на EC2 инстанции:

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

## Google Cloud Platform

### Използване на Cloud Run

1. **Създаване на Dockerfile**

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

2. **Внедряване в Cloud Run**

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

### Използване на Azure Static Web Apps

1. **GitHub Actions Работен Поток**

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

### Използване на App Platform

1. **Създаване на Спецификация на Приложението**

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

2. **Внедряване**
    ```bash
    # Using doctl CLI
    doctl apps create --spec .do/app.yaml
    ```

## Конфигурация на Средата

### Общи Променливи на Средата

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

### Съображения за Сигурност

1. **Управление на Тайни**
    - Използвайте мениджъри на тайни на облачния доставчик
    - Никога не комитвайте тайни в контрола на версиите
    - Редовно ротирайте тайните

2. **Мрежова Сигурност**
    - Конфигурирайте защитни стени и групи за сигурност
    - Използвайте HTTPS/TLS сертификати
    - Активирайте DDoS защита

3. **Контрол на Достъпа**
    - Прилагайте подходящи IAM политики
    - Следвайте принципа на най-малките привилегии
    - Активирайте одитното логване

## Мониторинг и Мащабиране

### Проверки за Здраве

Имплементирайте разточки за проверка на здравето:

```javascript
// pages/api/health.js
export default function handler(req, res) {
	res.status(200).json({
		status: 'healthy',
		timestamp: new Date().toISOString()
	});
}
```

### Автоматично Мащабиране

Конфигурирайте автоматично мащабиране въз основа на:

- Използване на CPU
- Използване на памет
- Брой заявки
- Персонализирани метрики

## Следващи Стъпки

- [Променливи на Средата](/deployment/environment-variables) - Конфигурирайте вашето внедряване
- [Мониторинг](/deployment/monitoring) - Наблюдавайте приложението си
- [Поддръжка](/advanced-guide/support) - Получете помощ с внедряването
