---
id: data-versioning
title: 数据版本显示系统
sidebar_label: 数据版本
sidebar_position: 6
---

# 数据版本显示系统

Ever Works 包含一个数据版本控制系统，向用户显示当前正在查看的数据版本，提供内容新鲜度的透明度。

## 概述

该系统提供：
- 📊 **实时版本显示** - 显示数据仓库的当前版本
- 🔄 **自动刷新** - 定期更新版本信息
- 🎨 **多种变体** - 徽章、内联和详细视图
- 💡 **工具提示详情** - 悬停以获取全面信息
- ⚡ **ISR 支持** - 与增量静态再生成配合使用
- 🛡️ **错误处理** - 不可用时优雅降级

## 架构

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## 组件

### VersionDisplay

显示版本信息的主要组件。

```tsx
import { VersionDisplay } from "@/components/version";

// 基本内联显示
<VersionDisplay variant="inline" />

// 徽章变体
<VersionDisplay variant="badge" />

// 带附加信息的详细视图
<VersionDisplay variant="detailed" showDetails={true} />
```

**属性**：
- `variant`：`"inline" | "badge" | "detailed"` - 显示样式
- `showDetails`：`boolean` - 显示扩展信息（仅详细变体）
- `className`：`string` - 附加 CSS 类
- `refreshInterval`：`number` - 自动刷新间隔（毫秒，默认：5 分钟）

### VersionTooltip

添加带有详细版本信息工具提示的包装组件。

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**功能**：
- 显示提交哈希和日期
- 显示提交信息
- 显示作者信息
- 链接到仓库

### useVersionInfo 钩子

用于管理版本信息的自定义钩子，支持缓存和自动刷新。

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 分钟
  retryOnError: true,
  retryDelay: 10000
});
```

**返回值**：
- `versionInfo`：版本数据对象
- `loading`：加载状态
- `error`：错误状态
- `refetch`：手动刷新函数

## API 端点

### GET /api/version

返回当前数据仓库版本信息。

**响应**：
```json
{
  "commit": "abc1234",
  "date": "2024-01-01T12:00:00.000Z",
  "message": "Update data items",
  "author": "Developer Name",
  "repository": "https://github.com/owner/repo",
  "lastSync": "2024-01-01T12:05:00.000Z"
}
```

**功能**：
- 获取前自动同步仓库
- 适当的缓存头以获得最佳性能
- ETag 支持高效缓存
- 使用适当 HTTP 状态码的错误处理

**缓存头**：
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## 配置

### 环境变量

```env
# 数据仓库 URL
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# 私有仓库的 GitHub token（可选）
GH_TOKEN=ghp_your_github_token_here

# 仓库同步间隔（可选，默认：5 分钟）
REPO_SYNC_INTERVAL=300000
```

### 缓存策略

#### 客户端缓存
- **持续时间**：1 分钟
- **策略**：stale-while-revalidate
- **刷新**：自动后台更新

#### 服务器端缓存
- **持续时间**：60 秒
- **策略**：s-maxage 带重验证
- **ETag**：基于提交哈希

## 使用示例

### 页脚版本徽章

```tsx
// components/footer/Footer.tsx
import { VersionDisplay } from "@/components/version";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <p>© 2024 Ever Works</p>
        <VersionDisplay variant="badge" />
      </div>
    </footer>
  );
}
```

### 管理员仪表板

```tsx
// app/admin/dashboard/page.tsx
import { VersionDisplay } from "@/components/version";

export default function AdminDashboard() {
  return (
    <div>
      <h1>管理员仪表板</h1>
      <VersionDisplay 
        variant="detailed" 
        showDetails={true}
        refreshInterval={60000} // 1 分钟
      />
    </div>
  );
}
```

### 自定义实现

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

export function CustomVersionDisplay() {
  const { versionInfo, loading, error, refetch } = useVersionInfo();

  if (loading) return <div>加载版本中...</div>;
  if (error) return <div>版本不可用</div>;

  return (
    <div>
      <p>数据版本：{versionInfo.commit.substring(0, 7)}</p>
      <p>更新时间：{new Date(versionInfo.date).toLocaleDateString()}</p>
      <button onClick={refetch}>刷新</button>
    </div>
  );
}
```

## 显示变体

### 内联变体

适合页脚或侧边栏的紧凑文本显示。

```tsx
<VersionDisplay variant="inline" />
// 输出："Data v.abc1234 • 2 小时前更新"
```

### 徽章变体

带图标的药丸形状徽章，适合页眉或导航。

```tsx
<VersionDisplay variant="badge" />
// 输出：[🔄 v.abc1234]
```

### 详细变体

包含所有版本信息的综合视图。

```tsx
<VersionDisplay variant="detailed" showDetails={true} />
// 输出：包含提交、日期、消息、作者、仓库链接的卡片
```

## 最佳实践

### 1. 放置位置
- **页脚**：使用内联或徽章变体
- **管理面板**：使用详细变体
- **页眉**：使用徽章变体
- **工具提示**：用 VersionTooltip 包装任何变体

### 2. 刷新间隔
- **公共页面**：5-10 分钟
- **管理页面**：1-2 分钟
- **实时仪表板**：30 秒

### 3. 错误处理
- 始终提供降级 UI
- 记录错误以供监控
- 向用户显示友好信息

### 4. 性能
- 使用适当的缓存持续时间
- 实现 stale-while-revalidate
- 避免过多的 API 调用

## 故障排除

### 版本未更新

**问题**：版本信息未刷新

**解决方案**：检查刷新间隔和缓存设置

```tsx
// 强制立即刷新
const { refetch } = useVersionInfo();
refetch();
```

### API 错误

**问题**：`/api/version` 返回错误

**解决方案**：验证环境变量和仓库访问

```bash
# Check environment variables
echo $DATA_REPOSITORY
echo $GH_TOKEN

# Test repository access
git ls-remote $DATA_REPOSITORY
```

### 加载缓慢

**问题**：版本组件加载缓慢

**解决方案**：优化缓存并减少刷新频率
