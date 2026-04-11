---
id: company-profiles
title: 公司简介
sidebar_label: 公司简介
sidebar_position: 16
---

# 公司简介

Ever Works 模板包括完整的公司管理系统，允许管理员创建、管理公司并将其与列出的项目关联。该系统通过域名和名称匹配、带搜索的分页列表以及项目和公司之间的一对一关系来支持智能重复数据删除。

## 架构概述

|组件|路径|目的|
|---|---|---|
| 0 | 1 |项目-公司关联的客户端挂钩 |
| 2 | 3 |公司创建和重复数据删除的业务逻辑|
| 4 | 5 |公司 CRUD 和关联的数据库查询 |
| 6 | 7 | TypeScript 类型定义 |
| 8 | 9 | Zod 验证模式 |
| 10 | 11 |公司选择器下拉菜单 |
| 12 | 13 |创建/编辑公司模式 |
| 14 | 15 |公司统计展示|
| 16 | 17 |管理项目-公司关联 |

## 公司数据模型

```tsx
// types/company.ts
type Company = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  slug: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};
```

|领域 |描述 |
|---|---|
| 0 |唯一标识符 (UUID) |
| 1 |公司显示名称 |
| 2 |完整网站网址 |
| 3 |用于重复数据删除的归一化域（例如4）|
| 5 |从名称生成 URL 安全的 slug |
| 6 |活动或非活动状态 |

## 公司服务

7 通过内置重复数据删除功能为公司创建提供业务逻辑。

### 重复数据删除策略

该服务在创建新公司之前使用三步查找策略：

1. **域名查找**（主要）——识别同一家公司最可靠
2. **名称查找**（后备）——公司名称精确匹配
3. **创建新** -- 仅当两次查找均失败时

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### 从客户数据创建

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### 域提取

该服务标准化 URL 以提取干净的域：

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### 弹头生成

Slug 是根据公司名称自动生成的：

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## 数据库查询

0模块提供全面的CRUD操作：

### 公司增删改查

|功能|描述 |
|---|---|
| 1 |创建新公司 |
| 2 |通过 UUID 获取公司 |
| 3 |通过 slug 获取公司（不区分大小写）|
| 4 |按域名获取公司（不区分大小写）|
| 5 |按确切名称获取公司（不区分大小写）|
| 6 |更新公司字段 |
| 7 |删除公司 |

### 公司上市

```tsx
import { listCompanies } from '@/lib/db/queries/company.queries';

const result = await listCompanies({
  page: 1,
  limit: 10,
  search: 'acme',           // Searches name and domain
  status: 'active',
  sortBy: 'createdAt',      // 'name' | 'createdAt' | 'updatedAt'
  sortOrder: 'desc'
});

// Returns: { companies, total, page, totalPages, limit, activeCount, inactiveCount }
```

### 项目-公司协会

每个项目都可以链接到一个公司。该关联通过 0 连接表进行管理：

|功能|描述 |
|---|---|
| 1 |幂等链接（创建或更新）|
| 2 |幂等取消链接 |
| 3 |为某件商品寻找公司 |
| 4 |列出属于公司的物品 |
| 5 |检查项目是否有公司 |
| 6 |列出公司及其商品数量 |

7 函数是幂等的：
- 如果不存在关联，则会创建一个
- 如果已经链接同一家公司，则返回现有关联
- 如果链接了不同的公司，则会更新关联

## 8 钩子

客户端挂钩为项目提供了由 React Query 支持的公司管理：

```tsx
import { useItemCompany } from '@/hooks/use-item-company';

function ItemCompanyManager({ itemSlug }) {
  const {
    company,       // Current company or null
    isLoading,     // Loading state
    isAssigning,   // Assignment in progress
    isRemoving,    // Removal in progress
    assignCompany, // Assign company by ID
    removeCompany, // Remove company association
    refetch        // Refresh data
  } = useItemCompany({ itemSlug, enabled: true });

  const handleAssign = async (companyId: string) => {
    const success = await assignCompany(companyId);
    if (success) console.log('Company assigned!');
  };

  return (
    <div>
      {company ? (
        <div>
          <span>Company: {company.name}</span>
          <button onClick={removeCompany}>Remove</button>
        </div>
      ) : (
        <CompanySelector onSelect={(id) => handleAssign(id)} />
      )}
    </div>
  );
}
```

### 缓存配置

|设置|价值|
|---|---|
| 0 | 5 分钟 |
| 1 | 10 分钟 |
| 2 | 2 次尝试 |

### API 端点

该钩子与以下 REST 端点通信：

|方法|端点 |描述 |
|---|---|---|
| 3 | 4 |获取当前公司的项目 |
| 5 | 6 |将公司分配给项目|
| 7 | 8 |从项目中删除公司 |

## 管理组件

### 公司选择器

用于选择现有公司的下拉组件：

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### 公司模式

创建或编辑公司的模式：

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### 公司统计

显示聚合统计数据：

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## 关键文件

|文件|路径|
|---|---|
|项目公司 挂钩 | 0 |
|公司服务| 1 |
|公司查询 | 2 |
|公司类型 | 3 |
|公司验证| 4 |
|公司选择器 | 5 |
|公司模态 | 6 |
|项目公司经理| 7 |
