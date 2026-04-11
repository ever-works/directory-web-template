---
id: error-recovery-patterns
title: 错误恢复模式
sidebar_label: 错误恢复
sidebar_position: 2
---

# 错误恢复模式

本指南涵盖了整个模板中使用的错误处理架构，包括错误边界、重试逻辑、回退 UI 模式和集中错误报告。

## 架构概述

```
Error Handling Layers
======================

  Component Layer        Service Layer         API Layer
  +--------------+       +--------------+      +--------------+
  | Error        |       | Try/Catch    |      | handleApi    |
  | Boundaries   |       | + Retry      |      | Error()      |
  | (React)      |       | + Fallback   |      | + Logging    |
  +--------------+       +--------------+      +--------------+
       |                      |                      |
       v                      v                      v
  +---------------------------------------------------+
  |           Centralized Error Handler                |
  |   lib/utils/error-handler.ts                       |
  |   - ErrorType enum                                 |
  |   - createAppError()                               |
  |   - logError()                                     |
  +---------------------------------------------------+
```

## 集中错误类型

0模块定义了一个类型错误系统：

```typescript
// lib/utils/error-handler.ts
export enum ErrorType {
  AUTH = 'auth',
  CONFIG = 'config',
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export interface AppError {
  message: string;
  type: ErrorType;
  code?: string;
  originalError?: unknown;
}
```

### 创建类型错误

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### 结构化错误日志

```typescript
import { logError } from '@/lib/utils/error-handler';

// AppError - logs type, code, and original error
logError(appError, 'PaymentService');
// Output: [CONFIG] [PaymentService]: Missing required environment variables

// Standard Error - logs message and stack trace
logError(new Error('Connection refused'), 'Database');
// Output: [ERROR] [Database]: Connection refused

// Unknown error - logs raw value
logError('something went wrong', 'Unknown');
// Output: [UNKNOWN ERROR] [Unknown]: something went wrong
```

## API 错误处理

### 标准化 API 错误响应

0 模块提供一致的 HTTP 错误格式：

```typescript
// lib/api/error-handler.ts
export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}
```

### 在路由处理程序中使用0

```typescript
import { handleApiError, withErrorHandling } from '@/lib/api/error-handler';

// Pattern 1: Manual try/catch
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, 'GET /api/items');
  }
}

// Pattern 2: Wrapped handler (recommended)
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const result = await createItem(body);
    return NextResponse.json({ success: true, data: result });
  }, 'POST /api/items');
}
```

### 自动错误分类

0 函数自动将错误消息映射到 HTTP 状态代码：

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### 生产错误清理

在生产中，内部错误详细信息会从 500 响应中删除：

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## 客户端 API 错误处理

1中的0类提供自动错误处理：

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### 格式化客户端错误

所有 API 错误都标准化为 0 接口：

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## 服务器 API 客户端重试逻辑

1中的0包括内置重试逻辑：

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### 重试决策逻辑

```
Retry Decision Tree
====================

  Fetch fails
       |
       v
  Is it a network error?
  (TypeError or "fetch" in message)
       |
  +----+----+
  YES       NO
  |         |
  v         v
  attempt   Throw
  < retries?  immediately
  |
  YES -> Wait retryDelay -> Retry
  NO  -> Throw error
```

只有网络级故障才会触发重试。 HTTP 错误（4xx、5xx）不会重试。

### 超时处理

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## 环境变量验证

```typescript
import { validateEnvVariables, getEnvVariable } from '@/lib/utils/error-handler';

// Validate multiple variables at once
const error = validateEnvVariables(['DATABASE_URL', 'AUTH_SECRET']);
if (error) {
  logError(error, 'Startup');
  process.exit(1);
}

// Get single variable with automatic validation
const dbUrl = getEnvVariable('DATABASE_URL', true); // throws if missing
const optional = getEnvVariable('OPTIONAL_VAR', false); // returns undefined
```

## 后台作业错误恢复

后台作业使用0错误处理模式：

```typescript
// lib/background-jobs/local-job-manager.ts
private async executeJob(id: string): Promise<void> {
  // Skip if already running (prevents overlap)
  if (jobStatus.status === 'running') return;

  try {
    await jobFunction();
    jobStatus.status = 'completed';
    this.metrics.successfulJobs++;
  } catch (error) {
    jobStatus.status = 'failed';
    jobStatus.error = error instanceof Error ? error.message : 'Unknown error';
    this.metrics.failedJobs++;
    // Job remains scheduled - will retry on next interval
  }
}
```

失败的作业将继续按固定时间间隔进行调度，从而提供自动重试行为。

## 缓存失效错误恢复

```typescript
// lib/cache-invalidation.ts
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      // Expected during render - skip silently
      console.warn(`Skipping invalidation during render (tag: ${tag})`);
    } else {
      throw error; // Unexpected errors propagate
    }
  }
}
```

## 性能考虑因素

1. **重试延迟**：1秒重试延迟可以防止惊群效应，但会增加延迟。对于面向用户的请求，请考虑减少到 500 毫秒。
2. **超时值**：30 秒的默认值已经足够了。对于内部 API 调用，10 秒通常就足够了。
3. **错误日志记录**：在生产中，避免记录预期错误（404、422）的完整堆栈跟踪，以减少日志噪音。

## 故障排除

### API 在生产中返回 500 和通用消息

这是设计使然。检查服务器日志以获取实际的错误详细信息。 0 功能可消除生产中的 500 个错误。

### 重试对 API 调用不起作用

重试仅适用于网络级故障（连接被拒绝、DNS 错误）。 HTTP 500 响应不会触发重试。如果您需要 HTTP 级别的重试，请扩展 1 逻辑。

### 后台作业陷入“运行”状态

如果作业已经在运行，2 会跳过执行。如果作业挂起，它会阻止未来的执行。考虑在长时间运行的作业周围添加超时包装器。

## 相关文档

- [API客户端架构](./api-client-architecture.md)
- [Webhook架构](./webhook-architecture.md)
- [速率限制架构](./rate-limiting-architecture.md)
