---
id: cloud
title: פריסה בענן
sidebar_label: ספקי ענן
sidebar_position: 4
---

# פריסה בענן

פרוס את אתר הדירקטוריון Ever Works שלך על ספקי שירות ענן שונים.

## פריסת AWS

### שימוש ב-AWS Amplify

1. **חיבור מאגר**

    ```bash
    # Install Amplify CLI
    npm install -g @aws-amplify/cli

    # Initialize Amplify
    amplify init
    ```

2. **הגדרת תצורת בנייה**
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

### שימוש ב-EC2

פרוס על מופע EC2:

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

### שימוש ב-Cloud Run

1. **יצירת Dockerfile**

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

2. **פריסה ל-Cloud Run**

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

### שימוש ב-Azure Static Web Apps

1. **זרימת עבודה GitHub Actions**

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

### שימוש ב-App Platform

1. **יצירת מפרט אפליקציה**

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

2. **פריסה**
    ```bash
    # Using doctl CLI
    doctl apps create --spec .do/app.yaml
    ```

## תצורת סביבה

### משתני סביבה נפוצים

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

### שיקולי אבטחה

1. **ניהול סודות**
    - השתמש בשירות ניהול הסודות של ספק הענן
    - לעולם אל תבצע commit לסודות בבקרת גרסאות
    - סובב סודות באופן קבוע

2. **אבטחת רשת**
    - הגדר חומות אש וקבוצות אבטחה
    - השתמש בתעודות HTTPS/TLS
    - אפשר הגנת DDoS

3. **בקרת גישה**
    - יישם מדיניות IAM מתאימה
    - עקוב אחר עקרון הרשאות מינימליות
    - אפשר יומני ביקורת

## ניטור וקנה מידה

### בדיקות בריאות

יישם נקודת קצה לבדיקת בריאות:

```javascript
// pages/api/health.js
export default function handler(req, res) {
	res.status(200).json({
		status: 'healthy',
		timestamp: new Date().toISOString()
	});
}
```

### קנה מידה אוטומטי

הגדר קנה מידה אוטומטי בהתבסס על:

- שימוש CPU
- שימוש זיכרון
- מספר בקשות
- מדדים מותאמים אישית

## הצעדים הבאים

- [משתני סביבה](/deployment/environment-variables) - הגדר את הפריסה שלך
- [ניטור](/deployment/monitoring) - נטר את האפליקציה שלך
- [תמיכה](/advanced-guide/support) - קבל עזרה בפריסה
