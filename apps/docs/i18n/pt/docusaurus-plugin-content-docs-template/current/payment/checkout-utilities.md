---
id: checkout-utilities
title: "Utilitários de Checkout"
sidebar_label: "Utilitários de Checkout"
sidebar_position: 7
---

# Utilitários de Checkout

O módulo `checkout-utils` (`lib/utils/checkout-utils.ts`) fornece funções auxiliares para abrir fluxos de checkout de pagamento no navegador. Ele lida com bloqueio de popup, redirecionamentos de fallback, tratamento de erros e cria handlers de clique reutilizáveis para botões de checkout.

## Conceitos Principais

Os utilitários de checkout resolvem desafios comuns do navegador ao abrir páginas de checkout de provedores de pagamento:

- **Bloqueio de popup** -- Navegadores podem bloquear chamadas `window.open()`. Os utilitários detectam isso e recorrem à navegação direta.
- **Tratamento de erros** -- Falhas de rede e erros inesperados são capturados e relatados por meio de callbacks.
- **Handlers reutilizáveis** -- Uma função de fábrica cria handlers de clique que podem ser anexados a qualquer componente de botão.

## Tipos

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // Padrão: '_blank'
  windowFeatures?: string;   // Padrão: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // Padrão: true
}
```

## Funções

### openCheckoutInNewTab

Abre uma URL de checkout em uma nova aba do navegador com detecção de popup e fallback:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // Tanto o popup quanto o redirecionamento falharam
  console.error('Não foi possível abrir o checkout');
}
```

#### Implementação

```ts
export function openCheckoutInNewTab(
  options: CheckoutWindowOptions
): boolean {
  const {
    url,
    windowName = '_blank',
    windowFeatures = 'noopener,noreferrer',
    fallbackToRedirect = true,
  } = options;

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const newWindow = window.open(url, windowName, windowFeatures);

    if (!newWindow) {
      console.warn('Popup blocked by browser');

      if (fallbackToRedirect) {
        window.location.href = url;
        return true;
      }

      return false;
    }

    try {
      newWindow.focus();
    } catch (focusError) {
      console.warn('Could not focus new window:', focusError);
    }

    return true;
  } catch {
    if (fallbackToRedirect) {
      window.location.href = url;
      return true;
    }
    return false;
  }
}
```

#### Fluxo de Comportamento

1. **Proteção SSR** -- Retorna `false` imediatamente se executado no servidor
2. **Abrir popup** -- Tenta `window.open()` com as funcionalidades especificadas
3. **Popup bloqueado** -- Se `window.open()` retorna `null`, o popup foi bloqueado
4. **Redirecionamento fallback** -- Se `fallbackToRedirect` é `true` (padrão), navega a página atual para a URL de checkout
5. **Tentativa de foco** -- Tenta focar a nova janela (pode falhar em alguns navegadores sem causar um erro)
6. **Captura de erro** -- Qualquer exceção recorre ao redirecionamento se habilitado

#### Opções

| Opção | Padrão | Descrição |
|--------|---------|-------------|
| `url` | Obrigatório | A URL de checkout a abrir |
| `windowName` | `'_blank'` | Nome da janela de destino |
| `windowFeatures` | `'noopener,noreferrer'` | Funcionalidades de segurança para a nova janela |
| `fallbackToRedirect` | `true` | Navegar página atual se o popup for bloqueado |

### openCheckoutWithErrorHandling

Um wrapper em torno de `openCheckoutInNewTab` que adiciona um callback de erro:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // Exibir erro ao usuário
  }
);
```

#### Implementação

```ts
export function openCheckoutWithErrorHandling(
  url: string,
  onError?: (error: string) => void
): boolean {
  const success = openCheckoutInNewTab({ url });

  if (!success && onError) {
    onError(
      'Unable to open checkout. Please check your popup blocker settings.'
    );
  }

  return success;
}
```

### createCheckoutClickHandler

Uma função de fábrica que cria um handler de clique para checkout com callbacks de sucesso, erro e toast. Ela foi projetada para ser passada diretamente para props `onClick` de botões:

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';

function PricingCard({ checkoutUrl }: { checkoutUrl: string }) {
  const handleCheckout = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_opened');
    },
    onError: (error) => {
      console.error(error);
    },
    showAlert: true, // Mostrar notificação toast em caso de falha
  });

  return (
    <button onClick={handleCheckout}>
      Assinar Agora
    </button>
  );
}
```

#### Implementação

```ts
export function createCheckoutClickHandler(
  checkoutUrl: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    showAlert?: boolean;
  }
) {
  return () => {
    const success = openCheckoutWithErrorHandling(
      checkoutUrl,
      options?.onError
    );

    if (success && options?.onSuccess) {
      options.onSuccess();
    }

    if (!success && options?.showAlert) {
      toast.error(
        'Unable to open checkout. Please try again or contact support.'
      );
    }
  };
}
```

#### Opções

| Opção | Tipo | Descrição |
|--------|------|-------------|
| `onSuccess` | `() => void` | Chamado quando o checkout abre com sucesso |
| `onError` | `(error: string) => void` | Chamado com mensagem de erro em caso de falha |
| `showAlert` | `boolean` | Mostrar uma notificação toast usando `sonner` em caso de falha |

## Padrões de Uso

### Botão de Checkout Básico

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      Ir para o Checkout
    </button>
  );
}
```

### Checkout com Analytics

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';
import { analytics } from '@/lib/analytics';

function PricingTier({ plan, checkoutUrl }) {
  const handleClick = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_initiated', {
        plan: plan.name,
        price: plan.price,
      });
    },
    onError: (error) => {
      analytics.captureException(new Error(error), {
        plan: plan.name,
      });
    },
    showAlert: true,
  });

  return (
    <button onClick={handleClick}>
      Escolher {plan.name}
    </button>
  );
}
```

### Desabilitando o Fallback de Popup

Se você quiser impedir que a página atual navegue (por exemplo, em um modal), desabilite o fallback de redirecionamento:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // Mostrar mensagem inline em vez de navegar
  setShowPopupBlockedMessage(true);
}
```

## Considerações de Segurança

- As funcionalidades de janela `noopener,noreferrer` impedem que a página aberta acesse `window.opener`, protegendo contra ataques de tabnapping
- O `fallbackToRedirect` usa atribuição `window.location.href` (não `window.open`) que não está sujeita a bloqueadores de popup
- A proteção SSR previne acesso a `window` durante renderização no lado do servidor

## Arquivos Fonte

| Arquivo | Propósito |
|------|---------|
| `lib/utils/checkout-utils.ts` | Gerenciamento de janelas de checkout e handlers de clique |
