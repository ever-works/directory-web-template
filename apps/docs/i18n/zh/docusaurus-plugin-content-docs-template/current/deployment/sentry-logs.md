---
id: sentry-logs
title: Sentry 日志配置
sidebar_label: Sentry 日志
sidebar_position: 7
---

# Sentry 日志配置

本文档说明如何在 Template 仓库和 Ever Works 仓库中配置和使用 Sentry Logs。

## 概述

Sentry Logs 提供集中化的日志管理，允许您在 Sentry 的 Logs Explorer 中捕获、转发和分析应用程序日志。启用后，所有日志会自动转发到 Sentry，提供跨不同环境的应用程序行为统一视图。

## 功能

- ✅ 自动将日志转发到 Sentry
- ✅ 所有日志级别支持（debug、info、warn、error）
- ✅ 自动标记的上下文日志记录
- ✅ 环境特定配置
- ✅ 带元数据支持的结构化日志记录
- ✅ 与现有 logger 工具集成

## 配置

### 环境变量

将这些变量添加到 `.env.local` 文件用于本地开发：

```env
# Sentry 配置（日志必需）
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# 开发时启用 Sentry（可选，默认仅在生产环境）
SENTRY_ENABLE_DEV=true

# Sentry 调试模式（可选）
SENTRY_DEBUG=false

# Sentry Logs 配置
SENTRY_LOGS_ENABLED=true  # 启用/禁用 Sentry Logs（默认：true）
SENTRY_LOGS_LEVEL=info    # 捕获的最小日志级别（默认：info）
```

### 环境特定配置

#### 本地开发

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # 开发时捕获所有日志
```

#### 开发/Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info  # 捕获 info、warn 和 error 日志
```

#### 生产环境

```env
SENTRY_ENABLE_DEV=false  # 生产环境不需要
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # 生产环境只捕获警告和错误
```

## 使用方法

### 基础日志记录

Logger 工具会在启用时自动将日志转发到 Sentry：

```typescript
import { logger } from '@/lib/logger';

// Info 日志
logger.info('User logged in', { userId: '12345' });

// 警告日志
logger.warn('Rate limit approaching', { current: 90, limit: 100 });

// 错误日志
logger.error('Payment failed', { orderId: '67890', error: errorObject });

// Debug 日志（仅开发时）
logger.debug('API request', { method: 'GET', url: '/api/users' });
```

### 上下文日志记录

创建具有特定上下文的 logger 以便更好地组织：

```typescript
import { Logger } from '@/lib/logger';

const paymentLogger = Logger.create('PaymentService');

paymentLogger.info('Processing payment', { amount: 100, currency: 'USD' });
paymentLogger.error('Payment failed', error);
```

### 日志级别

Logger 支持四种日志级别，自动映射到 Sentry 的严重性级别：

| Logger 级别 | Sentry 级别 | 描述 |
|-------------|-------------|------|
| `DEBUG` | `debug` | 调试的详细信息（仅开发） |
| `INFO` | `info` | 一般信息性消息 |
| `WARN` | `warning` | 潜在问题的警告消息 |
| `ERROR` | `error` | 失败的错误消息 |

## 工作原理

### 初始化

Sentry Logs 在客户端和服务端 instrumentation 中均已启用：

1. **服务端**（`instrumentation.ts`）：为 Node.js 运行时初始化 Sentry
2. **客户端**（`instrumentation-client.ts`）：为浏览器运行时初始化 Sentry

两种配置均包含：
```typescript
_experiments: {
  enableLogs: SENTRY_LOGS_ENABLED,
}
```

### 日志转发

Logger 工具（`lib/logger.ts`）自动：
1. 检查 Sentry Logs 是否已启用
2. 使用上下文和元数据格式化日志条目
3. 使用 `Sentry.captureMessage()` 将日志转发到 Sentry，带有适当的标签和级别
4. 如果 Sentry 不可用，优雅地切换到降级模式

### 日志结构

