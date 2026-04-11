---
id: unit-testing
title: Testy Jednostkowe i Komponentów
sidebar_label: Testy Jednostkowe
sidebar_position: 5
---

# Testy Jednostkowe i Komponentów

Ta strona obejmuje wzorce i podejścia do testów jednostkowych serwisów, hooków i komponentów w szablonie Ever Works. Chociaż główny zestaw testów jest oparty na E2E (patrz [Testy E2E](./e2e-testing.md)), baza kodu jest zorganizowana do obsługi testów jednostkowych i komponentów ze standardowymi narzędziami.

## Strategia Testowania

Szablon Ever Works używa warstwowego podejścia do testowania:

1. **Analiza statyczna** -- TypeScript (`pnpm tsc --noEmit`) wychwytuje błędy typów w czasie kompilacji
2. **Lintowanie** -- ESLint (`pnpm lint`) egzekwuje styl kodu i wychwytuje typowe błędy
3. **Testy E2E** -- Testy Playwright walidują pełne przepływy użytkownika w aplikacji
4. **Testy jednostkowe** -- Ukierunkowane testy logiki biznesowej, serwisów i narzędzi

Dla większości zmian zalecany łańcuch poleceń walidacji to:

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## Testowanie Serwisów

Serwisy w `lib/services/` zawierają główną logikę biznesową i są celami o najwyższej wartości dla testów jednostkowych.

### Architektura Serwisów

Serwisy podążają za spójnym wzorcem, który czyni je testowalnymi:

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

### Mockowanie Zapytań Bazy Danych

Serwisy zależą od zapytań bazy danych z `lib/db/queries/`. Mockuj je na poziomie modułu:

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

### Mockowanie Klienta REST

Dla serwisów związanych z CRM, mockuj `TwentyCrmRestClient`:

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

## Testowanie Hooków

Niestandardowe hooki w `hooks/` owijają React Query i inne zarządzanie stanem. Testuj je z `@testing-library/react-hooks` lub `renderHook`:

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

// Przykład: testowanie hooka pobierającego dane
it('should fetch admin stats', async () => {
  const { result } = renderHook(() => useAdminStats(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## Testowanie Komponentów

### Komponenty Prezentacyjne

Większość komponentów w `components/ui/` jest prezentacyjna i może być testowana z React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### Komponenty z Tłumaczeniami

Komponenty używające `next-intl` wymagają dostawcy wiadomości w testach:

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

## Wzorce Mockowania

### Baza Danych (Drizzle ORM)

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

### Serwis Konfiguracji

```typescript
jest.mock('@/lib/config/config-service', () => ({
  configService: {
    core: { APP_URL: 'http://localhost:3000', NODE_ENV: 'test' },
    payment: { stripe: { secretKey: 'test_key' } },
    email: { EMAIL_SUPPORT: 'test@test.com' },
  },
}));
```

### Router Next.js

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/en/admin',
  useParams: () => ({ locale: 'en' }),
}));
```

## Zalecane Biblioteki

| Biblioteka                     | Cel                                               |
|--------------------------------|---------------------------------------------------|
| Jest lub Vitest                | Runner testów i biblioteka asercji                |
| `@testing-library/react`       | Renderowanie komponentów i zapytania              |
| `@testing-library/user-event`  | Symulowanie interakcji użytkownika                |
| `msw` (Mock Service Worker)    | Mockowanie API dla testów integracyjnych          |

## Powiązane Pliki

- `lib/services/` -- Serwisy logiki biznesowej (główne cele testów jednostkowych)
- `lib/repositories/` -- Warstwa dostępu do danych
- `hooks/` -- Niestandardowe hooki React
- `components/ui/` -- Współdzielone komponenty prezentacyjne
