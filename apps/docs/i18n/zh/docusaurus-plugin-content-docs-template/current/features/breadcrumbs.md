---
id: breadcrumbs
title: 面包屑导航
sidebar_label: 面包屑
sidebar_position: 26
---

# 面包屑导航

该模板提供了一个面包屑导航系统，其中包含可重用的 UI 组件、特定于页面的面包屑和国际化支持。面包屑通过显示当前页面层次结构来改善用户导航和 SEO。

## 架构概述

面包屑导航在三个级别上实现：

|层 |文件|目的|
|--------|------|---------|
| **可重复使用的用户界面** | 0 |接受一系列项目的通用面包屑组件 |
| **项目详细信息** | 1 |具有类别意识的特定项目面包屑 |
| **收藏** | 2 |带有 i18n 的收藏页面面包屑 |

## 可重复使用的面包屑组件

基本面包屑组件的生命周期为 3 3 并接受一系列类型化的面包屑项目。

### BreadcrumbItem 接口

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

每个项目都有一个用于显示的0和一个可选的1用于链接。数组中的最后一项自动呈现为纯文本（当前页面）而不是链接。

### 面包屑道具

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **items** -- 在主页链接后显示的面包屑片段数组
- **homeLabel** -- 主页链接的标签（默认为0）
- **className** -- 应用于 nav 元素的附加 CSS 类

### 基本用法

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

function MyPage() {
  return (
    <Breadcrumb
      items={[
        { label: 'Categories', href: '/categories' },
        { label: 'Productivity', href: '/categories/productivity' },
        { label: 'Current Tool' },
      ]}
    />
  );
}
```

### 渲染行为

该组件呈现一个带有有序列表的可访问的 0 元素：

1. **主页链接** -- 始终首先显示房屋图标 SVG 和 `homeLabel` 文本
2. **中间项目** -- 渲染为带有 V 形分隔符的可点击 2 元素（来自 3 ）
3. **最后一项** -- 渲染为普通 4 和 5 以便可访问

```tsx
<nav className={cn('flex mb-8', className)} aria-label="Breadcrumb">
  <ol className="inline-flex items-center space-x-1 md:space-x-3">
    {/* Home link with icon */}
    <li className="inline-flex items-center text-black dark:text-white">
      <Link href="/">
        <HomeIcon />
        {homeLabel}
      </Link>
    </li>
    {/* Dynamic breadcrumb items with chevron separators */}
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <li key={index} aria-current={isLast ? 'page' : undefined}>
          <div className="flex items-center">
            <ChevronIcon />
            {item.href && !isLast ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </div>
        </li>
      );
    })}
  </ol>
</nav>
```

## 项目详细信息面包屑

1处的0组件是专门为项目详细信息页面设计的。它自动与类别系统集成。

### 道具

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### 类别感知导航

项目面包屑使用0 钩子有条件地呈现类别段。启用类别后，面包屑显示：

**首页** > **类别名称** > **商品名称**

当类别被禁用时，它会简化为：

**首页** > **商品名称**

```tsx
import { ItemBreadcrumb } from '@/components/item-detail/breadcrumb';

function ItemDetailPage({ item }) {
  return (
    <ItemBreadcrumb
      name={item.name}
      category={item.category}
      categoryName={item.categoryName}
    />
  );
}
```

### 弹头生成

该组件通过 0 实用程序处理类别标识符以生成 URL 安全路径：

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

类别链接遵循模式0。

### 文本截断

使用 1? Tailwind 类将项目名称截断为 200px 最大宽度，以防止长项目名称破坏布局。

## 集合面包屑

3 处的2 组件演示了 i18n 感知模式。

### 国际化

该组件使用 4 来翻译面包屑标签：

```tsx
import { useTranslations } from 'next-intl';

export function CollectionsBreadcrumb() {
  const t = useTranslations('common');

  return (
    <nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li>
          <Link href="/">{t('HOME')}</Link>
        </li>
        <li>
          <span>{t('COLLECTION')}</span>
        </li>
      </ol>
    </nav>
  );
}
```

翻译键在 0 目录中为每个受支持的语言环境定义。

## 样式和深色模式

所有面包屑组件都通过 Tailwind 的 `dark:` 前缀类支持暗模式：

|元素|灯光模式|深色模式 |
|--------|---------|------------|
|文字| 2 | 3 |
|友情链接 | 4 | 5 |
|雪佛龙图标| 6 | 7 |
|悬停状态 | 8 | 9 |

使用10 应用过渡以获得平滑的悬停效果。

## 辅助功能

面包屑组件遵循 WAI-ARIA 面包屑导航最佳实践：

- 12 元素上的 **11** 标识地标
- 最后一个面包屑项目上的 **13** 标记当前页面
- 装饰性 SVG 图标（主页和 V 形）上的 **14** 会将其隐藏在屏幕阅读器中
- **语义 HTML** 使用 15 结构来实现正确的文档大纲

## 添加自定义面包屑

要为特定页面创建新的面包屑，请使用可重用的 16 组件：

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

export function SettingsBreadcrumb() {
  return (
    <Breadcrumb
      items={[
        { label: 'Dashboard', href: '/client/dashboard' },
        { label: 'Settings' },
      ]}
      homeLabel="Home"
      className="mb-6"
    />
  );
}
```

对于需要翻译标签的页面，包装组件并传递翻译字符串：

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useTranslations } from 'next-intl';

export function LocalizedBreadcrumb() {
  const t = useTranslations('common');
  return (
    <Breadcrumb
      items={[
        { label: t('DASHBOARD'), href: '/client/dashboard' },
        { label: t('SETTINGS') },
      ]}
      homeLabel={t('HOME')}
    />
  );
}
```

## 相关文件

|文件|描述 |
|------|-------------|
| 0 |可重复使用的通用面包屑组件 |
| 1 |项目详细信息页面面包屑 |
| 2 |收藏页面面包屑 |
| 3 |检查类别功能是否处于活动状态的挂钩 |
| 4 |段塞生成公用设施（556）|