发送到 Sentry 的每个日志条目包含：
- **消息**：带可选上下文前缀的日志消息
- **级别**：严重性级别（debug、info、warning、error）
- **标签**：
  - `logLevel`：原始日志级别
  - `logType`：始终为 `application_log`
  - `context`：可选上下文标识符
- **额外数据**：
  - `data`：任何提供的额外数据
  - `timestamp`：ISO 时间戳

## 在 Sentry 中查看日志

### Logs Explorer

1. 导航到您的 Sentry 项目
2. 进入 **Logs** → **Logs Explorer**
3. 使用过滤器查找特定日志：
   - 按 `logLevel` 标签过滤（debug、info、warn、error）
   - 按 `context` 标签过滤以查看特定模块的日志
   - 按 `logType:application_log` 过滤以仅查看应用程序日志

### 日志查询

Sentry Logs Explorer 中的示例查询：

```
# 所有错误日志
logLevel:error

# 特定上下文的日志
context:PaymentService

# 所有应用程序日志
logType:application_log

# 特定时间范围的错误
logLevel:error timestamp:>2024-01-01
```

## 与监控包集成

如果您使用 `@ever-works/monitoring` 包，请确保其配置为与 Sentry Logs 一起工作：

1. 监控包应初始化启用了日志的 Sentry
2. 本模板中的 logger 工具将自动将日志转发到 Sentry
3. 两个系统协同工作以提供全面的监控

## 故障排除

### 日志未出现在 Sentry 中

1. **检查 DSN 配置**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   确保 DSN 已正确设置且可访问。

2. **验证日志已启用**
   ```bash
   echo $SENTRY_LOGS_ENABLED
   ```
   必须为 `true` 才能转发日志。

3. **检查 Sentry 初始化**
   - 验证 `SENTRY_ENABLED` 为 true
   - 检查浏览器控制台是否有 Sentry 初始化错误
   - 确保 `_experiments.enableLogs` 设置为 `true`

4. **验证日志级别过滤**
   - 确保您的日志级别与 `SENTRY_LOGS_LEVEL` 阈值匹配
   - Debug 日志仅在级别设置为 `debug` 时才会被捕获

### 性能注意事项

- 日志异步发送，不会阻塞应用程序
- 在生产环境中考虑设置 `SENTRY_LOGS_LEVEL=warn` 以减少日志量
- Sentry 自动处理速率限制和批处理

### 禁用日志

要在不完全禁用 Sentry 的情况下禁用 Sentry Logs：

```env
SENTRY_LOGS_ENABLED=false
```

Logger 将继续正常工作，但日志不会转发到 Sentry。

## 最佳实践

1. **使用适当的日志级别**
   - 开发时使用 `debug` 记录详细信息
   - 使用 `info` 记录一般应用程序流程
   - 使用 `warn` 记录不影响功能的潜在问题
   - 使用 `error` 记录实际错误和异常

2. **包含上下文**
   - 使用上下文 logger 以便更好地组织
   - 在日志数据中包含相关元数据

3. **避免敏感数据**
   - 永远不要记录密码、令牌或个人数据
   - 在记录之前清理数据

4. **生产配置**
   - 在生产环境中设置 `SENTRY_LOGS_LEVEL=warn`
   - 监控 Sentry 配额使用情况
   - 定期审查日志以发现模式

## 验证检查清单

- [ ] Sentry DSN 已正确配置
- [ ] `SENTRY_LOGS_ENABLED=true` 已设置
- [ ] 日志出现在 Sentry Logs Explorer 中
- [ ] 日志级别已正确映射（info、warn、error、debug）
- [ ] 上下文标签在 Sentry 中可见
- [ ] 日志在本地和部署环境中均正常工作
- [ ] QA 可以在 Sentry Logs Explorer 中查看和过滤日志

## 其他资源

- [Sentry Logs 文档](https://docs.sentry.io/product/logs/)
- [Sentry Next.js 集成](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Logs Explorer 指南](https://docs.sentry.io/product/logs/explorer/)
