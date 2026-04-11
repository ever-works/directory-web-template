---
id: unit-testing
title: Testes Unitários & Componentes
sidebar_label: Testes Unitários
sidebar_position: 5
---

# Testes Unitários & Componentes

Esta página cobre padrões e abordagens para testes unitários de serviços, hooks e componentes no template Ever Works. Embora o conjunto de testes principal seja baseado em E2E (veja [Testes E2E](./e2e-testing.md)), a base de código é estruturada para suportar testes unitários e de componentes com ferramentas padrão.

## Estratégia de Testes

O template Ever Works usa uma abordagem de testes em camadas:

1. **Análise estática** -- TypeScript (`pnpm tsc --noEmit`) captura erros de tipo em tempo de compilação
2. **Linting** -- ESLint (`pnpm lint`) aplica estilo de código e captura bugs comuns
3. **Testes E2E** -- Testes Playwright validam fluxos completos de usuário no aplicativo
4. **Testes unitários** -- Testes direcionados para lógica de negócios, serviços e utilitários

Para a maioria das mudanças, a cadeia de comandos de validação recomendada é:

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## Testando Serviços

Os serviços em `lib/services/` contêm a lógica de negócios principal e são os alvos de maior valor para testes unitários.

### Arquitetura de Serviços

Os serviços seguem um padrão consistente que os torna testáveis:

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

### Simulando Consultas de Banco de Dados

Os serviços dependem de consultas ao banco de dados de `lib/db/queries/`. Simule-as no nível do módulo:

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

### Simulando o Cliente REST

Para serviços relacionados ao CRM, simule o `TwentyCrmRestClient`:

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

## Testando Hooks

Hooks personalizados em `hooks/` encapsulam React Query e outro gerenciamento de estado. Teste-os com `@testing-library/react-hooks` ou `renderHook`:

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

// Exemplo: testando um hook de busca de dados
it('should fetch admin stats', async () => {
  const { result } = renderHook(() => useAdminStats(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## Testando Componentes

### Componentes Presentacionais

A maioria dos componentes em `components/ui/` são presentacionais e podem ser testados com React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### Componentes com Traduções

Componentes usando `next-intl` requerem um provedor de mensagens nos testes:

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

## Padrões de Simulação

### Banco de Dados (Drizzle ORM)

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

### Serviço de Configuração

```typescript
jest.mock('@/lib/config/config-service', () => ({
  configService: {
    core: { APP_URL: 'http://localhost:3000', NODE_ENV: 'test' },
    payment: { stripe: { secretKey: 'test_key' } },
    email: { EMAIL_SUPPORT: 'test@test.com' },
  },
}));
```

### Router do Next.js

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/en/admin',
  useParams: () => ({ locale: 'en' }),
}));
```

## Bibliotecas Recomendadas

| Biblioteca                     | Finalidade                                        |
|--------------------------------|---------------------------------------------------|
| Jest ou Vitest                 | Runner de testes e biblioteca de asserções        |
| `@testing-library/react`       | Renderização de componentes e consultas           |
| `@testing-library/user-event`  | Simulação de interações do usuário                |
| `msw` (Mock Service Worker)    | Simulação de API para testes de integração        |

## Arquivos Relacionados

- `lib/services/` -- Serviços de lógica de negócios (alvos principais de testes unitários)
- `lib/repositories/` -- Camada de acesso a dados
- `hooks/` -- Hooks React personalizados
- `components/ui/` -- Componentes presentacionais compartilhados
