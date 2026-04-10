---
id: cloud
title: Despliegue en la Nube
sidebar_label: Proveedores Cloud
sidebar_position: 4
---

# Despliegue en la Nube

Despliega tu sitio de directorio Ever Works en varios proveedores de nube.

## Despliegue en AWS

### Usar AWS Amplify

1. **Conectar Repositorio**

    ```bash
    # Install Amplify CLI
    npm install -g @aws-amplify/cli

    # Initialize Amplify
    amplify init
    ```

2. **Configurar Ajustes de Build**
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

### Usar EC2

Despliega en instancias EC2:

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

### Usar Cloud Run

1. **Crear Dockerfile**

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

2. **Desplegar en Cloud Run**

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

### Usar Azure Static Web Apps

1. **Flujo de Trabajo GitHub Actions**

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

### Usar App Platform

1. **Crear Especificación de App**

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

2. **Desplegar**
    ```bash
    # Using doctl CLI
    doctl apps create --spec .do/app.yaml
    ```

## Configuración del Entorno

### Variables de Entorno Comunes

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

### Consideraciones de Seguridad

1. **Gestión de Secretos**
    - Usa gestores de secretos del proveedor de nube
    - Nunca hagas commit de secretos al control de versiones
    - Rota secretos regularmente

2. **Seguridad de Red**
    - Configura firewalls y grupos de seguridad
    - Usa certificados HTTPS/TLS
    - Habilita protección DDoS

3. **Control de Acceso**
    - Implementa políticas IAM apropiadas
    - Sigue el principio de mínimo privilegio
    - Habilita registro de auditoría

## Monitoreo y Escalado

### Health Checks

Implementa endpoints de health check:

```javascript
// pages/api/health.js
export default function handler(req, res) {
	res.status(200).json({
		status: 'healthy',
		timestamp: new Date().toISOString()
	});
}
```

### Auto-Escalado

Configura auto-escalado basado en:

- Uso de CPU
- Uso de memoria
- Conteo de solicitudes
- Métricas personalizadas

## Próximos Pasos

- [Variables de Entorno](/deployment/environment-variables) - Configura tu despliegue
- [Monitoreo](/deployment/monitoring) - Monitorea tu aplicación
- [Soporte](/advanced-guide/support) - Obtén ayuda con el despliegue
