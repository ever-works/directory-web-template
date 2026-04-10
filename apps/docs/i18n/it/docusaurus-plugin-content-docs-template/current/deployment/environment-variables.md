---
id: environment-variables
title: Variabili d'Ambiente
sidebar_label: Variabili d'Ambiente
sidebar_position: 5
---

# Variabili d'Ambiente

Configura il tuo deployment Ever Works con le variabili d'ambiente corrette.

## Variabili Richieste

### Impostazioni Applicazione

```bash
# Application Environment
NODE_ENV=production

# Application URL
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
NEXTAUTH_URL=https://your-domain.com
```

### Configurazione Database

```bash
# PostgreSQL Database
DATABASE_URL=postgresql://username:password@host:port/database

# Alternative: Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Autenticazione

```bash
# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-key

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Variabili Opzionali

### Configurazione Email

```bash
# SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SendGrid (alternative)
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Analisi

```bash
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Plausible Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
```

### Archiviazione

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

## Configurazione Specifica per Piattaforma

### Vercel

Aggiungere le variabili d'ambiente nel dashboard di Vercel:

1. Andare alle impostazioni del progetto
2. Navigare su "Variabili d'Ambiente"
3. Aggiungere ogni variabile con l'ambito appropriato (Produzione, Anteprima, Sviluppo)

### Netlify

Aggiungere le variabili d'ambiente in Netlify:

1. Andare su Impostazioni sito → Variabili d'ambiente
2. Aggiungere ogni variabile
3. Ridistribuire il sito

### Docker

Creare un file `.env`:

```bash
# .env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/everworks
NEXTAUTH_SECRET=your-secret
# ... other variables
```

Usare con Docker Compose:

```yaml
# docker-compose.yml
services:
  app:
    build: .
    env_file:
      - .env
    # ... other config
```

## Best Practice di Sicurezza

### 1. Non Committare Mai i Segreti

Aggiungere a `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.staging
```

### 2. Usare Valori Diversi per Ogni Ambiente

- **Sviluppo**: Usare valori di test/dummy
- **Staging**: Usare i valori dell'ambiente di staging
- **Produzione**: Usare i valori di produzione

### 3. Ruotare i Segreti Regolarmente

- Cambiare le chiavi API periodicamente
- Aggiornare le password del database
- Rigenerare i segreti JWT

### 4. Usare la Gestione dei Segreti

Per i deployment in produzione, considerare:
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault

## Validazione

Creare uno script di validazione dell'ambiente:

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

Eseguire prima del deployment:

```bash
node scripts/validate-env.js
```

## Passi Successivi

- [Deployment Docker](/docs/deployment/docker) – Distribuire con Docker
- [Deployment Vercel](/docs/deployment/vercel) – Distribuire su Vercel
- [Monitoraggio](/docs/deployment/monitoring) – Monitorare il deployment
