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
