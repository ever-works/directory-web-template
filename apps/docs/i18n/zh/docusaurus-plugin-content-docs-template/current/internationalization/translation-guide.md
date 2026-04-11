---
id: translation-guide
title: 翻译指南
sidebar_label: 翻译指南
sidebar_position: 2
---

# 翻译指南

本指南介绍如何使用和扩展基于 next-intl 的 Ever Works 多语言翻译系统。

## 支持的语言

Ever Works 支持 13 种以上语言：

| 语言 | 代码 | 标志 |
|----------|------|------|
| 🇬🇧 英语 | `en` | 默认 |
| 🇫🇷 法语 | `fr` | |
| 🇪🇸 西班牙语 | `es` | |
| 🇩🇪 德语 | `de` | |
| 🇨🇳 中文 | `zh` | |
| 🇸🇦 阿拉伯语 | `ar` | RTL 支持 |
| 🇮🇹 意大利语 | `it` | |
| 🇵🇹 葡萄牙语 | `pt` | |
| 🇷🇺 俄语 | `ru` | |
| 🇳🇱 荷兰语 | `nl` | |
| 🇵🇱 波兰语 | `pl` | |

## 使用方法

### 在 React 组件中

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('help');

  return (
    <div>
      <h1>{t('PAGE_TITLE')}</h1>
      <p>{t('PAGE_SUBTITLE')}</p>
    </div>
  );
}
```

## 添加新翻译

### 第一步：添加英语键

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### 第二步：翻译为其他语言

```json
{
  "help": {
    "NEW_SECTION_TITLE": "新章节",
    "NEW_SECTION_DESC": "新章节的描述"
  }
}
```

## 翻译命名空间

### 通用（`common`）
- 导航元素
- 常见操作（保存、取消、删除）

### 认证（`auth`）
- 登录和注册
- 密码管理

### 帮助（`help`）
- 帮助中心内容
- FAQ 章节

## 最佳实践

### 1. 命名规范

```json
{
  // ✅ 好的做法
  "FAQ_SETUP_TIME": "How long does setup take?",
  
  // ❌ 不好的做法
  "FAQ_1": "How long does setup take?"
}
```

### 2. 变量和占位符

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

### 3. 复数处理

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

## 添加新语言

### 第一步：创建消息文件

```bash
cp messages/en.json messages/zh.json
```

### 第二步：更新配置

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'ru'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### 第三步：添加国旗图标

将 SVG 文件放置在 `/public/flags/zh.svg`

### 第四步：翻译内容

将 `messages/zh.json` 中的所有键翻译为中文

## 推荐工具

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - 用于管理翻译的 VS Code 扩展
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - 可视化翻译编辑器
- **[Crowdin](https://crowdin.com/)** - 协作翻译平台

## 翻译检查清单

添加包含文本的新功能时：

- [ ] 在 `en.json` 中添加英语键
- [ ] 翻译为法语 (`fr.json`)
- [ ] 翻译为西班牙语 (`es.json`)
- [ ] 翻译为德语 (`de.json`)
