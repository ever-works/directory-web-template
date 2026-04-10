---
id: cloud
title: Cloud-implementatie
sidebar_label: Cloud Providers
sidebar_position: 4
---

# Cloud-implementatie

Implementeer uw Ever Works directory-website bij verschillende cloudproviders.

## AWS-implementatie

### Met AWS Amplify

1. **Repository verbinden**

    ```bash
    # Install Amplify CLI
    npm install -g @aws-amplify/cli

    # Initialize Amplify
    amplify init
    ```

2. **Build-instellingen configureren**
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

### Met EC2

Implementeren op EC2-instanties:

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

### Met Cloud Run

1. **Dockerfile aanmaken**

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

2. **Implementeren op Cloud Run**

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

### Met Azure Static Web Apps

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

### Met het App Platform

1. **App-specificatie aanmaken**

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

2. **Implementeren**
    ```bash
    # Using doctl CLI
    doctl apps create --spec .do/app.yaml
    ```

## Omgevingsconfiguratie

### Veelgebruikte omgevingsvariabelen

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

### Beveiligingsoverwegingen

1. **Secretsbeheer**
    - Gebruik geheimenbeheerders van cloudproviders
    - Leg nooit secrets vast in versiebeheer
    - Roteer secrets regelmatig

2. **Netwerkbeveiliging**
    - Firewalls en beveiligingsgroepen configureren
    - HTTPS/TLS-certificaten gebruiken
    - DDoS-beveiliging inschakelen

3. **Toegangsbeheer**
    - Juist IAM-beleid implementeren
    - Principe van minimale privileges toepassen
    - Auditlogboekregistratie inschakelen

## Bewaking en schaling

### Health-checks

Health-check-eindpunten implementeren:

```javascript
// pages/api/health.js
export default function handler(req, res) {
	res.status(200).json({
		status: 'healthy',
		timestamp: new Date().toISOString()
	});
}
```

### Automatische schaling

Automatische schaling configureren op basis van:

- CPU-gebruik
- Geheugengebruik
- Aanvraagaantal
- Aangepaste statistieken

## Volgende stappen

- [Omgevingsvariabelen](/deployment/environment-variables) - Uw implementatie configureren
- [Bewaking](/deployment/monitoring) - Uw applicatie bewaken
- [Ondersteuning](/advanced-guide/support) - Hulp bij implementatie krijgen
