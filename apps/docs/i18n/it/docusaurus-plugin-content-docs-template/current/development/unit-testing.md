---
id: unit-testing
title: Test Unitari & Componenti
sidebar_label: Test Unitari
sidebar_position: 5
---

# Test Unitari & Componenti

Questa pagina copre i pattern e gli approcci per i test unitari di servizi, hook e componenti nel template Ever Works.

## Strategia di test

Il template Ever Works usa un approccio di test a livelli:

1. **Analisi statica** – TypeScript (`pnpm tsc --noEmit`) rileva gli errori di tipo
2. **Linting** – ESLint (`pnpm lint`) impone lo stile del codice
3. **Test E2E** – I test Playwright validano i flussi utente completi
4. **Test unitari** – Test mirati per la logica di business

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## Test dei servizi

I servizi in `lib/services/` contengono la logica di business principale.

```typescript
jest.mock('@/lib/db/queries', () => ({
  getSurveyBySlug: jest.fn(),
  createSurvey: jest.fn(),
}));

describe('SurveyService', () => {
  it('should generate unique slugs from titles', async () => {
    const result = await service.create({
      title: 'Customer Satisfaction',
      type: 'global',
      surveyJson: {},
    });
    expect(result.slug).toBe('customer-satisfaction');
  });
});
```

## Test degli hook

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

## Test dei componenti

### Componenti presentazionali

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('mostra valore e etichetta stat', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
});
```

### Componenti con traduzioni

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

## Pattern di mocking

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
