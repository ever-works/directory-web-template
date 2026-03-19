---
id: ssl-domains
title: "SSL & Custom Domains"
sidebar_label: "SSL & Custom Domains"
sidebar_position: 2
---

# SSL & Custom Domains

This guide covers custom domain setup, SSL certificate management, DNS configuration, and multi-domain support for the Ever Works Template. The template ships with production-grade security headers and is optimized for Vercel deployment with automatic HTTPS, but also supports self-hosted environments with manual SSL configuration.

## Built-In Security Headers

The template configures a comprehensive set of security headers in `next.config.ts` that are applied to every route automatically. These headers enforce HTTPS, prevent common web attacks, and control resource loading.

### Complete Header Configuration

The full headers block from `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';",
        },
      ],
    },
  ];
}
```

### Header Breakdown

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing attacks |
| `X-Frame-Options` | `DENY` | Blocks clickjacking by preventing iframe embedding |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls how much referrer information is shared |
| `X-DNS-Prefetch-Control` | `on` | Enables DNS prefetching for faster page loads |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS for 2 years across all subdomains |
| `Content-Security-Policy` | See above | Restricts which resources the browser can load |

### HSTS Details

The Strict-Transport-Security header uses the maximum recommended configuration:

- **max-age=63072000** -- browsers remember to use HTTPS for 2 years
- **includeSubDomains** -- all subdomains must also use HTTPS
- **preload** -- eligible for inclusion in browser HSTS preload lists

:::caution
Once HSTS with preload is active and your domain is submitted to the preload list, it is very difficult to undo. Ensure your SSL certificate is properly configured and auto-renewing before enabling preload.
:::

### Content Security Policy Breakdown

| Directive | Value | Effect |
|-----------|-------|--------|
| `default-src` | `'self'` | Only load resources from the same origin by default |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | Scripts from same origin, inline scripts, and LemonSqueezy payment SDK |
| `style-src` | `'self' 'unsafe-inline'` | Styles from same origin plus inline styles (needed for CSS-in-JS) |
| `img-src` | `'self' data: https:` | Images from same origin, data URIs, and any HTTPS source |
| `font-src` | `'self'` | Fonts only from same origin |
| `connect-src` | `'self' https:` | API calls to same origin and any HTTPS endpoint |
| `frame-ancestors` | `'none'` | Prevents the page from being embedded in frames |

## Custom Domain Setup

### Environment Variables for Domain Configuration

When configuring a custom domain, update these variables in your deployment environment:

```bash
# Application URL -- used for OAuth callbacks, canonical URLs, hreflang, sitemaps
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Cookie domain -- must match your domain for session cookies to work
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# Auth URL -- used by NextAuth for callbacks
NEXTAUTH_URL=https://yourdomain.com
```

The `NEXT_PUBLIC_APP_URL` variable is declared as critical in `scripts/check-env.js`:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: Automatic SSL

When deploying on Vercel, SSL certificates are provisioned and renewed automatically using Let's Encrypt. The process requires no manual configuration:

1. **Add your domain** in the Vercel project dashboard under Settings then Domains
2. **Configure DNS** to point to Vercel (see DNS Configuration below)
3. **Verify** -- Vercel automatically provisions the certificate once DNS resolves

Vercel supports:

- Automatic Let's Encrypt certificate provisioning
- Wildcard certificates for subdomains
- Automatic certificate renewal before expiry
- HTTP to HTTPS redirect (automatic)

### DNS Configuration

**For a root domain** (e.g., `example.com`):

```
Type:  A
Name:  @
Value: 76.76.21.21
```

**For a www subdomain** (e.g., `www.example.com`):

```
Type:  CNAME
Name:  www
Value: cname.vercel-dns.com
```

**DNS verification** after setting records:

```bash
# Check A record
dig yourdomain.com A +short

# Check CNAME record
dig www.yourdomain.com CNAME +short

# Multi-location propagation check
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

DNS propagation can take up to 48 hours, though most changes take effect within minutes.

### Self-Hosted: Nginx with Let's Encrypt

For self-hosted deployments behind Nginx, configure SSL termination at the proxy level:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Install and configure Certbot for automatic certificate management:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

## OAuth Callback URLs

When switching to a custom domain, update the callback URLs in each OAuth provider's console:

| Provider | Callback URL |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

The template automatically validates OAuth configuration at startup. From `auth.config.ts`:

```typescript
const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === 'google')
        ? { enabled: true, clientId: authConfig.google.clientId || '', ... }
        : { enabled: false },
      // ... other providers
    });
  } catch (error) {
    // Fallback to credentials only
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

If a provider is misconfigured, the template falls back gracefully to credentials-only authentication.

## Multi-Domain Support

The template supports multiple domains through the Next.js image optimization configuration:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

The `generateImageRemotePatterns()` utility dynamically generates remote image patterns, allowing images from configured external domains to be optimized by Next.js.

## Cookie Configuration

Cookie settings must align with your domain configuration:

```bash
# Development (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Production (custom domain)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Setting `COOKIE_SECURE=true` ensures cookies are only transmitted over HTTPS connections. This is essential for preventing session hijacking. The environment check script validates cookie configuration as part of the security category.

## Troubleshooting

### SSL Certificate Not Provisioning

1. Verify DNS records point to the correct destination
2. Disable any DNS proxy (e.g., Cloudflare proxy mode) that may intercept the ACME challenge
3. Wait for full DNS propagation (check with `dig` commands above)
4. Review the platform dashboard for specific certificate errors

### Mixed Content Warnings

If the browser reports mixed content after enabling HTTPS:

1. Ensure `NEXT_PUBLIC_APP_URL` starts with `https://`
2. Verify all external resource URLs use HTTPS
3. The CSP `img-src` and `connect-src` directives include `https:` by default

### OAuth Redirect Mismatch

If OAuth login fails with a redirect URI mismatch error:

1. Update the callback URL in each OAuth provider's developer console
2. Ensure `NEXTAUTH_URL` matches the exact domain including the protocol
3. Clear browser cookies and session storage before retrying

## Related Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Security headers, CSP, image remote patterns |
| `auth.config.ts` | OAuth provider configuration and callback setup |
| `scripts/check-env.js` | Environment variable validation for domain settings |
| `lib/seo/hreflang.ts` | Hreflang alternate link generation for i18n |
| `lib/utils/url-cleaner.ts` | Base URL utility using `NEXT_PUBLIC_APP_URL` |
