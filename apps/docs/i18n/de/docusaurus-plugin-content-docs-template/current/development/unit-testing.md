---
id: unit-testing
title: Unit- & Komponenten-Tests
sidebar_label: Unit-Tests
sidebar_position: 5
---

# Unit- & Komponenten-Tests

Diese Seite behandelt Muster und Ansätze für Unit-Tests von Services, Hooks und Komponenten in der Ever Works-Vorlage. Während die primäre Test-Suite E2E-basiert ist (siehe [E2E-Tests](./e2e-testing.md)), ist die Codebasis so strukturiert, dass sie Unit- und Komponententests mit Standard-Tooling unterstützt.

## Teststrategie

Die Ever Works-Vorlage verwendet einen mehrschichtigen Testansatz:

1. **Statische Analyse** – TypeScript (`pnpm tsc --noEmit`) erkennt Typfehler zur Kompilierzeit
2. **Linting** – ESLint (`pnpm lint`) erzwingt Code-Stil und erkennt häufige Fehler
3. **E2E-Tests** – Playwright-Tests validieren vollständige Benutzerflüsse in der gesamten Anwendung
4. **Unit-Tests** – Gezielte Tests für Geschäftslogik, Services und Hilfsfunktionen

Für die meisten Änderungen ist die empfohlene Validierungsbefehlskette:

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## Services testen

Services in `lib/services/` enthalten die Kerngeschäftslogik und sind die wertvollsten Ziele für Unit-Tests.

### Service-Architektur

Services folgen einem konsistenten Muster, das sie testbar macht:

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

### Datenbankabfragen mocken

Services hängen von Datenbankabfragen aus `lib/db/queries/` ab. Diese auf Modulebene mocken:

```typescript
// Beispiel-Testansatz
import { SurveyService } from '@/lib/services/survey.service';

// Abfragemodul mocken
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

### REST-Client mocken

Für CRM-bezogene Services den `TwentyCrmRestClient` mocken:

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

## Hooks testen

Benutzerdefinierte Hooks in `hooks/` umhüllen React Query und andere Zustandsverwaltung. Mit `@testing-library/react-hooks` oder `renderHook` testen:

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

// Beispiel: Datenabruf-Hook testen
it('should fetch admin stats', async () => {
  const { result } = renderHook(() => useAdminStats(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## Komponenten testen

### Präsentationskomponenten

Die meisten Komponenten in `components/ui/` sind präsentional und können mit React Testing Library getestet werden:

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### Komponenten mit Übersetzungen

Komponenten, die `next-intl` verwenden, benötigen in Tests einen Nachrichten-Provider:

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

## Mocking-Muster

### Datenbank (Drizzle ORM)

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
