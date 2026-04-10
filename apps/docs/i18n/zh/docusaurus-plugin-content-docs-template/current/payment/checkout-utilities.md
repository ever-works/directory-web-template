---
id: checkout-utilities
title: "结账工具"
sidebar_label: "结账工具"
sidebar_position: 7
---

# 结账工具

`checkout-utils` 模块（`lib/utils/checkout-utils.ts`）提供了在浏览器中打开支付结账流程的辅助函数。它处理弹出窗口拦截、回退重定向、错误处理，并为结账按钮创建可复用的点击处理器。

## 核心概念

结账工具解决了打开支付提供商结账页面时常见的浏览器挑战：

- **弹出窗口拦截** -- 浏览器可能会拦截 `window.open()` 调用。工具会检测此情况并回退到直接导航。
- **错误处理** -- 网络故障和意外错误会被捕获并通过回调函数报告。
- **可复用处理器** -- 工厂函数创建可附加到任何按钮组件的点击处理器。

## 类型

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // 默认: '_blank'
  windowFeatures?: string;   // 默认: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // 默认: true
}
```

## 函数

### openCheckoutInNewTab

在新浏览器标签页中打开结账 URL，支持弹出窗口检测和回退：

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // 弹出窗口和重定向均失败
  console.error('无法打开结账页面');
}
```

#### 实现

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

#### 行为流程

1. **SSR 保护** -- 在服务器上运行时立即返回 `false`
2. **打开弹出窗口** -- 使用指定功能尝试 `window.open()`
3. **弹出窗口被拦截** -- 如果 `window.open()` 返回 `null`，则弹出窗口已被拦截
4. **回退重定向** -- 如果 `fallbackToRedirect` 为 `true`（默认），则将当前页面导航到结账 URL
5. **聚焦尝试** -- 尝试将焦点设置到新窗口（在某些浏览器中可能失败而不产生错误）
6. **错误捕获** -- 任何异常都会在启用时回退到重定向

#### 选项

| 选项 | 默认值 | 描述 |
|--------|---------|-------------|
| `url` | 必填 | 要打开的结账 URL |
| `windowName` | `'_blank'` | 目标窗口名称 |
| `windowFeatures` | `'noopener,noreferrer'` | 新窗口的安全功能 |
| `fallbackToRedirect` | `true` | 弹出窗口被拦截时导航当前页面 |

### openCheckoutWithErrorHandling

`openCheckoutInNewTab` 的包装器，添加了错误回调：

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // 向用户显示错误
  }
);
```

#### 实现

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

工厂函数，创建带有成功、错误和 toast 回调的结账点击处理器。设计为直接传递给按钮的 `onClick` 属性：

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
    showAlert: true, // 失败时显示 toast 通知
  });

  return (
    <button onClick={handleCheckout}>
      立即订阅
    </button>
  );
}
```

#### 实现

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

#### 选项

| 选项 | 类型 | 描述 |
|--------|------|-------------|
| `onSuccess` | `() => void` | 结账成功打开时调用 |
| `onError` | `(error: string) => void` | 失败时以错误消息调用 |
| `showAlert` | `boolean` | 失败时使用 `sonner` 显示 toast 通知 |

## 使用模式

### 基本结账按钮

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      前往结账
    </button>
  );
}
```

### 带分析的结账

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
      选择 {plan.name}
    </button>
  );
}
```

### 禁用弹出窗口回退

如果您想阻止当前页面导航（例如在模态框中），请禁用重定向回退：

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // 显示内联消息而不是导航
  setShowPopupBlockedMessage(true);
}
```

## 安全注意事项

- `noopener,noreferrer` 窗口功能防止打开的页面访问 `window.opener`，保护免受标签页劫持攻击
- `fallbackToRedirect` 使用 `window.location.href` 赋值（而非 `window.open`），不受弹出窗口拦截器限制
- SSR 保护防止在服务器端渲染期间访问 `window`

## 源文件

| 文件 | 用途 |
|------|---------|
| `lib/utils/checkout-utils.ts` | 结账窗口管理和点击处理器 |
