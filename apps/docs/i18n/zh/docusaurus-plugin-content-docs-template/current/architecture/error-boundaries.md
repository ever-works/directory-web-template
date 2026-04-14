---
id: error-boundaries
title: "错误边界和错误处理"
sidebar_label: "误差边界"
sidebar_position: 25
---

# 错误边界和错误处理

该模板使用 React 错误边界、全局错误提供程序和 Next.js 错误约定来实现多层错误处理策略。这种架构确保运行时错误被优雅地捕获，报告给分析，并向用户提供恢复选项。

## 架构概述

错误处理系统分为四层：

|图层|文件|适用范围|
|-------|------|-------|
|全局错误页面|`app/global-error.tsx`|捕获根布局本身的错误|
|错误提供者|`components/error-provider.tsx`|用全局 JS 错误监听器包装应用程序树|
|误差边界|`components/error-boundary.tsx`|可重用的 React 类组件边界|
|管理错误边界|`components/admin/admin-error-boundary.tsx`|管理仪表板部分的范围边界|

## 全局错误页面

`app/global-error.tsx` 文件是一个特殊的 Next.js 约定，用于捕获根布局中发生的错误。由于根布局本身可能已失败，因此该组件呈现其自己的 `<html>` 和 `<body>` 标记。

```tsx
// app/global-error.tsx
'use client';
import Link from 'next/link';
import { Button } from '@heroui/react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
          <h1 className="text-3xl font-bold mb-4">Something went wrong!</h1>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md text-left">
              <p className="font-semibold text-red-600">{error.message}</p>
              {error.digest && (
                <p className="mt-2 text-xs text-gray-500">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-4">
            <Button onPress={() => reset()} variant="solid">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link href="/" passHref>
              <Button variant="solid">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
```

关键行为：
- 通过 `useEffect` 将错误记录到挂载控制台
- 仅在开发模式下显示堆栈跟踪和错误摘要
- 提供 **Refresh** 按钮（调用 `reset()` 重新渲染片段）和 **Go Home** 链接
- `error.digest` 是服务器生成的哈希值，可用于与服务器端日志关联

## 未找到页面

`app/not-found.tsx` 文件处理 404 响应。它是一个使用 Next.js 路由器进行导航的客户端组件。

```tsx
// app/not-found.tsx
'use client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center ...">
      <h1 className="text-8xl font-bold ...">404</h1>
      <h2 className="text-2xl font-semibold ...">Page Not Found</h2>
      <div className="flex gap-4 justify-center">
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </Button>
        <Button onClick={() => router.push('/')}>
          <Home className="w-4 h-4" /> Back to Home
        </Button>
      </div>
    </div>
  );
}
```

该页面包括搜索建议部分和帮助/支持页面的链接。

## 反应错误边界组件

核心可重用边界位于`components/error-boundary.tsx`。它是一个与分析系统集成的 React 类组件（`componentDidCatch` 所需）。

```tsx
// components/error-boundary.tsx
import { analytics } from '@/lib/analytics';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  isRetrying: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (typeof window !== 'undefined') {
      analytics.captureException(error, {
        ...errorInfo,
        componentStack: errorInfo.componentStack,
        type: 'react-error-boundary',
      });
    }
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ isRetrying: true });
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        isRetrying: false,
      });
    }, 500);
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (/* default error UI */);
    }
    return this.props.children;
  }
}
```

值得注意的设计决策：
- **分析集成**：错误通过`analytics.captureException`自动报告
- **自定义后备**：传递 `fallback` 属性来呈现自定义 UI，或让默认的全页错误屏幕出现
- **延迟重试**：重试时的 500 毫秒延迟提供视觉反馈并防止即时重新崩溃循环
- **可折叠详细信息**：在默认 UI 中，错误详细信息位于 `<details>` 元素内，以便用户可以检查堆栈
- **技术页脚**：显示错误名称、时间戳和当前 URL 以供调试

## 错误提供者

`components/error-provider.tsx` 处的`ErrorProvider` 包装了整个应用程序树。它添加了全局 JavaScript 错误侦听器，用于捕获 React 渲染周期之外的错误。

```tsx
// components/error-provider.tsx
export function ErrorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[Global Error]', event.error);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Rejection]', event.reason);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
```

该组件处理 React 错误边界无法捕获的两类错误：
- **全局错误** (`window.error`)：脚本错误、React 之外的运行时异常
- **未处理的承诺拒绝** (`unhandledrejection`)：忘记了 `.catch()` 处理程序或未捕获的 `await` 失败

## 管理错误边界

管理仪表板将每个部分包装在自己的`AdminErrorBoundary`中，因此一个小部件（例如图表）的故障不会导致整个仪表板崩溃。

```tsx
// components/admin/admin-dashboard.tsx (usage pattern)
<AdminLandmark as="section" label="Dashboard Statistics">
  <AdminErrorBoundary>
    <AdminStatsOverview stats={stats} isLoading={false} />
  </AdminErrorBoundary>
</AdminLandmark>

<AdminLandmark as="section" label="Analytics Overview">
  <AdminResponsiveGrid cols={2} gap="lg">
    <AdminErrorBoundary>
      <AdminActivityChart data={stats?.activityTrendData || []} />
    </AdminErrorBoundary>
    <AdminErrorBoundary>
      <AdminTopItems data={stats?.topItemsData || []} />
    </AdminErrorBoundary>
  </AdminResponsiveGrid>
</AdminLandmark>
```

每个`AdminErrorBoundary` 将故障隔离到其自己的部分，从而允许仪表板的其余部分继续工作。

## API错误处理

服务器端 API 路由使用 `lib/api/error-handler.ts` 中定义的标准化错误处理程序：

```tsx
// lib/api/error-handler.ts
export function handleApiError(
  error: unknown,
  context = 'API'
): NextResponse<ApiErrorResponse> {
  // Log with context
  if (error instanceof Error) {
    logError(error, context);
  }

  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected error occurred';

  if (error instanceof Error) {
    message = error.message;
    // Auto-detect error type from message content
    if (message.includes('unauthorized')) status = HttpStatus.UNAUTHORIZED;
    if (message.includes('validation'))   status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (message.includes('not found'))    status = HttpStatus.NOT_FOUND;
  }

  // Sanitize in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'An unexpected error occurred';
  }

  return createApiErrorResponse(message, status, code);
}
```

还提供方便的包装：

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## 错误处理最佳实践

1. **将功能部分**包裹在 `ErrorBoundary` 组件中，这样一次崩溃就不会导致整个页面崩溃
2. **对需要更上下文恢复 UI 的关键部分使用自定义回退**
3. **在 API 路由中利用 `withErrorHandling`** 来保证一致的错误响应形状
4. **切勿在生产中暴露堆栈跟踪** - `global-error.tsx` 和 `error-handler.ts` 都是 `NODE_ENV` 后面的门调试输出
5. **向分析报告** -- `ErrorBoundary` 自动通过 `analytics.captureException` 向分析服务报告

## 文件参考

|文件|目的|
|------|---------|
|`app/global-error.tsx`|具有完整 HTML shell 的根级错误页面|
|`app/not-found.tsx`|404 未找到带有导航选项的页面|
|`components/error-boundary.tsx`|可重用的 React 错误边界与分析|
|`components/error-provider.tsx`|包装应用程序的全局 JS 错误侦听器|
|`components/admin/admin-error-boundary.tsx`|管理仪表板小部件的范围边界|
|`lib/api/error-handler.ts`|标准化 API 路由错误处理|
