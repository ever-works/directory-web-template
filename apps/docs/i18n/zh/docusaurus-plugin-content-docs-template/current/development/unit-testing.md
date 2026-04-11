---
id: unit-testing
title: 单元与组件测试
sidebar_label: 单元测试
sidebar_position: 5
---

# 单元与组件测试

本页面介绍 Ever Works 模板中服务、钩子和组件的单元测试模式与方法。虽然主要测试套件基于 E2E（参见 [E2E 测试](./e2e-testing.md)），但代码库结构支持使用标准工具进行单元测试和组件测试。

## 测试策略

Ever Works 模板采用多层测试方法：

1. **静态分析** — TypeScript（`pnpm tsc --noEmit`）在编译时发现类型错误
2. **代码检查** — ESLint（`pnpm lint`）强制执行代码风格并发现常见错误
3. **E2E 测试** — Playwright 测试验证应用中完整的用户场景
4. **单元测试** — 针对业务逻辑、服务和工具函数的专项测试

对于大多数更改，推荐的验证命令链为：

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## 服务测试

`lib/services/` 中的服务包含核心业务逻辑，是单元测试最有价值的目标。

### 服务架构

服务遵循一致的模式，使其易于测试：

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

### 模拟数据库查询

服务依赖来自 `lib/db/queries/` 的数据库查询。在模块级别进行模拟：

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

### 模拟 REST 客户端

对于 CRM 服务，模拟 `TwentyCrmRestClient`：

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

## 钩子测试

`hooks/` 中的自定义钩子封装了 React Query 和其他状态管理。使用 `@testing-library/react-hooks` 或 `renderHook` 进行测试：

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

// 示例：测试数据获取钩子
it('should fetch admin stats', async () => {
  const { result } = renderHook(() => useAdminStats(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

## 组件测试

### 展示型组件

`components/ui/` 中的大多数组件都是展示型组件，可以使用 React Testing Library 进行测试：

```typescript
import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';

it('renders stat value and label', () => {
  render(<StatsCard label="Total Views" value={1234} />);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('Total Views')).toBeInTheDocument();
});
```

### 带翻译的组件

使用 `next-intl` 的组件在测试中需要消息提供者：

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

## 模拟模式

### 数据库（Drizzle ORM）

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

### 配置服务

```typescript
jest.mock('@/lib/config/config-service', () => ({
  configService: {
    core: { APP_URL: 'http://localhost:3000', NODE_ENV: 'test' },
    payment: { stripe: { secretKey: 'test_key' } },
    email: { EMAIL_SUPPORT: 'test@test.com' },
  },
}));
```

### Next.js 路由

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/en/admin',
  useParams: () => ({ locale: 'en' }),
}));
```

## 推荐库

| 库                             | 用途                                |
|--------------------------------|-------------------------------------|
| Jest 或 Vitest                 | 测试运行器和断言库                  |
| `@testing-library/react`       | 组件渲染和查询                      |
| `@testing-library/user-event`  | 模拟用户交互                        |
| `msw`（Mock Service Worker）   | 集成测试的 API 模拟                 |

## 相关文件

- `lib/services/` — 业务逻辑服务（单元测试的主要目标）
- `lib/repositories/` — 数据访问层
- `hooks/` — 自定义 React 钩子
- `components/ui/` — 通用展示型组件
