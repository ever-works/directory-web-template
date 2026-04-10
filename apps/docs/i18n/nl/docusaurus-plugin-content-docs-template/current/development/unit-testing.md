---
id: unit-testing
title: Unit & Component Testing
sidebar_label: Unit Testing
sidebar_position: 5
---

# Unit & Component Testing

Deze pagina behandelt patronen en aanpakken voor unit testing van services, hooks en componenten in het Ever Works-sjabloon.

## Teststrategie

Het Ever Works-sjabloon gebruikt een gelaagde testbenadering:

1. **Statische analyse** – TypeScript (`pnpm tsc --noEmit`) detecteert typefouten
2. **Linting** – ESLint (`pnpm lint`) handhaaft codestijl
3. **E2E-tests** – Playwright-tests valideren volledige gebruikersstromen
4. **Unit tests** – Gerichte tests voor bedrijfslogica

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## Services testen

Services in `lib/services/` bevatten de kernbedrijfslogica.

```typescript
jest.mock('@/lib/db/queries', () => ({
  getSurveyBySlug: jest.fn(),
  createSurvey: jest.fn(),
}));

describe('SurveyService', () => {
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
});
```

## Hooks testen

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
```

## Componenten testen

### Presentatiecomponenten

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### Componenten met vertalingen

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

## Mockingpatronen

### Database (Drizzle ORM)

```typescript
jest.mock('@/lib/db/drizzle', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  },
}));
```
