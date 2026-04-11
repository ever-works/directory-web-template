---
id: troubleshooting
title: Guide de dépannage
sidebar_label: Dépannage
sidebar_position: 7
---

# Guide de dépannage

This guide covers common errors, debugging techniques, log interpretation, and environment issues for the Ever Works Template. Issues are organized by category with symptoms, causes, and solutions.

## Build Issues

### Module not found during build

**Symptoms**: Build fails with `Module not found: Can't resolve 'postgres'` or similar Node.js native module errors.

**Cause**: Webpack attempts to bundle server-only modules for the client bundle.

**Solution**: Verify the module is listed in `serverExternalPackages` in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

If you added a new server-only dependency, add it to this array.

### Static page generation timeout

**Symptoms**: Build fails with `Error: Timeout of 180000ms exceeded` during static generation.

**Cause**: Pages that fetch external data during build time exceed the timeout.

**Solution**: The template sets a 3-minute timeout:

```typescript
staticPageGenerationTimeout: 180,
```

For pages that need more time, increase this value. Alternatively, switch slow pages to dynamic rendering:

```typescript
export const dynamic = 'force-dynamic';
```

### Content directory missing during build

**Symptoms**: Build fails because `.content/data` does not exist.

**Cause**: The Git-based CMS content has not been cloned. The `scripts/clone.cjs` script runs during `predev` and `prebuild` hooks.

**Solution**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### Webpack warnings from Supabase, bcryptjs, postgres, stripe

**Symptoms**: Build produces warnings about these packages but completes successfully.

**Cause**: Known warnings from packages that reference Node.js APIs not available in the browser.

**Solution**: These are already suppressed in `next.config.ts`:

```typescript
config.ignoreWarnings = [
	{ module: /@supabase\/realtime-js/ },
	{ module: /@supabase\/supabase-js/ },
	{ module: /bcryptjs/ },
	{ message: /bcryptjs/ },
	{ module: /postgres/ },
	{ module: /stripe/ }
];
```

No action needed -- warnings do not affect the build output.

### JavaScript heap out of memory

**Symptoms**: Build crashes with `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`.

**Solution**: The build scripts already allocate 8 GB:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

If the build still runs out of memory, check for:

- Excessive static page generation (reduce pages built at build time)
- Large dependencies not tree-shaken properly
- Memory leaks in build-time scripts

## Database Issues

### Connection refused to PostgreSQL

**Symptoms**: Application fails with `connection refused`, `ECONNREFUSED`, or `connect ETIMEDOUT`.

**Diagnostic steps**:

1. Verify `DATABASE_URL` in `.env.local`:
    ```bash
    node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL ? 'Set' : 'Missing')"
    ```
2. Test the connection directly: `psql $DATABASE_URL -c "SELECT 1"`
3. Check that PostgreSQL is running: `pg_isready`

**Common causes and fixes**:

| Cause                  | Fix                                             |
| ---------------------- | ----------------------------------------------- |
| PostgreSQL not running | Start the service                               |
| Wrong port             | Verify the port in your connection string       |
| Missing database       | `createdb your_database_name`                   |
| Auth failure           | Check username/password in `DATABASE_URL`       |
| SSL required           | Add `?sslmode=require` to the connection string |

### Migration failed

**Symptoms**: `pnpm db:migrate` fails with schema or SQL errors.

**Solution**: Use the verbose CLI migration tool for debugging:

```bash
pnpm db:migrate:cli
```

This shows:

1. Current migration state (list of applied migrations)
2. Detailed migration execution output
3. Schema verification after migration

If migrations are corrupted, check the Drizzle tracking table:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### Database initialization failed in instrumentation

**Symptoms**: Console shows `[Instrumentation] Database initialization failed` on startup.

**Cause**: The `instrumentation.ts` hook runs migration and seeding at startup. Failure indicates a database connectivity or schema issue.

**Behavior by environment**:

| Environment | On Failure                             |
| ----------- | -------------------------------------- |
| Production  | Throws error, deployment serves 503    |
| Development | Logs warning, app starts for debugging |
| Preview     | Logs warning, app starts for debugging |

From `instrumentation.ts`:

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### Seed stuck in "seeding" state

**Symptoms**: Application logs `[DB Init] Another instance is seeding` repeatedly.

**Cause**: A previous seed operation crashed without updating the status.

**Solution**: The initialization code automatically handles stale seeds after 5 minutes:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

To resolve immediately, manually update the seed status:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

Then restart the application.

## Authentication Issues

### AUTH_SECRET not set

**Symptoms**: Application crashes with `AUTH_SECRET is not set` or session errors.

**Solution**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### OAuth callback URL mismatch

**Symptoms**: OAuth login redirects to an error page with `redirect_uri_mismatch`.

**Solution**: The callback URL in your OAuth provider console must match exactly:

| Provider | Callback URL                                        |
| -------- | --------------------------------------------------- |
| Google   | `https://yourdomain.com/api/auth/callback/google`   |
| GitHub   | `https://yourdomain.com/api/auth/callback/github`   |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter  | `https://yourdomain.com/api/auth/callback/twitter`  |

