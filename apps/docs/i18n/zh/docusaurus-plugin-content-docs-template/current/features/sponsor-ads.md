---
id: sponsor-ads
title: 赞助商广告系统
sidebar_label: 赞助商广告
sidebar_position: 10
---

# 赞助商广告系统

赞助商广告系统允许目录用户通过付费赞助来宣传他们的项目。该系统包括提交工作流程、付款集成、管理审批流程以及有效赞助商广告的公开展示。

## 源位置

```
hooks/use-user-sponsor-ads.ts        # User-facing CRUD + checkout
hooks/use-admin-sponsor-ads.ts       # Admin management (approve/reject/cancel)
hooks/use-active-sponsor-ads.ts      # Public display of active ads
hooks/use-sponsor-ad-detail.ts       # Single ad detail fetch
lib/types/sponsor-ad.ts              # Type definitions
app/api/sponsor-ads/                  # API routes
  route.ts                            #   GET active ads (public)
  checkout/route.ts                   #   POST create checkout
  user/route.ts                       #   GET/POST user's ads
  user/[id]/route.ts                  #   GET/PUT single ad
  user/[id]/cancel/route.ts           #   POST cancel ad
  user/[id]/renew/route.ts            #   POST renew ad
  user/stats/route.ts                 #   GET user stats
```

## 赞助商广告生命周期

```
User Submits --> pending_payment --> User Pays --> pending --> Admin Reviews
                                                    |
                                            +-------+-------+
                                            |               |
                                         approved        rejected
                                            |
                                          active --> expired
                                            |
                                        cancelled
```

### 状态值

|状态 |描述 |
|--------|-------------|
| 0 |广告已创建，等待付款 |
| 1 |付款已收到，正在等待管理员批准 |
| 2 |已批准并当前显示 |
| 3 |管理员拒绝提交 |
| 4 |活跃期已结束 |
| 5 |已被用户或管理员取消 |

### 间隔类型

|间隔|持续时间 |
|----------|----------|
| 6 | 7天赞助|
| 7 | 30 天赞助 |

## 类型定义

### SponsorAd（数据库架构）

8 类型来自 Drizzle 模式 (9)。关键领域包括：

- 10、11、1213、1415
- 16（上述状态值之一）
- 17（18或19）
- 2021
- 22232425
-2627
-2829

### 赞助商与项目

用于显示组件——将赞助商广告与其解析的项目数据配对：

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

### 赞助商广告统计

stats 端点返回的聚合统计信息：

```ts
interface SponsorAdStats {
  overview: {
    total: number;
    pendingPayment: number;
    pending: number;
    active: number;
    rejected: number;
    expired: number;
    cancelled: number;
  };
  byInterval: {
    weekly: number;
    monthly: number;
  };
  revenue: {
    totalRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
  };
}
```

---

## 使用用户赞助广告

用户管理赞助商广告提交的主要钩子。

＃＃＃ 进口

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

＃＃＃ 参数

```ts
interface UseUserSponsorAdsOptions {
  page?: number;       // default: 1
  limit?: number;      // default: 10
  status?: SponsorAdStatus;
  interval?: 'weekly' | 'monthly';
  search?: string;
}
```

### 返回值

```ts
const {
  // Data
  sponsorAds,           // SponsorAd[]
  stats,                // SponsorAdStats

  // Loading states
  isLoading,            // boolean - initial fetch
  isFetching,           // boolean - any fetch including background
  isStatsLoading,       // boolean - stats query loading
  isCreating,           // boolean - creation mutation in progress

  // Pagination
  currentPage,          // number
  totalPages,           // number
  totalItems,           // number

  // Filters
  statusFilter,         // SponsorAdStatus | undefined
  intervalFilter,       // 'weekly' | 'monthly' | undefined
  search,               // string
  isSearching,          // boolean - debounce in progress

  // Actions
  createSponsorAd,      // (input) => Promise<SponsorAd | null>
  cancelSponsorAd,      // (id, reason?) => Promise<boolean>
  payNow,               // (id) => Promise<{ checkoutUrl } | null>
  renewSponsorship,     // (id) => Promise<{ checkoutUrl } | null>

  // Submitting states
  isCancelling,         // boolean
  isPayingNow,          // boolean
  isRenewing,           // boolean

  // Filter setters
  setStatusFilter,      // (status) => void
  setIntervalFilter,    // (interval) => void
  setSearch,            // (search) => void
  setCurrentPage,       // (page) => void
  nextPage,             // () => void
  prevPage,             // () => void

  // Utility
  refreshData,          // () => void
} = useUserSponsorAds(options);
```

