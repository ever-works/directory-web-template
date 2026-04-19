---
id: error-boundaries
title: "Limites de erro e tratamento de erros"
sidebar_label: "Limites de erro"
sidebar_position: 25
---

# Limites de erro e tratamento de erros

O modelo implementa uma estratégia de tratamento de erros em várias camadas usando limites de erro React, provedores de erros globais e convenções de erro Next.js. Essa arquitetura garante que os erros de tempo de execução sejam detectados normalmente, relatados à análise e apresentados aos usuários com opções de recuperação.

## Visão geral da arquitetura

O sistema de tratamento de erros está organizado em quatro camadas:

|Camada|Arquivo|Escopo|
|-------|------|-------|
|Página de erro global|`app/global-error.tsx`|Captura erros no próprio layout raiz|
|Provedor de erros|`components/error-provider.tsx`|Envolve a árvore do aplicativo com ouvintes de erros JS globais|
|Limite de erro|`components/error-boundary.tsx`|Limite reutilizável do componente da classe React|
|Limite de erro administrativo|`components/admin/admin-error-boundary.tsx`|Limite de escopo para seções do painel de administração|

## Página de erro global

O arquivo `app/global-error.tsx` é uma convenção Next.js especial que detecta erros que ocorrem no layout raiz. Como o próprio layout raiz pode ter falhado, este componente renderiza suas próprias tags `<html>` e `<body>`.

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

Comportamentos principais:
- Registra o erro no console na montagem via `useEffect`
- Mostra um rastreamento de pilha e um resumo de erros apenas no modo de desenvolvimento
- Fornece um botão **Atualizar** (chama `reset()` para renderizar novamente o segmento) e um link **Ir para casa**
- O `error.digest` é um hash gerado pelo servidor útil para correlacionar com logs do lado do servidor

## Página não encontrada

O arquivo `app/not-found.tsx` lida com 404 respostas. É um componente cliente que usa o roteador Next.js para navegação.

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

A página inclui uma seção de sugestões de pesquisa e um link para a página de ajuda/suporte.

## Componente de limite de erro de reação

O limite reutilizável principal reside em `components/error-boundary.tsx`. É um componente da classe React (obrigatório para `componentDidCatch`) que se integra ao sistema analítico.

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

Decisões de design notáveis:
- **Integração analítica**: os erros são relatados automaticamente via `analytics.captureException`
- **Backup personalizado**: passe uma propriedade `fallback` para renderizar uma UI personalizada ou deixe a tela de erro de página inteira padrão aparecer
- **Tentar novamente com atraso**: o atraso de 500 ms na nova tentativa fornece feedback visual e evita loops instantâneos de nova falha
- **Detalhes recolhíveis**: na IU padrão, os detalhes do erro estão dentro de um elemento `<details>` para que os usuários possam inspecionar a pilha
- **Rodapé técnico**: mostra o nome do erro, carimbo de data/hora e URL atual para depuração

## Provedor de erros

O `ErrorProvider` em `components/error-provider.tsx` envolve toda a árvore do aplicativo. Ele adiciona ouvintes globais de erros de JavaScript que detectam erros fora do ciclo de renderização do React.

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

Este componente lida com duas categorias de erros que os limites de erro do React não podem capturar:
- **Erros globais** (`window.error`): erros de script, exceções de tempo de execução fora do React
- **Rejeições de promessas não tratadas** (`unhandledrejection`): manipuladores `.catch()` esquecidos ou falhas não detectadas de `await`

## Limite de erro administrativo

O painel de administração envolve cada seção em seu próprio `AdminErrorBoundary` para que uma falha em um widget (por exemplo, um gráfico) não desative todo o painel.

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

Cada `AdminErrorBoundary` isola falhas em sua própria seção, permitindo que o restante do painel continue funcionando.

## Tratamento de erros de API

As rotas de API do lado do servidor usam um manipulador de erros padronizado definido em `lib/api/error-handler.ts`:

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

Uma embalagem de conveniência também está disponível:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## Práticas recomendadas para tratamento de erros

1. **Envolva seções de recursos** em componentes `ErrorBoundary` para que uma única falha não derrube a página inteira
2. **Use substitutos personalizados** para seções críticas onde você deseja uma IU de recuperação mais contextual
3. **Aproveite `withErrorHandling`** em rotas de API para garantir formas consistentes de resposta a erros
4. **Nunca exponha rastreamentos de pilha** na produção - `global-error.tsx` e `error-handler.ts` ambos bloqueiam a saída de depuração atrás de `NODE_ENV`
5. **Relatório para análise** -- o `ErrorBoundary` reporta automaticamente para o serviço de análise via `analytics.captureException`

## Referência de arquivo

|Arquivo|Objetivo|
|------|---------|
|`app/global-error.tsx`|Página de erro de nível raiz com shell HTML completo|
|`app/not-found.tsx`|Página 404 não encontrada com opções de navegação|
|`components/error-boundary.tsx`|Limite de erro React reutilizável com análise|
|`components/error-provider.tsx`|Ouvinte de erro JS global envolvendo o aplicativo|
|`components/admin/admin-error-boundary.tsx`|Limite de escopo para widgets do painel de administração|
|`lib/api/error-handler.ts`|Tratamento de erros de rota de API padronizado|
