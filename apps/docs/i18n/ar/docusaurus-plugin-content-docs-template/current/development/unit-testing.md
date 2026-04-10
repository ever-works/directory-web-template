---
id: unit-testing
title: اختبارات الوحدة والمكونات
sidebar_label: اختبارات الوحدة
sidebar_position: 5
---

# اختبارات الوحدة والمكونات

تتناول هذه الصفحة أنماط ومناهج اختبار الوحدة للخدمات والخطافات والمكوِّنات في قالب Ever Works. وعلى الرغم من أن مجموعة الاختبارات الرئيسية تعتمد على E2E (انظر [اختبار E2E](./e2e-testing.md))، فإن بنية قاعدة الكود تدعم اختبار الوحدة واختبار المكوِّنات باستخدام الأدوات القياسية.

## استراتيجية الاختبار

يستخدم قالب Ever Works نهجًا متعدد الطبقات للاختبار:

1. **التحليل الثابت** — يكشف TypeScript (`pnpm tsc --noEmit`) عن أخطاء النوع في وقت الترجمة
2. **Lint** — يطبِّق ESLint (`pnpm lint`) أسلوب الكود ويكشف الأخطاء الشائعة
3. **اختبارات E2E** — تتحقق اختبارات Playwright من سيناريوهات المستخدم الكاملة في التطبيق
4. **اختبارات الوحدة** — اختبارات مستهدفة لمنطق الأعمال والخدمات والأدوات المساعدة

لمعظم التغييرات، سلسلة أوامر التحقق الموصى بها هي:

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## اختبار الخدمات

تحتوي الخدمات في `lib/services/` على منطق الأعمال الأساسي وهي أكثر الأهداف قيمةً لاختبار الوحدة.

### معمارية الخدمات

تتبع الخدمات نمطًا متسقًا يجعلها قابلة للاختبار:

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

### محاكاة استعلامات قاعدة البيانات

تعتمد الخدمات على استعلامات قاعدة البيانات من `lib/db/queries/`. نحاكيها على مستوى الوحدة:

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

### محاكاة عميل REST

لخدمات CRM، نحاكي `TwentyCrmRestClient`:

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

## اختبار الخطافات

تُغلِّف الخطافات المخصصة في `hooks/` React Query وإدارة الحالة الأخرى. اختبرها مع `@testing-library/react-hooks` أو `renderHook`:

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

// مثال: اختبار خطاف جلب البيانات
it('should fetch admin stats', async () => {
  const { result } = renderHook(() => useAdminStats(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## اختبار المكوِّنات

### المكوِّنات التقديمية

يُعدُّ معظم مكوِّنات `components/ui/` تقديميًا ويمكن اختباره بـ React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### المكوِّنات مع الترجمات

تتطلب المكوِّنات التي تستخدم `next-intl` موفِّر رسائل في الاختبارات:

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

## أنماط المحاكاة

### قاعدة البيانات (Drizzle ORM)

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

### خدمة الإعداد

```typescript
jest.mock('@/lib/config/config-service', () => ({
  configService: {
    core: { APP_URL: 'http://localhost:3000', NODE_ENV: 'test' },
    payment: { stripe: { secretKey: 'test_key' } },
    email: { EMAIL_SUPPORT: 'test@test.com' },
  },
}));
```

### موجِّه Next.js

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/en/admin',
  useParams: () => ({ locale: 'en' }),
}));
```

## المكتبات الموصى بها

| المكتبة                        | الغرض                                     |
|--------------------------------|-------------------------------------------|
| Jest أو Vitest                 | مشغِّل الاختبارات ومكتبة التأكيدات         |
| `@testing-library/react`       | تصيير المكوِّنات والاستعلامات              |
| `@testing-library/user-event`  | محاكاة تفاعلات المستخدم                   |
| `msw` (Mock Service Worker)    | محاكاة API لاختبارات التكامل              |

## الملفات ذات الصلة

- `lib/services/` — خدمات منطق الأعمال (الأهداف الرئيسية لاختبار الوحدة)
- `lib/repositories/` — طبقة الوصول إلى البيانات
- `hooks/` — خطافات React المخصصة
- `components/ui/` — المكوِّنات التقديمية المشتركة
