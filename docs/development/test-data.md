---
id: test-data
title: Test Data & Fixtures
sidebar_label: Test Data & Fixtures
sidebar_position: 6
---

# Test Data & Fixtures

The Ever Works template provides several mechanisms for generating and managing test data across development, seeding, and E2E testing contexts. This page covers dummy data, database seeds, E2E fixtures, and strategies for maintaining data consistency.

## E2E Test Data (`e2e/helpers/test-data.ts`)

The E2E test suite defines its test data through a centralized helper module:

```typescript
export const TEST_DATA = {
  get ADMIN_EMAIL()    { return requireEnv('SEED_ADMIN_EMAIL'); },
  get ADMIN_PASSWORD() { return requireEnv('SEED_ADMIN_PASSWORD'); },
  CLIENT_PASSWORD: 'TestClient123!',
  generateClientEmail: () =>
    `e2e-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
  generateItemName: () =>
    `E2E Test Item ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  generateItemUrl: () =>
    `https://e2e-test-${Date.now()}.example.com`,
};
```

### Key Design Decisions

- **Admin credentials from env** -- Admin email and password are read from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` environment variables, ensuring tests use the same credentials as the seeded admin user.
- **Unique client data** -- Client emails and item names include timestamps and random suffixes to avoid collisions across parallel test runs.
- **Lazy evaluation** -- Admin credentials use getter functions that throw immediately if env vars are missing, catching configuration errors early.

### Public Routes Registry

The test data module also defines all public routes for navigation testing:

```typescript
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/discover/1', name: 'Discover Page 1' },
  { path: '/categories', name: 'Categories' },
  { path: '/tags', name: 'Tags' },
  { path: '/collections', name: 'Collections' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/about', name: 'About' },
  { path: '/help', name: 'Help' },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/terms-of-service', name: 'Terms of Service' },
  { path: '/cookies', name: 'Cookies' },
  { path: '/auth/signin', name: 'Sign In' },
  { path: '/auth/register', name: 'Register' },
];
```

## E2E Auth State Fixtures

Authentication state is managed through Playwright storage state files:

```
e2e/auth-states/
  admin.json    # Serialized admin session (cookies, localStorage)
  client.json   # Serialized client session
```

These files are generated during `global-setup.ts` by programmatically signing in with admin and client credentials. The auth fixture (`e2e/fixtures/auth.fixture.ts`) provides pre-authenticated browser contexts:

- `adminContext` / `adminPage` -- Browser context with admin session loaded
- `clientContext` / `clientPage` -- Browser context with client session loaded

Test files import the custom `test` object instead of Playwright's default:

```typescript
import { test, expect } from '@/e2e/fixtures';

test('admin can view dashboard', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading')).toContainText('Dashboard');
});
```

## Database Seeding

### Seed Script (`lib/db/seed.ts`)

The database seed script is executed via `pnpm db:seed` and populates the database with initial data required for the application to function:

- **Admin user** -- Created from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` environment variables
- **Fake users** -- Generated based on `SEED_FAKE_USER_COUNT` (default: 10)
- **Demo data** -- When `NEXT_PUBLIC_DEMO=true`, comprehensive demo data is seeded for all features

The seed script is idempotent -- it checks for existing data before inserting to avoid duplicates on re-runs.

### Demo Mode

When `NEXT_PUBLIC_DEMO=true`, the seed script generates:

- Multiple users with varied roles and profiles
- Sample items across different categories and statuses
- Comments, votes, and engagement data
- Sponsor ad submissions in various states
- Survey definitions with sample responses

## Data Consistency Strategies

### Isolation Between Test Runs

E2E tests use several strategies to avoid data interference:

1. **Unique identifiers** -- All generated test data includes timestamps to prevent naming collisions
2. **Per-test cleanup** -- Tests that create data should clean up after themselves
3. **Separate auth contexts** -- Admin and client tests run in isolated browser contexts
4. **Global setup/teardown** -- `global-setup.ts` prepares the auth state, `global-teardown.ts` handles cleanup

### Development vs Testing vs Production

| Concern | Development | Testing (E2E) | Production |
|---------|------------|---------------|------------|
| Database | SQLite (`file:./dev.db`) or Postgres | Same as dev (reused server) | Postgres |
| Content | Cloned from `DATA_REPOSITORY` | Pre-existing content from dev | Git-based CMS |
| Users | Seeded admin + fake users | Same as dev + E2E-generated users | Real users |
| Demo data | When `NEXT_PUBLIC_DEMO=true` | Relies on seeded demo data | `NEXT_PUBLIC_DEMO=false` |

### Best Practices

1. **Always seed before testing** -- Run `pnpm db:seed` before E2E tests to ensure the admin user exists
2. **Use unique data generators** -- Never hard-code item names or emails in tests
3. **Check for environment variables** -- The `requireEnv()` helper provides clear error messages when required variables are missing
4. **Keep fixtures minimal** -- Auth state files contain only the necessary cookies and storage entries
5. **Avoid cross-test dependencies** -- Each spec file should be independently runnable

## Environment Variables for Testing

```bash
# Required for E2E tests
SEED_ADMIN_EMAIL=admin@changeme.com
SEED_ADMIN_PASSWORD=changeme_password

# Optional
BASE_URL=http://localhost:3000
SEED_FAKE_USER_COUNT=10
NEXT_PUBLIC_DEMO=true
```

## Related Files

- `e2e/helpers/test-data.ts` -- Test data generators and constants
- `e2e/fixtures/auth.fixture.ts` -- Authentication fixtures for Playwright
- `e2e/global-setup.ts` -- Pre-test authentication setup
- `e2e/global-teardown.ts` -- Post-test cleanup
- `lib/db/seed.ts` -- Database seeding script
- `.env.example` -- Full environment variable reference
