---
id: image-management
title: 形象管理
sidebar_label: 形象管理
sidebar_position: 21
---

# 图像管理

Ever Works Template 包含一个图像域管理系统，用于控制允许哪些外部图像主机进行 Next.js 图像优化。该系统维护常见图像提供程序和图标服务的精选域列表，提供运行时域管理、URL 验证，并为 1 生成 0 配置。

## 架构概述

|组件|路径|目的|
|---|---|---|
| 2 | 3 |核心域列表、模式生成和验证实用程序 |
| 4 | 5 |用于在运行时管理域的 React hook |
| 6 | 7 |用于根据允许的域验证图像 URL 的 React hook

## 预配置域

该系统附带两个精选的域列表：

### 常见图像域

这些是用于用户头像和内容图像的标准图像托管服务：

|域名 |目的|
|---|---|
| 8 |谷歌用户个人资料图片|
| 9 | GitHub 用户头像 |
| 10 | Facebook 个人资料图片 |
| 11 | Twitter/X 个人资料图片 |
| 12 | Unsplash 图库摄影| Unsplash

### 图标域

专用图标和设计资产服务：

|域名 |目的|
|---|---|
| 13 | Flaticon 图标|
| 14 | Iconify图标库|
| 15 | Icons8 资产 |
| 16 |羽毛图标集|
| 17 |英雄图标库 |
| 18 |桌面图标|

## Next.js 远程模式

19 函数为 Next.js 图像配置创建 20 数组：

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### 生成的模式

该函数产生两种类型的模式：

1. **Specific patterns** with restricted pathnames for known services:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **所有注册域的子域的通配符模式**：

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## 域验证

### 00

检查 URL 的主机名是否在允许的域列表中：

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

该函数执行三个级别的匹配：

|检查 |描述 |
|---|---|
|精确匹配 |主机名与任一列表中的域完全匹配 |
|子域匹配 |任何注册域名的主机名均以 0 结尾 |
|非 HTTP 通行证 |没有 1 或 2 前缀的 URL 始终会通过 |

### 33

验证字符串是否是结构上有效的图像 URL：

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### 00

检测可能不是直接图像链接的 URL：

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

|检测规则|描述 |
|---|---|
| Flaticon 页面 URL | flaticon.com 上带有 0 路径的 URL |
|重定向参数 |包含 1 或 2 查询参数的 URL |
|缺少图像扩展 |不带 3 、  4 、  5 、  6 、  7 、  8 或  9 的 URL |

### 10

确定是否显示后备图标而不是图像：

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## 运行时域管理

### 添加域

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

该函数是幂等的——添加已注册的域没有任何效果。

### 删除域名

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### 获取所有域名

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

返回域数组的副本，防止外部突变。

## 0 钩子

用于通过状态同步管理图像域的 React hook：

```tsx
import { useImageDomains } from '@/hooks/use-image-domains';

function ImageDomainManager() {
  const { domains, addDomain, removeDomain, checkDomain } = useImageDomains();

  return (
    <div>
      <h3>Common Domains ({domains.common.length})</h3>
      <ul>
        {domains.common.map(domain => (
          <li key={domain}>
            {domain}
            <button onClick={() => removeDomain(domain)}>Remove</button>
          </li>
        ))}
      </ul>

      <h3>Icon Domains ({domains.icons.length})</h3>
      <ul>
        {domains.icons.map(domain => (
          <li key={domain}>{domain}</li>
        ))}
      </ul>

      <button onClick={() => addDomain('cdn.new-service.com')}>
        Add Domain
      </button>
    </div>
  );
}
```

### 钩子 API

|方法|参数|描述 |
|---|---|---|
| 0 | --|当前状态：1 |
| 2 | 3 |添加域并刷新状态 |
| 4 | 5 |删除域（规范化输入）并刷新状态 |
| 6 | 7 |检查某个 URL 的域是否被允许 |

8 方法通过修剪空格、小写字母和去除通配符前缀 (9) 来标准化输入。

## 10 钩子

用于根据允许的域列表验证图像 URL 的轻量级挂钩：

```tsx
import { useImageValidation } from '@/hooks/use-image-domains';

function ImageUrlInput({ value, onChange }) {
  const { checkImageUrl } = useImageValidation();

  const handleChange = (url: string) => {
    const { isValid, error } = checkImageUrl(url);
    if (!isValid) {
      console.warn(error);
      // e.g., "Domain not allowed. Add cdn.example.com to image domains configuration."
    }
    onChange(url);
  };

  return <input value={value} onChange={(e) => handleChange(e.target.value)} />;
}
```

### 验证结果

|场景 | 0 | 1 |
|---|---|---|
|非 HTTP URL（相对路径）| 2 | --|
|允许的域 | 3 | --|
|不允许的域名 | 4 | “不允许使用域。将 5° 添加到图像域配置中。” |
| URL 格式无效 | 6 | “URL 格式无效”|

## 关键文件

|文件|路径|
|---|---|
|图像域实用程序 | 7 |
|图像域挂钩 | 8 |
|图像验证挂钩 | 9 |
