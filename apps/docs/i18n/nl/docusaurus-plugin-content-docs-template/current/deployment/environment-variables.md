---
id: environment-variables
title: Omgevingsvariabelen
sidebar_label: Omgevingsvariabelen
sidebar_position: 5
---

# Omgevingsvariabelen

Configureer uw Ever Works-implementatie met de juiste omgevingsvariabelen.

## Vereiste Variabelen

### Toepassingsinstellingen

```bash
# Application Environment
NODE_ENV=production

# Application URL
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
NEXTAUTH_URL=https://your-domain.com
```

### Databaseconfiguratie

```bash
# PostgreSQL Database
DATABASE_URL=postgresql://username:password@host:port/database

# Alternative: Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Authenticatie

```bash
# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-key

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Optionele Variabelen

### E-mailconfiguratie

```bash
# SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SendGrid (alternative)
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Analyse

```bash
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Plausible Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
```

### Opslag

```bash
# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Cloudinary (alternative)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Platformspecifieke Instelling

### Vercel

Omgevingsvariabelen toevoegen in uw Vercel-dashboard:

1. Ga naar uw projectinstellingen
2. Navigeer naar "Omgevingsvariabelen"
3. Voeg elke variabele toe met het juiste bereik (Productie, Preview, Ontwikkeling)

### Netlify

Omgevingsvariabelen toevoegen in Netlify:

1. Ga naar Site-instellingen → Omgevingsvariabelen
2. Voeg elke variabele toe
3. Implementeer uw site opnieuw

### Docker

Maak een `.env`-bestand aan:

```bash
# .env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/everworks
NEXTAUTH_SECRET=your-secret
# ... other variables
```

Gebruiken met Docker Compose:

```yaml
# docker-compose.yml
services:
  app:
    build: .
    env_file:
      - .env
    # ... other config
```

## Beveiligingsbest Practices

### 1. Sla nooit geheimen op in versiebeheer

Toevoegen aan `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.staging
```

### 2. Gebruik verschillende waarden per omgeving

- **Ontwikkeling**: Test-/dummywaarden gebruiken
- **Staging**: Stagingomgevingswaarden gebruiken
- **Productie**: Productiewaarden gebruiken

### 3. Roteer geheimen regelmatig

- API-sleutels periodiek wijzigen
- Databasewachtwoorden bijwerken
- JWT-geheimen opnieuw genereren

### 4. Gebruik geheimenbeheer

Overweeg voor productie-implementaties:
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault

## Validatie

Maak een omgevingsvalidatiescript aan:

```javascript
// scripts/validate-env.js
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

console.log('✅ All required environment variables are set');
```

Uitvoeren vóór implementatie:

```bash
node scripts/validate-env.js
```

## Volgende Stappen

- [Docker-implementatie](/docs/deployment/docker) – Implementeren met Docker
- [Vercel-implementatie](/docs/deployment/vercel) – Implementeren op Vercel
- [Bewaking](/docs/deployment/monitoring) – Uw implementatie bewaken
