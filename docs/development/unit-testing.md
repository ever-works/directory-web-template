---
id: unit-testing
title: Unit & Component Testing
sidebar_label: Unit Testing
sidebar_position: 5
---

# Unit & Component Testing

This page covers patterns and approaches for unit testing services, hooks, and components in the Ever Works template. While the primary test suite is E2E-based (see [E2E Testing](./e2e-testing.md)), the codebase is structured to support unit and component testing with standard tooling.

## Testing Strategy

The Ever Works template uses a layered testing approach:

1. **Static analysis** -- TypeScript (`pnpm tsc --noEmit`) catches type errors at compile time
2. **Linting** -- ESLint (`pnpm lint`) enforces code style and catches common bugs
3. **E2E tests** -- Playwright tests validate full user flows across the application
4. **Unit tests** -- Targeted tests for business logic, services, and utilities

For most changes, the recommended validation command chain is:

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## Testing Services

Services in `lib/services/` contain the core business logic and are the highest-value targets for unit testing.

### Service Architecture

Services follow a consistent pattern that makes them testable:

```typescript
// lib/services/survey.service.ts
export class SurveyService {
  async create(data: CreateSurveyData): Promise<Survey> { ... }
  async getBySlug(slug: string): Promise<Survey | null> { ... }
  async getMany(filters?: SurveyFilters): Promise<...> { ... }
  async update(id: string, data: UpdateSurveyData): Promise<Survey> { ... }
  async delete(id: string): Promise<void> { ... }
}

export const surveyService = new SurveyService();
```

### Mocking Database Queries

Services depend on database queries from `lib/db/queries/`. Mock these at the module level:

```typescript
// Example test approach
import { SurveyService } from '@/lib/services/survey.service';

// Mock the queries module
jest.mock('@/lib/db/queries', () => ({
  getSurveyBySlug: jest.fn(),
  getSurveyById: jest.fn(),
  createSurvey: jest.fn(),
  updateSurvey: jest.fn(),
  deleteSurvey: jest.fn(),
  getSurveyResponseCount: jest.fn(),
  getSurveys: jest.fn(),
}));

describe('SurveyService', () => {
  const service = new SurveyService();

  it('should generate unique slugs from titles', async () => {
    const queries = require('@/lib/db/queries');
    queries.getSurveyBySlug.mockResolvedValue(null);
    queries.createSurvey.mockImplementation((data) =>
      Promise.resolve({ id: 'test-id', ...data })
    );

    const result = await service.create({
      title: 'Customer Satisfaction',
      type: 'global',
      surveyJson: {},
    });

    expect(result.slug).toBe('customer-satisfaction');
  });

  it('should prevent deletion of surveys with responses', async () => {
    const queries = require('@/lib/db/queries');
    queries.getSurveyById.mockResolvedValue({ id: 'survey-1' });
    queries.getSurveyResponseCount.mockResolvedValue(5);

    await expect(service.delete('survey-1')).rejects.toThrow(
      'Cannot delete survey with 5 responses'
    );
  });
});
```

### Mocking the REST Client

For CRM-related services, mock the `TwentyCrmRestClient`:

```typescript
import { TwentyCrmSyncService } from '@/lib/services/twenty-crm-sync.service';

const mockRestClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

const mockMappingRepo = {
  findByEverId: jest.fn(),
  upsertMapping: jest.fn(),
  upsertManyMappings: jest.fn(),
};

const service = new TwentyCrmSyncService(
  mockRestClient as any,
  mockMappingRepo as any,
);
```

## Testing Hooks

Custom hooks in `hooks/` wrap React Query and other state management. Test them with `@testing-library/react-hooks` or `renderHook`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Example: testing a data-fetching hook
it('should fetch admin stats', async () => {
  const { result } = renderHook(() => useAdminStats(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## Testing Components

### Presentational Components

Most components in `components/ui/` are presentational and can be tested with React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### Components with Translations

Components using `next-intl` require a message provider in tests:

```typescript
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/en.json';

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}
```

## Mocking Patterns

### Database (Drizzle ORM)

```typescript
jest.mock('@/lib/db/drizzle', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
  },
}));
```

### Configuration Service

```typescript
jest.mock('@/lib/config/config-service', () => ({
  configService: {
    core: { APP_URL: 'http://localhost:3000', NODE_ENV: 'test' },
    payment: { stripe: { secretKey: 'test_key' } },
    email: { EMAIL_SUPPORT: 'test@test.com' },
  },
}));
```

### Next.js Router

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/en/admin',
  useParams: () => ({ locale: 'en' }),
}));
```

## Recommended Libraries

| Library | Purpose |
|---------|---------|
| Jest or Vitest | Test runner and assertion library |
| `@testing-library/react` | Component rendering and queries |
| `@testing-library/user-event` | Simulating user interactions |
| `msw` (Mock Service Worker) | API mocking for integration tests |

## Related Files

- `lib/services/` -- Business logic services (primary unit test targets)
- `lib/repositories/` -- Data access layer
- `hooks/` -- Custom React hooks
- `components/ui/` -- Shared presentational components
