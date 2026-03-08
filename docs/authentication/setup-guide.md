---
id: setup-guide
title: Authentication Setup Guide
sidebar_label: Setup Guide
sidebar_position: 2
---

# Authentication Setup Guide

This guide explains how to properly configure authentication in your Ever Works application.

## Required Environment Variables

Add these to your `.env.local` file:

```env
# ============================================
# AUTHENTICATION & SECURITY
# ============================================

## Next Auth
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Generating a Secure Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use the NextAuth CLI:

```bash
npx auth secret
```

## OAuth Provider Setup

To enable OAuth providers, add their credentials to your `.env.local`:

```env
## OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

### Getting OAuth Credentials

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret

#### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and generate Client Secret

#### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Set Valid OAuth Redirect URIs: `http://localhost:3000/api/auth/callback/facebook`
5. Copy App ID and App Secret

## ReCAPTCHA Setup

The template uses Google ReCAPTCHA v2 to protect forms from bots.

### Configuration

Add these variables to your `.env.local`:

```env
# ReCAPTCHA Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="your-recaptcha-site-key"
RECAPTCHA_SECRET_KEY="your-recaptcha-secret-key"
```

### Getting Keys

1. Go to the [Google ReCAPTCHA Console](https://www.google.com/recaptcha/admin/create)
2. Create a new site
3. Select **reCAPTCHA v2** -> **"I'm not a robot" Checkbox**
4. Add your domains (e.g., `localhost` for dev, `yourdomain.com` for prod)
5. Copy the **Site Key** (public) and **Secret Key** (private)

### Usage

ReCAPTCHA is automatically enabled on authentication forms when the keys are present. To disable it for a specific form component:

```tsx
<LoginForm showRecaptcha={false} />
```

## Supabase Auth Setup (Optional)

If using Supabase Auth instead of or alongside NextAuth:

```env
## Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Common Issues and Solutions

### 1. MissingSecret Error

**Error**: `MissingSecret: Please define a secret`

**Solution**: Ensure both `AUTH_SECRET` and `NEXTAUTH_SECRET` are defined in your `.env.local` file.

```bash
# Verify environment variables are loaded
grep -E "AUTH_SECRET|NEXTAUTH" .env.local
```

### 2. JWTSessionError

**Error**: `JWTSessionError: no matching decryption secret`

**Cause**: This happens when the secret changes after session cookies were created.

**Solution**:
1. Clear your browser cookies for localhost:3000
2. Clear Next.js cache: `rm -rf .next/cache`
3. Restart the development server
4. Use incognito/private browsing mode for testing

### 3. OAuth Redirect Mismatch

**Error**: `redirect_uri_mismatch`

**Solution**: Ensure the redirect URI in your OAuth provider settings matches exactly:
- Development: `http://localhost:3000/api/auth/callback/[provider]`
- Production: `https://yourdomain.com/api/auth/callback/[provider]`

### 4. Environment Variable Naming

The application uses both `AUTH_SECRET` (NextAuth v5) and `NEXTAUTH_SECRET` (NextAuth v4) for compatibility. Both should have the same value.

## Development vs Production

### Development
- The system can generate temporary secrets if missing (not recommended)
- Use `http://localhost:3000` for NEXTAUTH_URL
- Test mode for OAuth providers

### Production
- All secrets MUST be properly configured
- Use your production domain for NEXTAUTH_URL
- Production OAuth credentials required
- HTTPS is mandatory

## Security Best Practices

1. **Never commit secrets**: Keep `.env.local` in `.gitignore`
2. **Use strong secrets**: Always use cryptographically secure random values (32+ characters)
3. **Rotate secrets regularly**: Change secrets periodically, especially after team changes
4. **Different secrets per environment**: Use different secrets for dev/staging/production
5. **Secure storage**: Use environment variable management tools (Vercel, AWS Secrets Manager, etc.)
6. **HTTPS in production**: Always use HTTPS for production deployments
7. **Validate redirect URIs**: Whitelist only necessary redirect URIs

## Troubleshooting Steps

1. **Verify environment variables are loaded**:
   ```bash
   grep -E "AUTH_SECRET|NEXTAUTH" .env.local
   ```

2. **Clear all caches**:
   ```bash
   rm -rf .next/cache
   rm -rf .next/static
   ```

3. **Test in incognito mode** to avoid cookie conflicts

4. **Check logs** for specific error messages in the terminal

5. **Restart the development server** after changing environment variables

6. **Verify OAuth redirect URIs** match exactly in provider settings

## Next Steps

- [Authentication Overview](./overview) - Learn about the authentication architecture
- [Environment Variables](/docs/deployment/environment-variables) - Complete environment setup
- [Deployment](/docs/deployment) - Deploy your authenticated application

## Need Help?

If you're still experiencing issues, check our [support page](/docs/advanced-guide/support) or join our community.

