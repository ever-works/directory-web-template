# First Deployment

This guide walks you through deploying your Ever Works to production for the first time.

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Completed [environment setup](./environment-setup)
- [ ] Tested locally with `npm run dev`
- [ ] Set up your data repository
- [ ] Configured at least one authentication provider
- [ ] Generated production secrets
- [ ] Prepared your domain (if using custom domain)

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides the best experience for Next.js applications.

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login to Vercel

```bash
vercel login
```

#### 3. Deploy

```bash
vercel
```

Follow the prompts:

- Link to existing project? **No**
- Project name: `your-project-name`
- Directory: `./` (current directory)
- Override settings? **No**

#### 4. Set Environment Variables

In the Vercel dashboard:

1. Go to your project → Settings → Environment Variables
2. Add all production environment variables
3. Set different values for Production, Preview, and Development

**Critical Production Variables:**

```bash
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
AUTH_SECRET=your-production-secret
DATABASE_URL=your-production-database-url
```

#### 5. Redeploy

```bash
vercel --prod
```

### Option 2: Netlify

#### 1. Build Settings

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 2. Deploy

Connect your GitHub repository to Netlify and configure build settings.

### Option 3: Railway

#### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

#### 2. Login and Deploy

```bash
railway login
railway init
railway up
```

### Option 4: DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure build settings:
    - Build command: `npm run build`
    - Run command: `npm start`
3. Set environment variables
4. Deploy

## Database Setup

### Option 1: Supabase (Recommended)

1. Create project at [Supabase](https://supabase.com)
2. Get connection string from Settings → Database
3. Run migrations:

```bash
# Set DATABASE_URL to your Supabase connection string
npm run db:migrate
npm run db:seed
```

### Option 2: PlanetScale

1. Create database at [PlanetScale](https://planetscale.com)
2. Get connection string
3. Run migrations

### Option 3: Neon

1. Create database at [Neon](https://neon.tech)
2. Get connection string
3. Run migrations

## Domain Configuration

### Custom Domain on Vercel

1. Go to project → Settings → Domains
2. Add your domain
3. Configure DNS records:
    - Type: `CNAME`
    - Name: `@` (or subdirectory)
    - Value: `cname.vercel-dns.com`

### SSL Certificate

SSL is automatically provided by most platforms. Verify HTTPS is working.

## OAuth Configuration

Update your OAuth applications with production URLs:

### Google OAuth

- Authorized JavaScript origins: `https://yourdomain.com`
- Authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`

### GitHub OAuth

- Homepage URL: `https://yourdomain.com`
- Authorization callback URL: `https://yourdomain.com/api/auth/callback/github`

### Stripe Webhooks

- Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `invoice.payment_succeeded`

## Post-Deployment Verification

### 1. Basic Functionality

- [ ] Homepage loads correctly
- [ ] Items display properly
- [ ] Search and filtering work
- [ ] Navigation functions

### 2. Authentication

- [ ] Sign in with configured providers
- [ ] User profiles are created
- [ ] Sessions persist correctly
- [ ] Sign out works

### 3. Content Management

- [ ] Content syncs from Git repository
- [ ] New submissions create pull requests
- [ ] Admin panel accessible (if configured)

### 4. Payment Processing (if configured)

- [ ] Checkout flow works
- [ ] Webhooks receive events
- [ ] Subscriptions are created
- [ ] Customer portal accessible

### 5. Performance

- [ ] Page load times < 3 seconds
- [ ] Images load properly
- [ ] No console errors
- [ ] Mobile responsiveness

## Monitoring Setup

### 1. Error Tracking

Verify Sentry is receiving errors:

```bash
# Test error tracking
curl -X POST https://yourdomain.com/api/test-error
```

### 2. Analytics

Verify PostHog is tracking events:

- Check PostHog dashboard for page views
- Test custom events
- Verify user identification

### 3. Uptime Monitoring

Set up monitoring with:

- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://pingdom.com)
- [StatusCake](https://statuscake.com)

## Performance Optimization

### 1. Enable Caching

Ensure these headers are set:

```javascript
// next.config.js
module.exports = {
	async headers() {
		return [
			{
				source: '/api/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=300, stale-while-revalidate=60'
					}
				]
			}
		];
	}
};
```

### 2. Image Optimization

Verify Next.js image optimization is working:

- Images are served in WebP format
- Proper sizing for different devices
- Lazy loading is enabled

### 3. Bundle Analysis

Analyze your bundle size:

```bash
npm run build
npm run analyze
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] Secure cookies in production
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation working
- [ ] SQL injection protection
- [ ] XSS protection enabled

## Backup Strategy

### 1. Database Backups

Set up automated backups:

- Daily database snapshots
- Point-in-time recovery
- Cross-region replication

### 2. Content Backups

Your content is already backed up in Git, but consider:

- Regular repository backups
- Multiple remote repositories
- Automated sync verification

## Rollback Plan

Prepare for issues:

1. **Keep previous deployment** available
2. **Database migration rollback** scripts
3. **DNS failover** configuration
4. **Monitoring alerts** for critical issues

## Common Deployment Issues

### Build Failures

**TypeScript errors:**

```bash
npm run type-check
```

**Missing dependencies:**

```bash
npm ci
```

**Environment variables:**

```bash
npm run check-env
```

### Runtime Errors

**Database connection:**

- Verify connection string
- Check firewall settings
- Ensure database is accessible

**Authentication issues:**

- Verify OAuth app settings
- Check redirect URLs
- Confirm secrets are set

### Performance Issues

**Slow page loads:**

- Enable caching
- Optimize images
- Check database queries

**High memory usage:**

- Monitor memory consumption
- Optimize React components
- Check for memory leaks

## Next Steps

After successful deployment:

1. [Set up monitoring](../deployment/monitoring)
2. [Review deployment documentation](../deployment/overview)

## Getting Help

If you encounter deployment issues:

- Review [deployment documentation](../deployment/overview)
- Join our [Discord community](https://discord.gg/ever)
- Create an [issue on GitHub](https://github.com/ever-works/directory-web-template/issues)
