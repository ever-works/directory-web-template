---
id: logger-system
title: "记录系统"
sidebar_label: "记录系统"
sidebar_position: 44
---

# 记录系统

## 概述

Logger System 提供了一个轻量级、环境感知的日志实用程序，可在整个应用程序中实现一致的日志输出。它支持四种日志级别（DEBUG、INFO、WARN、ERROR）、上下文范围的记录器实例和特定于环境的格式——开发期间浏览器中的样式控制台输出以及 Node.js 和生产环境中的纯 JSON 格式输出。

## 建筑

模块 (`lib/logger.ts`) 导出两项：

- **`logger`** -- 没有上下文标签的默认单例实例，适用于通用日志记录。
- **`Logger`** (类) -- 类本身，用于创建特定模块或功能范围内的上下文记录器实例。

记录器遵循简单的过滤策略：在生产中 (`NODE_ENV !== 'development'`)，仅发出 WARN 和 ERROR 消息。在开发过程中，所有级别都会被记录。这可确保详细的调试输出不会泄漏到生产环境中。

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## API参考

### 出口

#### `logger`（单例）

没有上下文的预实例化 `Logger` 实例。用于快速、无范围的日志记录。

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger`（班级）

##### `static create(context: string): Logger`

创建上下文范围的记录器的工厂方法。上下文字符串在所有日志消息中显示为前缀。

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

记录调试级别消息。仅在开发时发出。

##### `info(message: string, data?: any): void`

记录信息性消息。仅在开发时发出。

##### `warn(message: string, data?: any): void`

记录警告消息。在所有环境中发射。

##### `error(message: string, error?: any): void`

记录错误消息。如果 `error` 参数是 `Error` 实例，记录器会自动提取 `message`、`stack` 和 `name` 属性。在所有环境中发射。

##### `api(method: string, url: string, data?: any): void`

记录 API 请求的便捷方法。使用结构化数据委托`debug()`。仅供开发。

##### `performance(label: string, duration: number): void`

记录性能指标的便捷方法。记录标签和持续时间（以毫秒为单位）。仅供开发。

### 内部类型

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;  // ISO 8601
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}
```

## 实施细节

**环境检测**：记录器在构建时检查`process.env.NODE_ENV === 'development'`并缓存结果。这避免了每次日志调用时重复的环境查找。

**浏览器样式**：在开发模式下在浏览器 (`typeof window !== 'undefined'`) 中运行时，日志消息使用 `%c` CSS 指令进行样式设置：

|级别|颜色|
|-------|-------|
|调试|`#6366f1`（靛蓝）|
|信息|`#3b82f6`（蓝色）|
|警告|`#f59e0b`（琥珀色）|
|错误|`#ef4444`（红色）|

**Node.js 输出**：在 Node.js 环境或生产环境中，消息被格式化为带有 JSON 序列化数据的纯字符串（带有 2 个空格缩进，打印美观）。

**错误提取**：`error()` 方法检测`Error` 实例，并将`errorMessage`、`stack` 和`name` 提取到结构化数据对象中，以便于调试。

## 配置

记录器不需要配置。它的行为完全由`NODE_ENV`决定：

|`NODE_ENV`|调试|信息|警告|错误|
|------------|-------|------|------|-------|
|`development`|是的|是的|是的|是的|
|`production`|否|否|是的|是的|
|`test`|否|否|是的|是的|

## 使用示例

```typescript
import { logger, Logger } from '@/lib/logger';

// General logging
logger.info('Server started on port 3000');
logger.warn('Deprecated API endpoint called', { endpoint: '/api/v1/items' });
logger.error('Failed to fetch data', new Error('Network timeout'));

// Context-scoped logging
const dbLogger = Logger.create('Database');
dbLogger.info('Connection established', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection refused'));

// API request logging
const apiLogger = Logger.create('API');
apiLogger.api('GET', '/api/items', { page: 1, limit: 20 });
apiLogger.api('POST', '/api/items', { title: 'New Item' });

// Performance tracking
const perfLogger = Logger.create('Performance');
const start = performance.now();
// ... expensive operation ...
const duration = performance.now() - start;
perfLogger.performance('fetchItems', duration);
// Output: [10:30:45] DEBUG [Performance] Performance: fetchItems { duration: "42ms" }
```

## 最佳实践

- 使用 `Logger.create('ModuleName')` 为每个模块或功能区域创建上下文范围的记录器，以使日志易于过滤。
- 使用 `debug()` 进行详细跟踪，这些跟踪永远不会出现在生产中；使用 `info()` 来处理重大事件。
- 始终将 `Error` 对象（不是字符串）传递给 `error()` 方法，以便自动捕获堆栈跟踪。
- 使用 `api()` 方法进行 HTTP 请求日志记录，以在 API 调用之间保持一致的日志结构。
- 生产中不要依赖记录器进行监控；与适当的可观察平台（PostHog、Sentry）集成以进行生产错误跟踪。

## 相关模块

- [API 客户端层](/template/architecture/api-client-layer) -- 使用记录器进行请求/响应日志记录
- [Config Manager System](./config-manager-system) -- ConfigService 在启动时记录验证结果
