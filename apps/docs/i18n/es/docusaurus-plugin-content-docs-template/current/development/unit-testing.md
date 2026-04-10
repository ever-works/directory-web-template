---
id: unit-testing
title: Pruebas Unitarias & Componentes
sidebar_label: Pruebas Unitarias
sidebar_position: 5
---

# Pruebas Unitarias & Componentes

Esta página cubre patrones y enfoques para pruebas unitarias de servicios, hooks y componentes en la plantilla Ever Works. Aunque el conjunto de pruebas principal está basado en E2E (ver [Pruebas E2E](./e2e-testing.md)), la base de código está estructurada para soportar pruebas unitarias y de componentes con herramientas estándar.

## Estrategia de Pruebas

La plantilla Ever Works usa un enfoque de pruebas por capas:

1. **Análisis estático** -- TypeScript (`pnpm tsc --noEmit`) detecta errores de tipo en tiempo de compilación
2. **Linting** -- ESLint (`pnpm lint`) aplica el estilo de código y detecta errores comunes
3. **Pruebas E2E** -- Las pruebas de Playwright validan flujos completos de usuario en la aplicación
4. **Pruebas unitarias** -- Pruebas dirigidas para lógica de negocio, servicios y utilidades

Para la mayoría de los cambios, la cadena de comandos de validación recomendada es:

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## Probando Servicios

Los servicios en `lib/services/` contienen la lógica de negocio principal y son los objetivos de mayor valor para las pruebas unitarias.

### Arquitectura de Servicios

Los servicios siguen un patrón consistente que los hace testeables:

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

### Simulando Consultas de Base de Datos

Los servicios dependen de consultas de base de datos de `lib/db/queries/`. Simúlalas a nivel de módulo:

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

### Simulando el Cliente REST

Para servicios relacionados con CRM, simula el `TwentyCrmRestClient`:

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

## Probando Hooks

Los hooks personalizados en `hooks/` envuelven React Query y otra gestión de estado. Pruébalos con `@testing-library/react-hooks` o `renderHook`:

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

// Ejemplo: probando un hook de obtención de datos
it('should fetch admin stats', async () => {
  const { result } = renderHook(() => useAdminStats(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## Probando Componentes

### Componentes Presentacionales

La mayoría de los componentes en `components/ui/` son presentacionales y pueden probarse con React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### Componentes con Traducciones

Los componentes que usan `next-intl` requieren un proveedor de mensajes en las pruebas:

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

## Patrones de Simulación

### Base de Datos (Drizzle ORM)

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

### Servicio de Configuración

```typescript
jest.mock('@/lib/config/config-service', () => ({
  configService: {
    core: { APP_URL: 'http://localhost:3000', NODE_ENV: 'test' },
    payment: { stripe: { secretKey: 'test_key' } },
    email: { EMAIL_SUPPORT: 'test@test.com' },
  },
}));
```

### Router de Next.js

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/en/admin',
  useParams: () => ({ locale: 'en' }),
}));
```

## Bibliotecas Recomendadas

| Biblioteca                     | Propósito                                           |
|--------------------------------|-----------------------------------------------------|
| Jest o Vitest                  | Runner de pruebas y biblioteca de aserciones        |
| `@testing-library/react`       | Renderización de componentes y consultas            |
| `@testing-library/user-event`  | Simulación de interacciones del usuario             |
| `msw` (Mock Service Worker)    | Simulación de API para pruebas de integración       |

## Archivos Relacionados

- `lib/services/` -- Servicios de lógica de negocio (objetivos principales de pruebas unitarias)
- `lib/repositories/` -- Capa de acceso a datos
- `hooks/` -- Hooks React personalizados
- `components/ui/` -- Componentes presentacionales compartidos
