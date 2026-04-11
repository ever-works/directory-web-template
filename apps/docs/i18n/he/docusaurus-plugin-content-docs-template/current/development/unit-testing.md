---
id: unit-testing
title: בדיקות יחידה ורכיבים
sidebar_label: בדיקות יחידה
sidebar_position: 5
---

# בדיקות יחידה ורכיבים

דף זה מכסה דפוסים וגישות לבדיקות יחידה של שירותים, hooks ורכיבים בתבנית Ever Works. אף כי מערכת הבדיקות העיקרית מבוססת E2E (ראה [בדיקות E2E](./e2e-testing.md)), מבנה קוד הבסיס תומך בבדיקות יחידה ורכיבים עם כלים סטנדרטיים.

## אסטרטגיית בדיקות

תבנית Ever Works משתמשת בגישה רב-שכבתית לבדיקות:

1. **ניתוח סטטי** — TypeScript (`pnpm tsc --noEmit`) מגלה שגיאות סוג בזמן קומפילציה
2. **Lint** — ESLint (`pnpm lint`) אוכף סגנון קוד ומגלה שגיאות נפוצות
3. **בדיקות E2E** — בדיקות Playwright מאמתות תרחישי משתמש מלאים באפליקציה
4. **בדיקות יחידה** — בדיקות ממוקדות של לוגיקת עסקים, שירותים ועזרים

לרוב השינויים, שרשרת פקודות האימות המומלצת היא:

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## בדיקת שירותים

שירותים ב-`lib/services/` מכילים את לוגיקת העסקים המרכזית והם היעדים בעלי הערך הגבוה ביותר לבדיקות יחידה.

### ארכיטקטורת שירותים

שירותים עוקבים אחר דפוס עקבי שהופך אותם לבדיקתיים:

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

### מוקאפ של שאילתות מסד נתונים

שירותים תלויים בשאילתות מסד נתונים מ-`lib/db/queries/`. עשה מוקאפ ברמת המודול:

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

### מוקאפ לקוח REST

לשירותי CRM, עשה מוקאפ ל-`TwentyCrmRestClient`:

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

## בדיקת Hooks

Hooks מותאמים אישית ב-`hooks/` עוטפים React Query וניהול מצב אחר. בדוק אותם עם `@testing-library/react-hooks` או `renderHook`:

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

// דוגמה: בדיקת hook טעינת נתונים
it('should fetch admin stats', async () => {
  const { result } = renderHook(() => useAdminStats(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## בדיקת רכיבים

### רכיבים פרזנטציוניים

רוב הרכיבים ב-`components/ui/` הם פרזנטציוניים וניתנים לבדיקה עם React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### רכיבים עם תרגומים

רכיבים המשתמשים ב-`next-intl` דורשים ספק הודעות בבדיקות:

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

## דפוסי מוקאפ

### מסד נתונים (Drizzle ORM)

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

### שירות הגדרות

```typescript
jest.mock('@/lib/config/config-service', () => ({
  configService: {
    core: { APP_URL: 'http://localhost:3000', NODE_ENV: 'test' },
    payment: { stripe: { secretKey: 'test_key' } },
    email: { EMAIL_SUPPORT: 'test@test.com' },
  },
}));
```

### ראוטר Next.js

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/en/admin',
  useParams: () => ({ locale: 'en' }),
}));
```

## ספריות מומלצות

| ספרייה                         | מטרה                                    |
|--------------------------------|-----------------------------------------|
| Jest או Vitest                 | מריץ בדיקות וספריית assertions          |
| `@testing-library/react`       | רינדור רכיבים ושאילתות                  |
| `@testing-library/user-event`  | סימולציית אינטראקציות משתמש             |
| `msw` (Mock Service Worker)    | מוקאפ API לבדיקות אינטגרציה            |

## קבצים קשורים

- `lib/services/` — שירותי לוגיקת עסקים (יעדים עיקריים לבדיקות יחידה)
- `lib/repositories/` — שכבת גישה לנתונים
- `hooks/` — React Hooks מותאמים אישית
- `components/ui/` — רכיבים פרזנטציוניים משותפים
