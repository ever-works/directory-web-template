---
id: promo-codes
title: 促销代码系统
sidebar_label: 促销代码
sidebar_position: 14
---

# 促销代码系统

Ever Works 模板包括一个全面的促销代码系统，用于在商品列表页面上显示促销折扣、优惠券代码和特别优惠。该系统支持多种折扣类型、过期跟踪、剪贴板复制、分析集成和响应式 UI 变体。

## 架构概述

|组件|路径|目的|
|---|---|---|
| 0 | 1 |用于显示促销代码的 UI 组件 |
| 2 | 3 |用于单个促销代码管理的挂钩 |
| 4 | 5 |用于管理多个促销代码的挂钩 |
| 6型 | 7 |促销代码数据的类型定义 |

## 折扣类型

系统支持三种折扣类型：

|类型 |显示|示例|
|---|---|---|
| 8 | 9 | “25% 折扣” |
| 10 | 11 | “优惠 10 美元” |
| 12 | 13 | “免费送货” |

## 14 钩子

### 接口

```tsx
interface UsePromoCodeOptions {
  trackCopies?: boolean;    // Track copy events (default: true)
  trackClicks?: boolean;    // Track click events (default: true)
  onCodeCopied?: (code: string) => void;
  onCodeUsed?: (code: string) => void;
}

interface UsePromoCodeReturn {
  stats: PromoCodeStats;
  copyCode: (code: string) => Promise<boolean>;
  useCode: (code: string, url?: string) => void;
  isExpired: (promoCode: PromoCode) => boolean;
  getDiscountText: (promoCode: PromoCode) => string;
  clearStats: () => void;
}
```

＃＃＃ 用法

```tsx
import { usePromoCode } from '@/hooks/use-promo-code';

function PromoDisplay({ promoCode }) {
  const { copyCode, useCode, isExpired, getDiscountText } = usePromoCode({
    onCodeCopied: (code) => console.log(`Copied: ${code}`),
    onCodeUsed: (code) => console.log(`Used: ${code}`)
  });

  if (isExpired(promoCode)) {
    return <span>This code has expired</span>;
  }

  return (
    <div>
      <span>{getDiscountText(promoCode)}</span>
      <code>{promoCode.code}</code>
      <button onClick={() => copyCode(promoCode.code)}>Copy</button>
      <button onClick={() => useCode(promoCode.code, promoCode.url)}>Use Code</button>
    </div>
  );
}
```

## 统计跟踪

该钩子跟踪复制和点击统计数据，保留在 0 中：

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

统计数据会在会话之间自动保存和恢复：

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## 分析集成

该钩子会在可用时自动触发 Google Analytics 事件：

|活动 |类别 |触发|
|---|---|---|
| 0 | 1 |当代码复制到剪贴板时 |
| 2 | 3 |当激活/单击代码时 |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## 管理多个促销代码

0 挂钩延伸1 用于集合：

```tsx
import { usePromoCodes } from '@/hooks/use-promo-code';

function PromoCodeList({ promoCodes }) {
  const {
    activePromoCodes,
    expiredPromoCodes,
    getBestDiscount,
    hasActivePromoCodes,
    totalPromoCodes,
    copyCode,
    isExpired,
    getDiscountText
  } = usePromoCodes(promoCodes);

  const bestDeal = getBestDiscount();

  return (
    <div>
      <h3>{totalPromoCodes} promo codes ({activePromoCodes.length} active)</h3>
      {bestDeal && <div>Best deal: {getDiscountText(bestDeal)}</div>}
      {activePromoCodes.map(code => (
        <PromoCodeComponent key={code.code} promoCode={code} />
      ))}
    </div>
  );
}
```

### 最佳折扣算法

0 功能选择最佳可用折扣：
1. 仅过滤有效（未过期）代码
2. 按价值比较折扣百分比（越高越好）
3.按价值比较固定折扣（越高越好）
4. 免费送货代码始终被认为具有竞争力

## 促销代码组件

1 呈现具有三种变体的样式促销代码卡：

### 变体

|变体 |描述 |
|---|---|
| 2 |全尺寸卡片，包含说明、术语、复制按钮和使用按钮 |
| 3 |带有代码和复制图标的内联徽章|
| 4 |增强默认设置，带有环形高光和更大的阴影 |

＃＃＃ 用法

```tsx
import { PromoCodeComponent } from '@/components/promo-code/promo-code';

// Default variant
<PromoCodeComponent promoCode={code} />

// Compact inline variant
<PromoCodeComponent promoCode={code} variant="compact" />

// Featured with all options
<PromoCodeComponent
  promoCode={code}
  variant="featured"
  showDescription={true}
  showTerms={true}
  onCodeCopied={(code) => console.log(`Copied: ${code}`)}
/>
```

### 组件道具

|道具|类型 |默认|描述 |
|---|---|---|---|
| 0 | 1 |必填|促销代码数据对象 |
| 2 | 3 | 4 |其他 CSS 类 |
| 5 | 6 | 7 |显示变体 |
| 8 | 9 | 10 |显示代码说明 |
| 11 | 12 | 13 |显示条款和条件 |
| 14 | 15 | 16 |代码复制时的回调 |

## 剪贴板支持

复制功能包括旧版浏览器的后备功能：

```tsx
const copyCode = async (code: string): Promise<boolean> => {
  try {
    // Modern Clipboard API
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    // Fallback: hidden textarea + execCommand
    const textArea = document.createElement("textarea");
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textArea);
    return result;
  }
};
```

## 国际化

该组件对所有面向用户的字符串使用0：

|翻译键 |用途 |
|---|---|
| 1 |有效期标签|
| 2 |过期徽章文本 |
| 3 |代码字段标签 |
| 4 |复制确认文本 |
| 5 |复制按钮文本 |
| 6 |使用代码按钮文本 |
| 7 |术语标签|

## 关键文件

|文件|路径|
|---|---|
|促销代码组件 | 8 |
|促销代码挂钩 | 9 |
|促销代码类型 | 10（出口型）|
