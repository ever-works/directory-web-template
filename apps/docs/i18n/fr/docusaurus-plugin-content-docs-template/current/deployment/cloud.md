---
id: cloud
title: Déploiement cloud
sidebar_label: Fournisseurs cloud
sidebar_position: 4
---

# Déploiement cloud

Déployez votre site web de répertoire Ever Works sur divers fournisseurs cloud.

## Déploiement AWS

### Avec AWS Amplify

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd apps/web
        - npm install -g pnpm
        - pnpm install
    build:
      commands:
        - pnpm build
  artifacts:
    baseDirectory: apps/web/.next
    files:
      - '**/*'
```

### Avec EC2

Déployez sur des instances EC2 :

```bash
# Installer Node.js et pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm pm2

# Cloner et configurer
git clone https://github.com/votre/project.git
cd project
pnpm install
pnpm build

# Démarrer avec PM2
pm2 start apps/web/server.js --name ever-works
pm2 save
pm2 startup
```

## Déploiement Google Cloud

### Cloud Run (Recommandé pour GCP)

```bash
# Construire et pousser l'image Docker
gcloud builds submit --tag gcr.io/[PROJECT_ID]/ever-works

# Déployer sur Cloud Run
gcloud run deploy ever-works \
  --image gcr.io/[PROJECT_ID]/ever-works \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,DATABASE_URL=...
```

## Déploiement Microsoft Azure

### Azure App Service

```bash
# Configurer Azure CLI
az login

# Créer l'app service
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name ever-works-app \
  --runtime "NODE|20-lts"

# Déployer via Git
az webapp deployment source config \
  --name ever-works-app \
  --resource-group myResourceGroup \
  --repo-url https://github.com/votre/project.git \
  --branch main
```

## Recommandations générales

- Utilisez une base de données PostgreSQL gérée (AWS RDS, Cloud SQL, Azure Database)
- Configurez un équilibreur de charge pour la haute disponibilité
- Activez les backups automatiques
- Configurez des health checks sur `/api/health`
