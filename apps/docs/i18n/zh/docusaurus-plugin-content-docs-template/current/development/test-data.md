---
id: test-data
title: 测试数据与夹具
sidebar_label: 测试数据
sidebar_position: 6
---

# 测试数据与夹具

Ever Works 模板中的 E2E 测试依赖通过 TypeScript 常量、认证夹具和种子脚本管理的稳定测试数据。

## `TEST_DATA` 常量

核心测试数据定义在 `apps/web-e2e/fixtures/test-data.ts` 中：

```typescript
export const TEST_DATA = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!',
    name: 'Admin User',
  },
  client: {
    email: 'client@example.com',
    password: 'Client123!',
    name: 'Client User',
  },
  company: {
    name: 'Test Company',
    slug: 'test-company',
    description: 'A test company for E2E testing',
  },
  // ... etc.
};
```

## `PUBLIC_ROUTES` 数组

无需认证即可访问的公开路由：

```typescript
export const PUBLIC_ROUTES = [
  '/',
  '/en',
  '/en/about',
  '/en/contact',
  '/en/companies',
  '/en/blog',
  // ... etc.
];
```

## 认证夹具

Playwright 使用已保存的会话文件绕过需要认证的测试中的登录界面。

### `admin.json`

在全局设置运行后保存在 `apps/web-e2e/fixtures/admin.json`：

```json
{
  "cookies": [
    {
      "name": "authjs.session-token",
      "value": "...",
      "domain": "localhost",
      "path": "/",
      "httpOnly": true,
      "secure": false
    }
  ],
  "origins": []
}
```

### `client.json`

与 `admin.json` 类似，但使用客户端角色的用户会话。

## 为测试填充数据库

在 E2E 测试之前，需要运行种子脚本以确保测试数据存在：

```bash
cd apps/web
pnpm run db:seed
```

`scripts/seed.ts` 种子脚本会创建：

- **管理员用户**：具有完整访问权限的账户，用于测试管理功能
- **客户端用户**：标准账户，用于测试用户工作流
- **示例公司**：带有完整资料的目录列表
- **分类**：分类法结构
- **示例内容**：博客文章、评论、评价

## 演示模式

当设置 `DEMO_MODE=true` 时，如果数据库为空，应用会自动填充初始数据：

```bash
DEMO_MODE=true pnpm run dev
```

适用于预览和演示，无需手动运行种子脚本。

## 数据一致性策略

| 环境     | 策略                           | 命令               |
|----------|--------------------------------|--------------------|
| 开发环境 | 手动种子 + 本地数据库           | `pnpm db:seed`     |
| 测试环境 | CI 中测试前自动种子             | 配置 CI/CD         |
| 生产环境 | 仅迁移 — 不使用随意种子数据     | `pnpm db:migrate`  |

## 最佳实践

1. **永远不要依赖测试执行顺序** — 每个测试应能独立运行
2. **使用认证夹具** — 比每次测试通过 UI 登录更快
3. **测试后清理** — 创建数据的测试应在执行后清理
4. **使用常量而非内联字符串** — 在 `TEST_DATA` 中集中管理测试数据
5. **隔离测试环境** — 对测试使用单独的数据库或模式

## 测试环境变量

```bash
# 设置在 apps/web-e2e/.env 或 apps/web/.env.test 中
DATABASE_URL=file:./test.db           # 隔离的测试数据库
BASE_URL=http://localhost:3000         # 测试的基础 URL
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=Admin123!
```

## 相关文件

- `apps/web-e2e/fixtures/test-data.ts` — 集中的测试数据常量
- `apps/web-e2e/global-setup.ts` — 所有测试前的会话设置
- `apps/web-e2e/global-teardown.ts` — 所有测试后的清理工作
- `apps/web/scripts/seed.ts` — 数据库种子脚本
- `apps/web/scripts/clean-database.js` — 数据库重置脚本