### 创建赞助商广告

```tsx
const { createSponsorAd } = useUserSponsorAds();

async function handleSubmit(item) {
  const sponsorAd = await createSponsorAd({
    itemSlug: item.slug,
    itemName: item.name,
    itemIconUrl: item.icon,
    itemCategory: item.category,
    itemDescription: item.description,
    interval: 'monthly',
  });

  if (sponsorAd) {
    // Ad created in pending_payment status
    // Redirect user to payment
  }
}
```

### 付款流程

创建赞助商广告后，用户需要付费。 0方法创建一个结帐会话并返回一个 URL：

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

结帐 API (0) 返回：

```ts
interface CheckoutResponse {
  success: boolean;
  data: {
    checkoutId: string;
    checkoutUrl: string | null;
    provider: string;
  };
}
```

### 续签赞助

过期或即将过期的广告可以续订：

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### 去抖动搜索

该钩子包括内置搜索去抖动（300 毫秒延迟）：

```tsx
const { search, setSearch, isSearching, sponsorAds } = useUserSponsorAds();

return (
  <div>
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search your sponsor ads..."
    />
    {isSearching && <span>Searching...</span>}
    {sponsorAds.map(ad => /* render */)}
  </div>
);
```

---

## useAdminSponsorAds

管理挂钩提供管理功能：批准、拒绝、取消和删除赞助商广告。

＃＃＃ 进口

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

＃＃＃ 参数

```ts
interface UseAdminSponsorAdsOptions {
  page?: number;
  limit?: number;
  status?: SponsorAdStatus;
  interval?: SponsorAdIntervalType;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

### 返回值

```ts
const {
  // Data
  sponsorAds,           // SponsorAd[]
  stats,                // SponsorAdStats | null

  // Loading
  isLoading,
  isSubmitting,         // any mutation in progress

  // Pagination
  currentPage,
  totalPages,
  totalItems,

  // Sorting
  sortBy,
  sortOrder,

  // Actions
  approveSponsorAd,     // (id, forceApprove?) => Promise<{ success, requiresForceApprove? }>
  rejectSponsorAd,      // (id, reason) => Promise<boolean>
  cancelSponsorAd,      // (id, reason?) => Promise<boolean>
  deleteSponsorAd,      // (id) => Promise<boolean>

  // Setters
  setSortBy,
  setSortOrder,
  setCurrentPage,

  // Utility
  refreshData,
} = useAdminSponsorAds(options);
```

### 审批工作流程

对于未收到付款的情况，批准操作支持 0 选项：

```tsx
const { approveSponsorAd } = useAdminSponsorAds();

async function handleApprove(id: string) {
  const result = await approveSponsorAd(id);

  if (result.requiresForceApprove) {
    // Show confirmation dialog
    const confirmed = await showDialog(
      'Payment not received. Approve anyway?'
    );
    if (confirmed) {
      await approveSponsorAd(id, true);
    }
  }
}
```

当 API 返回 0 错误时，挂钩会捕获该错误并返回 1 ，而不是显示 toast 错误。

### 有理由拒绝

拒绝需要存储在赞助商广告记录中的原因字符串：

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### 使用分页重置进行排序

更改排序字段或顺序会自动重置为第 1 页：

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## 使用ActiveSponsorAds

一个轻量级的挂钩，用于获取活跃的赞助商广告以在主页布局和侧边栏上公开展示。

＃＃＃ 进口

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

＃＃＃ 参数

```ts
interface UseActiveSponsorAdsOptions {
  limit?: number;      // default: 10
  enabled?: boolean;   // default: true
}
```

### 返回值

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### 使用示例

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';

function SponsorSidebar() {
  const { sponsors, isLoading } = useActiveSponsorAds({ limit: 3 });

  if (isLoading || sponsors.length === 0) return null;

  return (
    <aside className="sponsor-sidebar">
      <h3>Sponsored</h3>
      {sponsors.map(({ sponsor, item }) => (
        <a key={sponsor.id} href={`/items/${sponsor.itemSlug}`}>
          {item?.icon && <img src={item.icon} alt={sponsor.itemName} />}
          <span>{sponsor.itemName}</span>
        </a>
      ))}
    </aside>
  );
}
```

