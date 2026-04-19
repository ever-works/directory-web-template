---
id: queries
title: 数据库查询参考
sidebar_label: 查询
sidebar_position: 2
---

# 数据库查询参考

`lib/db/queries/` 目录包含按域组织的 23 个以上查询模块。每个模块都遵循单一职责原则，封装特定功能区域的 Drizzle ORM 查询。

## 模块概述

所有查询模块均从`lib/db/queries/index.ts`桶导出，以便于导入：

```typescript
import { getUser, getUserByEmail } from '@/lib/db/queries';
```

## 查询模块

### 活动.查询.ts

审计跟踪系统的活动记录和检索。

**主要功能：**
- 记录用户活动（登录、注册、帐户更改）
- 按用户或日期范围查询活动历史记录

### auth.queries.ts

与身份验证相关的数据库操作。

**主要功能：**
- 通过电子邮件查找用户进行凭据身份验证
- 创建并验证密码重置令牌
- 管理验证令牌

### 客户端查询.ts

最大的查询模块（37KB），处理所有面向客户端的操作。

**主要功能：**
- 客户端配置文件 CRUD 操作
- 客户项目提交和管理
- 客户端仪表板数据聚合
- 搜索和过滤客户数据
- 分页列表查询

### 评论.queries.ts

评论系统操作。

**主要功能：**
- 创建、更新和软删除评论
- 通过分页按项目获取评论
- 评论审核查询（管理员）
- 评级汇总

### 公司查询.ts

公司管理层查询。

**主要功能：**
- 公司CRUD操作
- 公司搜索和过滤
- 项目-公司关联管理
- 公司统计和分析

### 仪表板.queries.ts

管理和客户端仪表板的仪表板数据聚合。

**主要功能：**
- 管理仪表板统计（总用户、项目、收入）
- 客户仪表板统计（提交、查看、参与）
- 图表的时间序列数据
- 活动总结

### 参与度.queries.ts

浏览量、投票数、收藏数和评论的聚合参与度指标。

**主要功能：**
- 获取项目的参与度分数
- 聚合观看次数
- 计算受欢迎度指标
- 参与度排名

### 集成映射.queries.ts

CRM集成映射操作。

**主要功能：**
- 创建和更新集成映射
- 从 Ever ID 中查找 CRM ID，反之亦然
- 跟踪同步时间戳和版本哈希值
- 批量映射操作

### 项目查询.ts

核心项目查询（项目存储在 Git 中，但元数据在数据库中跟踪）。

**主要功能：**
- 项目元数据操作
- 项目视图跟踪
- 项目参与度数据

### 项目审核.queries.ts

项目审核日志操作。

**主要功能：**
- 记录项目创建、更新、删除和审核操作
- 查询特定项目的审核历史记录
- 按操作类型、执行者或日期范围过滤审核日志

### 项目视图.queries.ts

项目视图跟踪和分析。

**主要功能：**
- 记录每日唯一观看次数（按观看者 ID 和日期进行重复数据删除）
- 按项目和日期范围查询查看计数
- 查看分析聚合

### 位置索引.queries.ts

基于位置的搜索和索引。

**主要功能：**
- 附近项目的地理空间查询
- 位置索引管理
- 距离计算
- 带过滤器的基于位置的搜索

### 审核.queries.ts

内容审核系统。

**主要功能：**
- 创建和管理内容报告
- 更新报告状态和解决方案
- 记录审核操作
- 审核统计和队列管理

### 时事通讯.queries.ts

时事通讯订阅管理。

**主要功能：**
- 订阅和取消订阅操作
- 检查订阅状态
- 列出活跃订阅者
- 跟踪电子邮件发送历史记录

### 付款查询.ts

支付相关的数据库操作。

**主要功能：**
- 支付提供商管理
- 支付账户关联
- 交易记录
- 付款历史查询

### 报告.查询.ts

内容报告系统查询。

**主要功能：**
- 创建报告（项目或评论）
- 列出带有过滤器和分页的报告
- 更新报告状态
- 报告分析

### 订阅.queries.ts

订阅生命周期管理 (17KB)。

**主要功能：**
- 创建和更新订阅
- 订阅状态转换
- 订阅历史记录
- 按用户或提供商 ID 查找订阅
- 续订和取消操作
- 订阅分析

### 调查.query.ts

调查系统操作。

**主要功能：**
- 调查CRUD操作
- 调查回复记录
- 响应聚合和分析
- 调查状态管理（草稿、发布、结束）

### 用户查询.ts

用户管理查询。

**主要功能：**
- 用户CRUD操作
- 用户搜索和过滤
- 用户角色管理
- 帐户删除（软删除）

### 投票查询.ts

投票系统操作。

**主要功能：**
- 创建、更新和删除投票
- 检查用户-项目对的现有投票
- 按项目统计的总票数
- 投票类型切换（赞成/反对）

## 共享实用程序

### 类型.ts

跨查询模块使用的共享 TypeScript 类型：

```typescript
// Common query parameter types
export interface PaginationParams {
  page: number;
  limit: number;
}
```

### 实用程序.ts

用于构建查询的共享实用函数：

- 分页助手（偏移量计算、结果格式化）
- 常见的过滤器构建器
- SQL 片段助手

## 查询模式

### 标准查询模式

所有查询模块都遵循一致的模式：

```typescript
import { db } from '../drizzle';
import { eq, desc, and, sql } from 'drizzle-orm';
import { tableName } from '../schema';

export async function getItemById(id: string) {
  const result = await db
    .select()
    .from(tableName)
    .where(eq(tableName.id, id))
    .limit(1);
  return result[0] || null;
}
```

### 分页查询

许多模块实现分页查询：

```typescript
export async function getItems(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select().from(tableName)
      .orderBy(desc(tableName.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(tableName),
  ]);
  return {
    items,
    total: Number(countResult[0].count),
    page,
    limit,
  };
}
```

### 聚合查询

参与度和仪表板模块使用 SQL 聚合：

```typescript
export async function getEngagementScore(itemId: string) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(v.vote_count, 0) as votes,
      COALESCE(c.comment_count, 0) as comments,
      COALESCE(f.favorite_count, 0) as favorites,
      COALESCE(iv.view_count, 0) as views
    FROM ...
  `);
  return result;
}
```

## 进口公约

通过桶导出导入查询函数：

```typescript
// Preferred: import from barrel
import { getUser, createSubscription, getVotesByItem } from '@/lib/db/queries';

// Also valid: import from specific module
import { getUser } from '@/lib/db/queries/user.queries';
```
