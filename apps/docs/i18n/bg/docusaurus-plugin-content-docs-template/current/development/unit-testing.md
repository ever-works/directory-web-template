---
id: unit-testing
title: Единично и Компонентно Тестване
sidebar_label: Единично Тестване
sidebar_position: 5
---

# Единично и Компонентно Тестване

Тази страница обхваща шаблони и подходи за единично тестване на услуги, куки и компоненти в шаблона Ever Works. Въпреки че основният набор от тестове е базиран на E2E (вижте [E2E тестване](./e2e-testing.md)), кодовата база е структурирана за поддръжка на единично тестване и тестване на компоненти чрез стандартни инструменти.

## Стратегия за Тестване

Шаблонът Ever Works използва многослоен подход към тестването:

1. **Статичен анализ** — TypeScript (`pnpm tsc --noEmit`) открива грешки в типовете по време на компилация
2. **Lint** — ESLint (`pnpm lint`) прилага стила на кода и открива чести грешки
3. **E2E тестове** — Тестовете на Playwright валидират пълни потребителски сценарии в приложението
4. **Единични тестове** — Целеви тестове на бизнес логика, услуги и помощни функции

За повечето промени препоръчителната верига от команди за валидация е:

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## Тестване на Услуги

Услугите в `lib/services/` съдържат основната бизнес логика и са най-ценните цели за единично тестване.

### Архитектура на Услугите

Услугите следват последователен шаблон, правещ ги тестваеми:

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

### Мокиране на Заявки към Базата Данни

Услугите зависят от заявки към базата данни от `lib/db/queries/`. Мокирайте ги на ниво модул:

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

### Мокиране на REST Клиент

За CRM услуги мокирайте `TwentyCrmRestClient`:

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

## Тестване на Куки

Потребителските куки в `hooks/` обвиват React Query и друго управление на състоянието. Тествайте ги с `@testing-library/react-hooks` или `renderHook`:

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

// Пример: тестване на кука за зареждане на данни
it('should fetch admin stats', async () => {
  const { result } = renderHook(() => useAdminStats(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## Тестване на Компоненти

### Презентационни Компоненти

Повечето компоненти в `components/ui/` са презентационни и могат да се тестват с React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### Компоненти с Преводи

Компонентите, използващи `next-intl`, изискват доставчик на съобщения в тестовете:

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

## Шаблони за Мокиране

### База Данни (Drizzle ORM)

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

### Услуга за Конфигурация

```typescript
jest.mock('@/lib/config/config-service', () => ({
  configService: {
    core: { APP_URL: 'http://localhost:3000', NODE_ENV: 'test' },
    payment: { stripe: { secretKey: 'test_key' } },
    email: { EMAIL_SUPPORT: 'test@test.com' },
  },
}));
```

### Рутер на Next.js

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/en/admin',
  useParams: () => ({ locale: 'en' }),
}));
```

## Препоръчани Библиотеки

| Библиотека                     | Предназначение                                            |
|--------------------------------|----------------------------------------------------------|
| Jest или Vitest                | Стартиращ тестовете и библиотека за твърдения            |
| `@testing-library/react`       | Рендериране на компоненти и заявки                        |
| `@testing-library/user-event`  | Симулиране на потребителски взаимодействия               |
| `msw` (Mock Service Worker)    | Мокиране на API за интеграционни тестове                  |

## Свързани Файлове

- `lib/services/` — Услуги за бизнес логика (основни цели за единично тестване)
- `lib/repositories/` — Слой за достъп до данни
- `hooks/` — Потребителски React куки
- `components/ui/` — Общи презентационни компоненти
