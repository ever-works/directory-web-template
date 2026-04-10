---
id: cloud
title: Cloud-Bereitstellung
sidebar_label: Cloud-Anbieter
sidebar_position: 4
---

# Cloud-Bereitstellung

Stellen Sie Ihre Ever Works Verzeichnis-Website auf verschiedenen Cloud-Anbietern bereit.

## AWS-Bereitstellung

### Mit AWS Amplify

1. **Repository verbinden**

    ```bash
    # Install Amplify CLI
    npm install -g @aws-amplify/cli

    # Initialize Amplify
    amplify init
    ```

2. **Build-Einstellungen konfigurieren**
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

### Mit EC2

Auf EC2-Instanzen deployen:

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

### Mit Cloud Run

1. **Dockerfile erstellen**

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

2. **Auf Cloud Run deployen**

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

### Mit Azure Static Web Apps

1. **GitHub Actions Workflow**

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

### Mit der App Platform

1. **App-Spezifikation erstellen**

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

2. **Deployen**
    ```bash
    # Using doctl CLI
    doctl apps create --spec .do/app.yaml
    ```

## Umgebungskonfiguration

### Allgemeine Umgebungsvariablen

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

### Sicherheitsüberlegungen

1. **Secrets-Verwaltung**
    - Cloud-Anbieter-Secret-Manager verwenden
    - Secrets niemals in die Versionskontrolle einchecken
    - Secrets regelmäßig rotieren

2. **Netzwerksicherheit**
    - Firewalls und Sicherheitsgruppen konfigurieren
    - HTTPS/TLS-Zertifikate verwenden
    - DDoS-Schutz aktivieren

3. **Zugangskontrolle**
    - Ordnungsgemäße IAM-Richtlinien implementieren
    - Prinzip des minimalen Privilegs anwenden
    - Audit-Protokollierung aktivieren

## Überwachung und Skalierung

### Health-Checks

Health-Check-Endpunkte implementieren:

```javascript
// pages/api/health.js
export default function handler(req, res) {
	res.status(200).json({
		status: 'healthy',
		timestamp: new Date().toISOString()
	});
}
```

### Automatische Skalierung

Automatische Skalierung basierend auf folgenden Faktoren konfigurieren:

- CPU-Auslastung
- Speicherauslastung
- Anfragenanzahl
- Benutzerdefinierte Metriken

## Nächste Schritte

- [Umgebungsvariablen](/deployment/environment-variables) - Deployment konfigurieren
- [Überwachung](/deployment/monitoring) - Anwendung überwachen
- [Support](/advanced-guide/support) - Deployment-Hilfe erhalten