For local development, use `http://localhost:3000/api/auth/callback/<provider>`.

### OAuth providers not appearing

**Symptoms**: Only credentials login is shown, OAuth buttons are missing.

**Cause**: OAuth providers fall back to disabled if configuration fails. From `auth.config.ts`:

```typescript
} catch (error) {
  // Fallback to credentials only
  return createNextAuthProviders({
    credentials: { enabled: true },
    google: { enabled: false },
    github: { enabled: false },
    facebook: { enabled: false },
    twitter: { enabled: false },
  });
}
```

**Solution**: Check that both `CLIENT_ID` and `CLIENT_SECRET` are set for each provider. The environment check script validates OAuth pairs:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### Sessions expiring unexpectedly

**Common causes**:

| Cause                  | Solution                                             |
| ---------------------- | ---------------------------------------------------- |
| `AUTH_SECRET` changed  | Changing the secret invalidates all sessions         |
| Cookie domain mismatch | Set `COOKIE_DOMAIN` to match your deployment domain  |
| HTTPS mismatch         | Set `COOKIE_SECURE=false` for local HTTP development |

## Deployment Issues

### Vercel build fails but local build succeeds

**Checklist**:

1. All required environment variables set in Vercel dashboard
2. `DATABASE_URL` accessible from Vercel's network
3. Node.js version compatible (requires 20.19.0 or higher)
4. Content directory exists (CI creates `.content/data` automatically)
5. Memory allocation sufficient

### Vercel cron jobs not executing

**Symptoms**: Scheduled endpoints in `vercel.json` do not run.

**Diagnostic steps**:

1. Verify `vercel.json` is in the project root with correct paths:
    ```json
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" }
    ```
2. Confirm Vercel plan supports cron (Pro or Enterprise)
3. Check Vercel Dashboard under the Cron Jobs tab for execution logs
4. Test the endpoint manually: `curl https://yourdomain.com/api/cron/sync`

### Build-time migration fails on Vercel

**Symptoms**: Build log shows `[Build Migration] Migration error`.

**Behavior**: The `scripts/build-migrate.ts` script handles different scenarios:

- **Production**: All failures cause build failure
- **Preview with connection error**: Build continues with a warning
- **Preview with auth error**: Build fails (misconfiguration)

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

To skip build-time migrations entirely:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## Internationalization Issues

### Translation keys shown instead of text

**Symptoms**: Pages display `common.WELCOME` instead of "Welcome".

**Solution**:

1. Verify the translation file exists: `messages/<locale>.json`
2. Check that the key path matches the namespace used in `useTranslations`
3. The fallback system uses `deepmerge` to merge locale messages with English defaults:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

If a key is missing from the locale file, the English fallback should provide it.

### Locale routing returns 404

**Symptoms**: URLs like `/fr/discover` return a 404 page.

**Solution**: Verify the locale is in the `LOCALES` array in `lib/constants.ts`:

```typescript
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
```

And verify the routing configuration in `i18n/routing.ts`:

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## Log Interpretation

### Log Prefixes

| Prefix              | Source                              | Location                   |
| ------------------- | ----------------------------------- | -------------------------- |
| `[Instrumentation]` | App startup (DB init, Sentry)       | `instrumentation.ts`       |
| `[Migration]`       | Database migration execution        | `lib/db/migrate.ts`        |
| `[DB Init]`         | Database initialization and seeding | `lib/db/initialize.ts`     |
| `[Build Migration]` | Build-time migration script         | `scripts/build-migrate.ts` |
| `[Layout]`          | Root layout data fetching errors    | `app/[locale]/layout.tsx`  |

### Sentry Error Tags

Sentry errors from instrumentation include these tags for filtering:

| Tag           | Values                                    |
| ------------- | ----------------------------------------- |
| `component`   | `instrumentation`                         |
| `phase`       | `database_init`                           |
| `environment` | `production`, `preview`, or `development` |

## Diagnostic Commands

| Task                     | Command                             |
| ------------------------ | ----------------------------------- |
| Check TypeScript errors  | `pnpm tsc --noEmit`                 |
| Run linter               | `pnpm lint`                         |
| Validate environment     | `node scripts/check-env.js`         |
| Quick environment check  | `node scripts/check-env.js --quick` |
| Test database connection | `pnpm db:studio`                    |
| View migration state     | `pnpm db:migrate:cli`               |
| Generate new migrations  | `pnpm db:generate`                  |
| Apply pending migrations | `pnpm db:migrate`                   |
| Seed database            | `pnpm db:seed`                      |
| Clean build cache        | `rm -rf .next`                      |
| Full rebuild             | `rm -rf .next && pnpm build`        |
| Reset database           | `node scripts/clean-database.js`    |

## Getting Help

1. Search [GitHub Issues](https://github.com/ever-works/directory-web-template/issues)
2. Review the `CLAUDE.md` file for AI-assisted development guidelines
3. Check Sentry dashboard for error details (if configured)
4. For security issues, email security@ever.co privately