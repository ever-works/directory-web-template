# 本地开发环境配置

本指南将帮助您为 Ever Works 设置完整的本地开发环境。

## 前提条件

确保您已安装以下内容：

- **Node.js 20.x 或更高版本** - [下载](https://nodejs.org/)
- **pnpm** - [安装](https://pnpm.io/installation)（monorepo 包管理器）
- **Git** - [下载](https://git-scm.com/)
- **PostgreSQL**（可选）- [下载](https://postgresql.org/)
- **Docker**（可选）- [下载](https://docker.com/)

## 开发环境设置

### 1. 克隆和安装

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Install all dependencies from the monorepo root
pnpm install
```

### 2. 环境配置

将示例环境文件复制到 Web 应用目录：

```bash
cp apps/web/.env.example apps/web/.env.local
```

配置您的 `apps/web/.env.local` 文件：

```bash
# Basic Development Configuration
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Authentication
AUTH_SECRET="generate-a-secure-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# GitHub Integration (Required)
GH_TOKEN="your-github-personal-access-token"
DATA_REPOSITORY="https://github.com/your-username/awesome-data"

# Database (Optional)
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. 数据库设置（可选）

#### 选项 A：本地 PostgreSQL

```bash
# Create database
createdb everworks_dev

# Run database commands from the web app directory
cd apps/web

# Run migrations
pnpm run db:generate
pnpm run db:migrate

# Seed with sample data
pnpm run db:seed
```

#### 选项 B：Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=your_database_name \
  -p 5432:5432 \
  -d postgres:15

# Run migrations (from apps/web/)
pnpm run db:migrate
pnpm run db:seed
```

#### 选项 C：Supabase

1. 在 [Supabase](https://supabase.com) 创建项目
2. 从设置 → 数据库获取连接字符串
3. 在 `apps/web/.env.local` 中更新 `DATABASE_URL`
4. 从 `apps/web/` 运行迁移：`pnpm run db:migrate`

### 4. 内容仓库设置

#### Fork 数据仓库

1. 访问 [awesome-data](https://github.com/ever-works/awesome-data)
2. 点击"Fork"创建您的副本
3. 在 `apps/web/.env.local` 中更新 `DATA_REPOSITORY`

#### 生成 GitHub Token

1. 转到 GitHub Settings → Developer settings → Personal access tokens
2. 生成新令牌（经典版）
3. 选择范围：`repo`、`read:user`、`user:email`
4. 复制生成的令牌并将其添加到 `apps/web/.env.local` 中的 `GH_TOKEN`
5. **重要**：永远不要将令牌提交到版本控制

### 5. 启动开发服务器

```bash
# From the monorepo root — starts all apps (web, docs, etc.)
pnpm run dev

# Or start only the web app
pnpm run dev:web
```

您的应用程序将在 [http://localhost:3000](http://localhost:3000) 上可用。

## 开发脚本

### 核心脚本（从 monorepo 根目录）

```bash
# Start all dev servers (web, docs, etc.)
pnpm run dev

# Start only the web app
pnpm run dev:web

# Build all apps
pnpm run build

# Type checking
pnpm run type-check

# Linting
pnpm run lint
pnpm run lint:fix

# Code formatting
pnpm run format
pnpm run format:check
```

### 数据库脚本（在 `apps/web/` 中运行）

```bash
cd apps/web

# Generate database schema
pnpm run db:generate

# Run migrations
pnpm run db:migrate

# Reset database
pnpm run db:reset

# Seed database
pnpm run db:seed

# Open database studio
pnpm run db:studio
```

### 内容脚本（在 `apps/web/` 中运行）

```bash
cd apps/web

# Sync content from Git
pnpm run content:sync

# Validate content files
pnpm run content:validate

# Generate content types
pnpm run content:types
```

## 开发工具

### VS Code 设置

安装推荐的扩展：

```json
{
	"recommendations": [
		"bradlc.vscode-tailwindcss",
		"esbenp.prettier-vscode",
		"dbaeumer.vscode-eslint",
		"ms-vscode.vscode-typescript-next",
		"formulahendry.auto-rename-tag",
		"christian-kohler.path-intellisense"
	]
}
```

配置 VS Code 设置（`.vscode/settings.json`）：

```json
{
	"editor.formatOnSave": true,
	"editor.defaultFormatter": "esbenp.prettier-vscode",
	"editor.codeActionsOnSave": {
		"source.fixAll.eslint": true
	},
	"typescript.preferences.importModuleSpecifier": "relative",
	"tailwindCSS.experimental.classRegex": [
		["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
		["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
	]
}
```

### 浏览器 DevTools

#### React Developer Tools

- 安装 [React DevTools](https://react.dev/learn/react-developer-tools)
- 检查组件树和 props
- 分析组件性能

#### Redux DevTools（用于 Zustand）

- 安装 [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- 监控状态变化
- 时间旅行调试

### 数据库工具

#### Drizzle Studio

```bash
cd apps/web && pnpm run db:studio
```

- 可视化数据库浏览器
- 查询构建器界面
- 架构可视化

#### pgAdmin（用于 PostgreSQL）

- 安装 [pgAdmin](https://www.pgadmin.org/)
- 连接到本地数据库
- 高级查询工具

## 热重载

开发服务器支持以下内容的热重载：

- **React 组件** - 即时更新
- **API 路由** - 自动重启
- **Tailwind CSS** - 实时样式更新
- **TypeScript** - 实时类型检查

### 热重载故障排除

如果热重载停止工作：

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Restart development server
pnpm run dev
```

## 环境变量

### 开发 vs 生产

在 `apps/web/` 内创建不同的环境文件：

```bash
apps/web/.env.local          # Local development
apps/web/.env.development    # Development environment
apps/web/.env.staging        # Staging environment
apps/web/.env.production     # Production environment
```

### 环境变量验证

应用程序在启动时验证环境变量：

```typescript
// apps/web/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']),
	AUTH_SECRET: z.string().min(32),
	GH_TOKEN: z.string().startsWith('ghp_'),
	DATABASE_URL: z.string().url().optional()
});

export const env = envSchema.parse(process.env);
```

## 测试设置

### 单元测试

```bash
# Run tests (from monorepo root)
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### E2E 测试

E2E 测试位于工作区包 `apps/web-e2e/`（`@ever-works/web-e2e`）中。

```bash
# From the monorepo root
pnpm run --filter @ever-works/web-e2e test:e2e

# Or from the E2E directory
cd apps/web-e2e
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui
```

## 调试

### 服务器端调试

添加到 `package.json`：

```json
{
	"scripts": {
		"dev:debug": "NODE_OPTIONS='--inspect' next dev"
	}
}
```

然后在 VS Code 或 Chrome DevTools 中附加调试器。

### 客户端调试

使用浏览器 DevTools 或添加断点：

```typescript
// Add debugger statement
debugger;

// Or use console methods
console.log('Debug info:', data);
console.table(items);
console.group('API Response');
```

### API 调试

启用 API 日志记录：

```bash
# In apps/web/.env.local
DEBUG=api:*
LOG_LEVEL=debug
```

## 性能监控

### Bundle 分析

```bash
# Analyze bundle size (from apps/web/)
cd apps/web && pnpm run analyze
```

### 性能分析

```bash
# Enable React profiling
NEXT_PUBLIC_REACT_PROFILING=true pnpm run dev:web
```

## 常见开发问题

### 端口已被占用

```bash
# Use different port
pnpm run dev:web -- -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### 模块解析问题

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript 错误

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check types manually
pnpm run type-check
```

### 数据库连接问题

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d everworks_dev
```

## 开发工作流程

### 1. 功能开发

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
pnpm run dev
pnpm run test

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### 2. 代码质量检查

```bash
# Run all checks
pnpm run check

# Individual checks
pnpm run lint
pnpm run type-check
pnpm run test
pnpm run format:check
```

### 3. 数据库变更

```bash
# Run from apps/web/
cd apps/web

# Create migration
pnpm run db:generate

# Apply migration
pnpm run db:migrate

# Test with seed data
pnpm run db:seed
```

## 下一步

您的本地开发环境现已准备就绪！您可以开始开发您的 Ever Works 应用程序了。
