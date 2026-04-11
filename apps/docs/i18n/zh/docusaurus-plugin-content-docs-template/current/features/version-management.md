---
id: version-management
title: 版本管理
sidebar_label: 版本管理
sidebar_position: 15
---

# 版本管理

Ever Works Template 包括一个版本管理系统，用于跟踪数据存储库版本、向管理员显示版本信息并提供自动同步检测。该系统监控基于 Git 的 CMS 内容存储库，并通过可配置的 UI 组件显示版本详细信息。

## 架构概述

|组件|路径|目的|
|---|---|---|
| 0 | 1 |用于从 API 获取版本数据的 React Query 钩子 |
| 2 | 3 |用于缓存管理的实用挂钩 |
| 4 | 5 |可配置版本显示组件 |
| 6 | 7 |显示详细版本信息的悬停工具提示 |
| 8 | 9 |返回当前版本数据的 API 端点 |

## 版本信息数据结构

版本系统跟踪内容存储库中的以下数据：

|领域 |类型 |描述 |
|---|---|---|
| 10 | 11 |当前数据版本的短提交哈希 |
| 12 | 13 |提交的 ISO 日期字符串 |
| 14 | 15 |提交作者姓名 |
| 16 | 17 |提交消息 |
| 18 | 19 |存储库网址 |
| 20 | 21 |上次数据同步时间戳 |

## 22 钩子

### 接口

```tsx
interface UseVersionInfoOptions {
  refreshInterval?: number;    // Auto-refresh interval in ms (default: 5 min)
  retryOnError?: boolean;      // Retry on failures (default: true)
  enabled?: boolean;           // Enable/disable the query (default: true)
}

interface UseVersionInfoReturn {
  versionInfo: VersionInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: UseVersionInfoError | null;
  refetch: () => Promise<any>;
  isStale: boolean;
  dataUpdatedAt: number;
  invalidateVersionInfo: () => Promise<void>;
}
```

＃＃＃ 用法

```tsx
import { useVersionInfo } from '@/hooks/use-version-info';

function VersionIndicator() {
  const { versionInfo, isLoading, error } = useVersionInfo({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    retryOnError: true
  });

  if (isLoading) return <span>Loading...</span>;
  if (error) return <span>Version unavailable</span>;

  return <span>v{versionInfo?.commit}</span>;
}
```

### 缓存策略

|设置|价值|描述 |
|---|---|---|
| 0 | 5 分钟 | 5 分钟内数据被视为新鲜 |
| 1 | 30 分钟 | 30分钟后垃圾收集 |
| 2 | 3 |选项卡开关上没有重新获取 |
| 4 | 5 |网络重新连接时重新获取 |
| 6 | 7 |如果缓存有数据则跳过重新获取 |

### 重试逻辑

该钩子实现了具有指数退避的智能重试：

- 不重试客户端错误（4xx 状态代码）
- 重试网络和服务器错误最多 2 次
- 使用指数退避：8

## 版本显示组件

9 组件支持三种视觉变体：

### 内联变体（默认）

显示提交哈希值和相对时间的紧凑内联显示：

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### 徽章变体

渐变背景的药丸形徽章：

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### 详细变体

包含完整版本信息的卡片：

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

详细的变体显示：
- 提交哈希值和相对时间
- 作者姓名
- 提交消息（第一行，引用）
- 最后更新时间戳（当0为真时）
- 上次同步时间戳
- 存储库名称

### 道具

|道具|类型 |默认|描述 |
|---|---|---|---|
| 1 | 2 | 3 |其他 CSS 类 |
| 4 | 5 | 6 |展示风格|
| 7 | 8 | 9 |显示扩展详细信息（仅限详细版本）|
| 10 | 11 | 12（5 分钟）|自动刷新间隔（以毫秒为单位）|

### 访问控制

该组件尊重用户角色：
- **普通用户**：当版本信息不可用时，组件被隐藏
- **开发/管理员用户**：错误状态显示为“版本不可用”消息

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## 版本工具提示

0 用悬停工具提示包裹任何元素，显示详细的版本信息：

```tsx
import { VersionTooltip } from '@/components/version/version-tooltip';

function Footer() {
  return (
    <VersionTooltip delay={300}>
      <span>Data v1.0</span>
    </VersionTooltip>
  );
}
```

### 工具提示功能

|特色 |描述 |
|---|---|
|延迟演出 |工具提示出现之前的可配置延迟（默认值：300 毫秒）|
|快速隐藏|鼠标离开时延迟 100 毫秒，实现流畅交互 |
|工具提示悬停 |将鼠标悬停在工具提示上方时保持可见 |
|键盘支持 | Escape 键可取消工具提示 |
|无障碍 | ARIA 属性 (0,1) |
|优雅降级 |当数据不可用时返回没有工具提示的子项 |

### 道具

|道具|类型 |默认|描述 |
|---|---|---|---|
| 2 | 3 |必填|触发元素|
| 4 | 5 | 6 |其他 CSS 类 |
| 7 | 8 | 9 |完全禁用工具提示 |
| 10 | 11 | 12 |显示延迟（以毫秒为单位）|

## 缓存实用程序

13 钩子提供缓存管理功能：

```tsx
import { useVersionInfoUtils } from '@/hooks/use-version-info';

function AdminPanel() {
  const {
    prefetchVersionInfo,
    invalidateVersionInfo,
    getVersionInfoFromCache,
    setVersionInfoInCache
  } = useVersionInfoUtils();

  // Prefetch version data before it is needed
  useEffect(() => {
    prefetchVersionInfo();
  }, []);

  // Force refresh
  const handleRefresh = () => invalidateVersionInfo();

  // Read directly from cache
  const cached = getVersionInfoFromCache();
}
```

## 日期格式

0 组件包括记忆日期格式化实用程序：

|功能|示例输出 |
|---|---|
| 1 | “2025 年 1 月 15 日下午 02:30” |
| 2 | “刚刚”、“3 小时前”、“2 天前”、“1 月 15 日”|
| 3 | “ever-works/很棒的时间跟踪数据”|

## 关键文件

|文件|路径|
|---|---|
|版本信息挂钩 | 4 |
|版本展示 | 5 |
|版本工具提示 | 6 |
|版本 API 路线 | 7 |
