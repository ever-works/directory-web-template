---
id: unit-testing
title: Юнит-Тестирование и Компоненты
sidebar_label: Юнит-Тесты
sidebar_position: 5
---

# Юнит-Тестирование и Компоненты

Эта страница охватывает паттерны и подходы к юнит-тестированию сервисов, хуков и компонентов в шаблоне Ever Works. Хотя основной набор тестов основан на E2E (см. [E2E-тестирование](./e2e-testing.md)), кодовая база структурирована для поддержки юнит-тестирования и тестирования компонентов со стандартным инструментарием.

## Стратегия Тестирования

Шаблон Ever Works использует многоуровневый подход к тестированию:

1. **Статический анализ** -- TypeScript (`pnpm tsc --noEmit`) выявляет ошибки типов во время компиляции
2. **Линтинг** -- ESLint (`pnpm lint`) применяет стиль кода и выявляет распространённые ошибки
3. **E2E-тесты** -- Тесты Playwright валидируют полные пользовательские сценарии в приложении
4. **Юнит-тесты** -- Целевые тесты бизнес-логики, сервисов и утилит

Для большинства изменений рекомендуемая цепочка команд валидации:

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## Тестирование Сервисов

Сервисы в `lib/services/` содержат основную бизнес-логику и являются наиболее ценными целями для юнит-тестирования.

### Архитектура Сервисов

Сервисы следуют согласованному паттерну, делающему их тестируемыми:

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

### Мокирование Запросов к Базе Данных

Сервисы зависят от запросов к базе данных из `lib/db/queries/`. Мокируйте их на уровне модуля:

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

### Мокирование REST-клиента

Для CRM-сервисов мокируйте `TwentyCrmRestClient`:

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

## Тестирование Хуков

Пользовательские хуки в `hooks/` оборачивают React Query и другое управление состоянием. Тестируйте их с `@testing-library/react-hooks` или `renderHook`:

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

// Пример: тестирование хука загрузки данных
it('should fetch admin stats', async () => {
  const { result } = renderHook(() => useAdminStats(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## Тестирование Компонентов

### Презентационные Компоненты

Большинство компонентов в `components/ui/` являются презентационными и могут тестироваться с React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### Компоненты с Переводами

Компоненты, использующие `next-intl`, требуют провайдера сообщений в тестах:

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

## Паттерны Мокирования

### База Данных (Drizzle ORM)

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

### Сервис Конфигурации

```typescript
jest.mock('@/lib/config/config-service', () => ({
  configService: {
    core: { APP_URL: 'http://localhost:3000', NODE_ENV: 'test' },
    payment: { stripe: { secretKey: 'test_key' } },
    email: { EMAIL_SUPPORT: 'test@test.com' },
  },
}));
```

### Роутер Next.js

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/en/admin',
  useParams: () => ({ locale: 'en' }),
}));
```

## Рекомендуемые Библиотеки

| Библиотека                     | Назначение                                          |
|--------------------------------|-----------------------------------------------------|
| Jest или Vitest                | Запускатель тестов и библиотека утверждений         |
| `@testing-library/react`       | Рендеринг компонентов и запросы                     |
| `@testing-library/user-event`  | Симуляция взаимодействий пользователя               |
| `msw` (Mock Service Worker)    | Мокирование API для интеграционных тестов           |

## Связанные Файлы

- `lib/services/` -- Сервисы бизнес-логики (основные цели юнит-тестов)
- `lib/repositories/` -- Слой доступа к данным
- `hooks/` -- Пользовательские React-хуки
- `components/ui/` -- Общие презентационные компоненты
