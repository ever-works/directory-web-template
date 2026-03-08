# Environment Setup

This guide covers the complete environment configuration for the Ever Works, including all optional services and integrations.

## Environment File Structure

Create a `.env.local` file in your project root with the following structure:

```bash
# ============================================
# BASIC CONFIGURATION
# ============================================
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ============================================
# AUTHENTICATION & SECURITY
# ============================================
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Cookie Security
COOKIE_SECRET="your-secure-cookie-secret"
COOKIE_DOMAIN="localhost"
COOKIE_SECURE=false
COOKIE_SAME_SITE="lax"

# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://user:password@localhost:5432/everworks"

# ============================================
# GITHUB INTEGRATION
# ============================================
GH_TOKEN="github_pat_your_token_here"
DATA_REPOSITORY="https://github.com/your-username/awesome-data"

# ============================================
# OAUTH PROVIDERS
# ============================================
# Google
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Facebook
FACEBOOK_CLIENT_ID="your-facebook-app-id"
FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"

# Twitter/X
TWITTER_CLIENT_ID="your-twitter-client-id"
TWITTER_CLIENT_SECRET="your-twitter-client-secret"

# Microsoft
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

# ============================================
# PAYMENT PROCESSING
# ============================================
# Stripe
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID="price_your_pro_price_id"
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID="price_your_sponsor_price_id"

# LemonSqueezy
LEMONSQUEEZY_API_KEY="your-lemonsqueezy-api-key"
LEMONSQUEEZY_STORE_ID="your-store-id"
LEMONSQUEEZY_WEBHOOK_SECRET="your-webhook-secret"
NEXT_PUBLIC_LEMONSQUEEZY_PRO_PRODUCT_ID="your-pro-product-id"
NEXT_PUBLIC_LEMONSQUEEZY_SPONSOR_PRODUCT_ID="your-sponsor-product-id"

# ============================================
# EMAIL SERVICES
# ============================================
# Resend
RESEND_API_KEY="re_your_resend_api_key"
SUPPORT_EMAIL="support@yourdomain.com"

# Novu (Alternative)
NOVU_API_KEY="your-novu-api-key"
NOVU_APP_ID="your-novu-app-id"

# ============================================
# ANALYTICS & MONITORING
# ============================================
# PostHog
NEXT_PUBLIC_POSTHOG_KEY="phc_your_posthog_key"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
POSTHOG_SESSION_RECORDING_ENABLED=true
POSTHOG_AUTO_CAPTURE=false

# Sentry
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
SENTRY_ENABLE_DEV=false
SENTRY_DEBUG=false

# ============================================
# RECAPTCHA
# ============================================
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
RECAPTCHA_SECRET_KEY="6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"

# ============================================
# SUPABASE (OPTIONAL)
# ============================================
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

## Required vs Optional Variables

### Required (Minimum Setup)
```bash
NODE_ENV=development
AUTH_SECRET="your-generated-secret"
GH_TOKEN="your-github-token"
DATA_REPOSITORY="https://github.com/your-username/awesome-data"
```

### Recommended for Development
```bash
DATABASE_URL="postgresql://..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="..."
RECAPTCHA_SECRET_KEY="..."
```

### Production Required
```bash
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
COOKIE_SECURE=true
COOKIE_SAME_SITE="strict"
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_POSTHOG_KEY="..."
NEXT_PUBLIC_SENTRY_DSN="..."
```

## Generating Secrets

### Authentication Secret
```bash
openssl rand -base64 32
```

### Cookie Secret
```bash
openssl rand -base64 32
```

### JWT Secrets (if using custom JWT)
```bash
openssl rand -base64 64
```

## Service Setup Guides

### GitHub Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:user`, `user:email`
4. Copy token to `GH_TOKEN`

### Google OAuth
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### Stripe Setup
1. Create account at [Stripe](https://stripe.com)
2. Get API keys from Dashboard → Developers → API keys
3. Create products and prices
4. Set up webhooks pointing to `/api/stripe/webhook`
5. Copy webhook secret

### Database Setup

#### Local PostgreSQL
```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Create database
createdb everworks

# Set DATABASE_URL
DATABASE_URL="postgresql://username:password@localhost:5432/everworks"
```

#### Supabase (Recommended)
1. Create project at [Supabase](https://supabase.com)
2. Get connection string from Settings → Database
3. Copy API keys from Settings → API

## Environment Validation

The template includes environment validation. Run this to check your setup:

```bash
npm run check-env
```

This will verify:
- Required variables are present
- Secrets are properly formatted
- External services are accessible
- Database connection works

## Development vs Production

### Development Settings
```bash
NODE_ENV=development
COOKIE_SECURE=false
COOKIE_SAME_SITE="lax"
SENTRY_ENABLE_DEV=false
```

### Production Settings
```bash
NODE_ENV=production
COOKIE_SECURE=true
COOKIE_SAME_SITE="strict"
CORS_ORIGIN="https://yourdomain.com"
```

## Security Best Practices

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use different secrets** for each environment
3. **Rotate secrets regularly** in production
4. **Use environment-specific OAuth apps**
5. **Enable HTTPS** in production
6. **Restrict CORS origins** in production

## Troubleshooting

### Common Issues

**Missing AUTH_SECRET**
```bash
Error: Please define a secret
```
Solution: Generate and set `AUTH_SECRET`

**Database Connection Failed**
```bash
Error: Connection refused
```
Solution: Check `DATABASE_URL` and ensure database is running

**GitHub API Rate Limit**
```bash
Error: API rate limit exceeded
```
Solution: Ensure `GH_TOKEN` is set and valid

**OAuth Redirect Mismatch**
```bash
Error: redirect_uri_mismatch
```
Solution: Update OAuth app settings with correct URLs

## Next Steps

Once your environment is configured:

1. [Deploy your first version](./first-deployment)
2. [Set up monitoring](../deployment/monitoring)
