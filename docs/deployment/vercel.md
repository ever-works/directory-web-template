---
id: vercel
title: Vercel Deployment
sidebar_label: Vercel
sidebar_position: 3
---

# Vercel Deployment

Deploy your Ever Works directory website to Vercel for fast, global distribution.

## Prerequisites

- Vercel account
- GitHub repository with your Ever Works project

## Quick Deployment

### 1. Connect Repository

1. Visit [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `website` folder as the root directory

### 2. Configure Build Settings

Vercel will automatically detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `website`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. Environment Variables

Add your environment variables in the Vercel dashboard:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=your-database-url

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.vercel.app

# OAuth Providers (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Deploy

Click "Deploy" and Vercel will build and deploy your site automatically.

## Database (Neon via the Vercel Marketplace)

The directory needs a PostgreSQL database. The simplest production setup
is to add **Neon** from the Vercel Marketplace — it provisions the
database and injects the connection string into your project's
environment variables for you.

1. In your Vercel project: **Storage** (or **Integrations**) → **Add** →
   **Neon** → connect it to this project.
2. In the integration's **Configure** dialog, set the options below.

### Integration settings that matter

| Setting | Recommended value | Why |
| ------- | ----------------- | --- |
| **Custom Environment Variable Prefix** | **`DATABASE`** | Neon injects the connection string as `DATABASE_URL` (plus `DATABASE_URL_UNPOOLED`, etc.). The app reads `DATABASE_URL` — a different prefix means it can't find the database. |
| **Create Database Branch for Deployment → Production** | **On** | Production deployments use/refresh the production database branch. |
| **Create Database Branch for Deployment → Preview** | **Off** ⚠️ | See the warning below — leaving this on is the most common way to run up a surprise Neon bill. |
| **Require Active Resource Before Deploy** | On | Fails the deploy early if the database isn't available, instead of shipping a broken site. |

:::warning Preview branches multiply — and so does the cost
When **"Create Database Branch for Deployment → Preview"** is enabled,
Vercel asks Neon to create a **new database branch for every preview
deployment** — i.e. one per pushed Git branch / pull request, named
`preview/<branch>`. Each branch has its own compute endpoint that
accrues compute-hours. On an active repo (many feature branches,
Dependabot PRs, CI branches) this can balloon into **hundreds of
branches** and a large bill very quickly. Unless you specifically need
an isolated database per preview, **keep the Preview checkbox off** and
let previews share the production (or a single dedicated) branch.

If you have already accumulated stray preview branches, delete them in
the Neon Console (**Branches**) or via the Neon API, keeping only the
branches you actually use (e.g. `main` and any long-lived
`preview/develop` / `preview/stage`).
:::

### Manual alternative

If you bring your own PostgreSQL (Neon, Supabase, RDS, self-hosted,
etc.), skip the integration and set `DATABASE_URL` yourself under
**Settings → Environment Variables** (see step 3 above).

## Custom Domain

### 1. Add Domain

In your Vercel project dashboard:
1. Go to "Settings" → "Domains"
2. Add your custom domain
3. Follow DNS configuration instructions

### 2. SSL Certificate

Vercel automatically provides SSL certificates for all domains.

## Advanced Configuration

### Vercel Configuration File

Create `vercel.json` in your project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "website/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/website/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Build Optimization

Optimize your build for Vercel:

```javascript
// next.config.js
module.exports = {
  // Enable static optimization
  output: 'standalone',
  
  // Optimize images
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable compression
  compress: true,
}
```

## Monitoring and Analytics

### Vercel Analytics

Enable Vercel Analytics in your project:

```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### Performance Monitoring

Monitor your deployment performance:
- Core Web Vitals
- Function execution times
- Build performance

## Troubleshooting

### Common Issues

1. **Build Failures**: Check build logs in Vercel dashboard
2. **Environment Variables**: Ensure all required variables are set
3. **Domain Issues**: Verify DNS configuration

### Debug Mode

Enable debug mode for detailed logs:

```bash
# In your environment variables
DEBUG=1
```

## Next Steps

- [Environment Variables](/docs/deployment/environment-variables) - Configure your deployment
- [Monitoring](/docs/deployment/monitoring) - Monitor your application
- [Support](/docs/advanced-guide/support) - Get deployment help