### 缓存

该钩子使用积极的缓存，因为活跃的发起者不会经常改变：

|设置|价值|
|--------|--------|
| 0 | 5 分钟 |
| 1 | 10 分钟 |
| 2 | 3 |

---

## useSponsorAdDetail

通过 ID 获取单个赞助商广告。用于详细信息/编辑页面。

＃＃＃ 进口

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

＃＃＃ 用法

```tsx
function SponsorAdDetailPage({ adId }: { adId: string }) {
  const { data: sponsorAd, isLoading, error } = useSponsorAdDetail(adId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!sponsorAd) return <NotFound />;

  return (
    <div>
      <h1>{sponsorAd.itemName}</h1>
      <Badge>{sponsorAd.status}</Badge>
      <p>Interval: {sponsorAd.interval}</p>
    </div>
  );
}
```

该钩子接受 0 作为 ID，在这种情况下查询将被禁用。这对于条件渲染很有用：

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## API 端点

### 公共端点

|方法|端点 |描述 |
|--------|----------|-------------|
|获取 | 0 |获取活跃的赞助商广告以供公开展示 |

### 用户端点（已验证）

|方法|端点 |描述 |
|--------|----------|-------------|
|获取 | 1 |列出用户的赞助商广告并分页 |
|发布 | 2 |创建新的赞助商广告提交 |
|获取 | 3 |获取用户的赞助商广告统计信息 |
|获取 | 4 |获取特定的赞助商广告 |
|发布 | 5 |取消赞助商广告 |
|发布 | 6 |续签过期赞助 |
|发布 | 7 |创建付款结账会话 |

### 管理端点

|方法|端点 |描述 |
|--------|----------|-------------|
|获取 | 8 |列出所有带有过滤器的赞助商广告 |
|发布 | 9 |批准赞助商广告 |
|发布 | 10 |有理由拒绝|
|发布 | 11 |管理员取消 |
|删除 | 12 |删除赞助商广告 |

## 完整的提交工作流程

以下是从用户角度来看的完整工作流程：

### 第 1 步——选择一个项目

用户从仪表板或项目详细信息页面选择要赞助的项目。

### 第 2 步 -- 提交赞助商广告

```tsx
const ad = await createSponsorAd({
  itemSlug: 'my-awesome-tool',
  itemName: 'My Awesome Tool',
  itemIconUrl: '/icons/tool.png',
  itemCategory: 'Productivity',
  interval: 'monthly',
});
// Status: pending_payment
```

### 第 3 步 -- 完成付款

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### 第 4 步——管理员审核

管理员会在仪表板中看到待处理的广告，并可以批准或拒绝：

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### 步骤 5 -- 主动显示

活动广告通过 0 显示在面向公众的组件中。

### 第 6 步 -- 到期和续订

赞助期结束后，状态将更改为1。用户可以续订：

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## 统计仪表板

用户和管理员挂钩都会公开仪表板显示的统计信息：

```tsx
const { stats } = useUserSponsorAds();

// Display in dashboard
<div>
  <StatCard label="Active" value={stats.overview.active} />
  <StatCard label="Pending" value={stats.overview.pending} />
  <StatCard label="Total Revenue" value={`$${stats.revenue.totalRevenue}`} />
  <StatCard label="Weekly Ads" value={stats.byInterval.weekly} />
  <StatCard label="Monthly Ads" value={stats.byInterval.monthly} />
</div>
```
