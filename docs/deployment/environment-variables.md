---
id: environment-variables
title: Environment Variables
sidebar_label: Environment Variables
sidebar_position: 5
---

# Environment Variables

Configure your Ever Works deployment with the right environment variables.

## Required Variables

### Application Settings

```bash
# Application Environment
NODE_ENV=production

# Application URL
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
NEXTAUTH_URL=https://your-domain.com
```

### Database Configuration

```bash
# PostgreSQL Database
DATABASE_URL=postgresql://username:password@host:port/database

# Alternative: Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Authentication

```bash
# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-key

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Optional Variables

### Email Configuration

```bash
# SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SendGrid (alternative)
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Analytics

```bash
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Plausible Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
```

### Storage

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

## Platform-Specific Setup

### Vercel

Add environment variables in your Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable with appropriate scope (Production, Preview, Development)

### Netlify

Add environment variables in Netlify:

1. Go to Site settings → Environment variables
2. Add each variable
3. Redeploy your site

### Docker

Create a `.env` file:

```bash
# .env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/everworks
NEXTAUTH_SECRET=your-secret
# ... other variables
```

Use with Docker Compose:

```yaml
# docker-compose.yml
services:
  app:
    build: .
    env_file:
      - .env
    # ... other config
```

## Security Best Practices

### 1. Never Commit Secrets

Add to `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.staging
```

### 2. Use Different Values per Environment

- **Development**: Use test/dummy values
- **Staging**: Use staging environment values
- **Production**: Use production values

### 3. Rotate Secrets Regularly

- Change API keys periodically
- Update database passwords
- Regenerate JWT secrets

### 4. Use Secret Management

For production deployments, consider:
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault

## Validation

Create an environment validation script:

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

Run before deployment:

```bash
node scripts/validate-env.js
```

## Next Steps

- [Docker Deployment](/template/deployment/docker) - Deploy with Docker
- [Vercel Deployment](/template/deployment/vercel) - Deploy to Vercel
- [Monitoring](/template/deployment/monitoring) - Monitor your deployment
