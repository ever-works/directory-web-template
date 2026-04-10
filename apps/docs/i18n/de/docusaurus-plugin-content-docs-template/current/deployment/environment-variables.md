---
id: environment-variables
title: Umgebungsvariablen
sidebar_label: Umgebungsvariablen
sidebar_position: 5
---

# Umgebungsvariablen

Konfigurieren Sie Ihr Ever Works-Deployment mit den richtigen Umgebungsvariablen.

## Erforderliche Variablen

### Anwendungseinstellungen

```bash
# Application Environment
NODE_ENV=production

# Application URL
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
NEXTAUTH_URL=https://your-domain.com
```

### Datenbankkonfiguration

```bash
# PostgreSQL Database
DATABASE_URL=postgresql://username:password@host:port/database

# Alternative: Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Authentifizierung

```bash
# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-key

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Optionale Variablen

### E-Mail-Konfiguration

```bash
# SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SendGrid (alternative)
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Analytik

```bash
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Plausible Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
```

### Speicher

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

## Plattformspezifische Einrichtung

### Vercel

Umgebungsvariablen im Vercel-Dashboard hinzufügen:

1. Zu Ihren Projekteinstellungen gehen
2. Zu „Umgebungsvariablen" navigieren
3. Jede Variable mit dem entsprechenden Bereich hinzufügen (Produktion, Vorschau, Entwicklung)

### Netlify

Umgebungsvariablen in Netlify hinzufügen:

1. Zu Website-Einstellungen → Umgebungsvariablen gehen
2. Jede Variable hinzufügen
3. Ihre Website erneut bereitstellen

### Docker

Eine `.env`-Datei erstellen:

```bash
# .env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/everworks
NEXTAUTH_SECRET=your-secret
# ... other variables
```

Mit Docker Compose verwenden:

```yaml
# docker-compose.yml
services:
  app:
    build: .
    env_file:
      - .env
    # ... other config
```

## Sicherheitsbest Practices

### 1. Secrets niemals committen

Zu `.gitignore` hinzufügen:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.staging
```

### 2. Unterschiedliche Werte pro Umgebung verwenden

- **Entwicklung**: Test-/Dummy-Werte verwenden
- **Staging**: Staging-Umgebungswerte verwenden
- **Produktion**: Produktionswerte verwenden

### 3. Secrets regelmäßig rotieren

- API-Schlüssel regelmäßig ändern
- Datenbankpasswörter aktualisieren
- JWT-Secrets neu generieren

### 4. Secret-Management verwenden

Für Produktions-Deployments in Betracht ziehen:
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault

## Validierung

Ein Umgebungsvalidierungsskript erstellen:

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

Vor der Bereitstellung ausführen:

```bash
node scripts/validate-env.js
```

## Nächste Schritte

- [Docker-Deployment](/docs/deployment/docker) – Mit Docker bereitstellen
- [Vercel-Deployment](/docs/deployment/vercel) – Auf Vercel bereitstellen
- [Überwachung](/docs/deployment/monitoring) – Ihr Deployment überwachen
