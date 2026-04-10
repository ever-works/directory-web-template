---
id: locale-detection
title: 语言检测与路由
sidebar_label: 语言检测
sidebar_position: 3
---

# 语言检测与路由

该模板使用 `next-intl` 进行语言检测，具备浏览器语言自动匹配、基于 URL 的路由、Cookie 持久化和备用消息系统等功能。

## 检测流程

当请求到达时，语言按以下顺序确定：

1. **URL 前缀** — 如果 URL 包含语言前缀（例如 `/fr/about`），则直接使用该语言
2. **Cookie** — 如果没有 URL 前缀，系统检查由 LanguageSwitcher 组件设置的语言 Cookie
3. **Accept-Language 请求头** — 如果没有 Cookie，则读取浏览器语言偏好请求头
4. **回退** — 如果未找到匹配，使用默认语言（`en`）

## 源文件

| 文件 | 检测中的角色 |
|------|-------------------|
| `i18n/routing.ts` | 定义支持的语言环境、前缀策略 |
| `i18n/request.ts` | 验证检测到的语言，加载消息 |
| `i18n/navigation.ts` | 提供支持语言的 Link、router、redirect |
| `lib/constants.ts` | LOCALES 和 RTL_LOCALES 数组的唯一事实来源 |
| `components/language-switcher.tsx` | 通过 router.replace 设置语言 Cookie |
| `app/[locale]/layout.tsx` | 验证语言，通过 notFound() 拒绝无效语言 |

## 路由配置

```typescript
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/constants";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localeDetection: true,
  localePrefix: "as-needed",
});
```

### 前缀策略

| 请求 | 检测到的语言 | 显示的 URL |
|---------|-----------------|-----------|
| `/about` | `en` | `/about`（默认语言无前缀） |
| `/fr/about` | `fr` | `/fr/about`（其他语言需要前缀） |
| `/en/about` | `en` | 重定向到 `/about` |

## 备用消息逻辑

- 英语消息作为包含所有键的基础层
- 特定语言的消息只覆盖已定义的键
- 语言文件中缺失的键保留英语值
- 嵌套对象递归合并

## Cookie 持久化

当用户通过 LanguageSwitcher 选择语言时，`next-intl` 设置 Cookie：

```typescript
const changeLanguage = useCallback(
  (locale: string) => {
    if (locale === currentLocale || isPending) return;

    startTransition(() => {
      router.replace(pathname, { locale });
    });
    setIsOpen(false);
  },
  [currentLocale, isPending, router, pathname]
);
```

## Accept-Language 检测

```
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
```

系统在支持的 `LOCALES` 数组中查找匹配。第一个匹配的语言获胜。

## 语言环境故障排除

| 问题 | 可能原因 | 解决方案 |
|---------|-------------|----------|
| 显示翻译键而非文本 | 语言文件中缺少该键 | 在 `messages/en.json`（回退）中添加键 |
| 显示错误语言 | Cookie 覆盖了 URL | 清除 Cookie 或使用无痕模式 |
| 语言 URL 出现 404 | 语言未在 LOCALES 数组中 | 在 `lib/constants.ts` 中添加代码 |
| RTL 布局未应用 | 语言未在 RTL_LOCALES 中 | 在 `lib/constants.ts` 的 `RTL_LOCALES` 中添加 |

## 最佳实践

1. **始终使用 `@/i18n/navigation` 中的 `Link`** 而非 `next/link`
2. **先将所有新键添加到 `en.json`** 因为这是回退语言
3. **通过设置浏览器语言偏好来测试检测**
4. **依赖 `deepmerge` 回退机制** — 部分翻译的文件是预期情况，会被正确处理
