---
id: cloud
title: Distribuzione Cloud
sidebar_label: Provider Cloud
sidebar_position: 4
---

# Distribuzione Cloud

Distribuisci il tuo sito web directory Ever Works su vari provider cloud.

## Distribuzione AWS

### Utilizzo di AWS Amplify

1. **Connetti il Repository**

    ```bash
    # Install Amplify CLI
    npm install -g @aws-amplify/cli

    # Initialize Amplify
    amplify init
    ```

2. **Configura le Impostazioni di Build**
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

### Utilizzo di EC2

Deploy su istanze EC2:

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

### Utilizzo di Cloud Run

1. **Crea un Dockerfile**

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

2. **Deploy su Cloud Run**

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

### Utilizzo di Azure Static Web Apps

1. **Workflow GitHub Actions**

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

### Utilizzo della App Platform

1. **Crea una Specifica App**

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

2. **Deploy**
    ```bash
    # Using doctl CLI
    doctl apps create --spec .do/app.yaml
    ```

## Configurazione dell'Ambiente

### Variabili d'Ambiente Comuni

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

### Considerazioni sulla Sicurezza

1. **Gestione dei Secret**
    - Usa i secret manager del provider cloud
    - Non commettere mai i secret nel controllo di versione
    - Ruota i secret regolarmente

2. **Sicurezza della Rete**
    - Configura firewall e gruppi di sicurezza
    - Usa certificati HTTPS/TLS
    - Abilita la protezione DDoS

3. **Controllo degli Accessi**
    - Implementa policy IAM corrette
    - Usa il principio del privilegio minimo
    - Abilita il logging di audit

## Monitoraggio e Scalabilità

### Health Check

Implementa endpoint di health check:

```javascript
// pages/api/health.js
export default function handler(req, res) {
	res.status(200).json({
		status: 'healthy',
		timestamp: new Date().toISOString()
	});
}
```

### Scalabilità Automatica

Configura la scalabilità automatica basata su:

- Utilizzo della CPU
- Utilizzo della memoria
- Numero di richieste
- Metriche personalizzate

## Prossimi Passi

- [Variabili d'Ambiente](/deployment/environment-variables) - Configura il tuo deploy
- [Monitoraggio](/deployment/monitoring) - Monitora la tua applicazione
- [Supporto](/advanced-guide/support) - Ottieni aiuto con il deploy
