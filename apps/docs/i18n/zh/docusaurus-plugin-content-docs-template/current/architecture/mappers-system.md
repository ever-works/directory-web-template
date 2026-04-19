---
id: mappers-system
title: "制图系统"
sidebar_label: "制图系统"
sidebar_position: 48
---

# 制图系统

## 概述

Mappers 系统提供纯粹、无副作用的转换功能，可将内部应用程序数据模型转换为外部 CRM（客户关系管理）有效负载。目前，它实现了 Twenty CRM 集成的映射器，将 `ClientProfile` 和 `Company` 实体转换为 Twenty 兼容的 `Person` 和 `Company` 有效负载，并具有空安全字段映射和必填字段验证。

## 建筑

映射器模块位于 `lib/mappers/` 中，并遵循严格的关注点分离模式：

- **映射器**是纯函数：没有 I/O、没有数据库调用、没有 HTTP 请求。
- **服务**（在 `lib/services/` 中）使用映射器在发送到外部 API 之前准备数据。
- **类型**从数据库架构 (`lib/db/schema`) 和 CRM 类型定义 (`lib/types/twenty-crm-entities.types`) 导入。

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

数据流程为：

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## API参考

### 从 `lib/mappers/twenty-crm.mapper.ts` 导出

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

验证实体 ID 是否存在且非空。这是一项关键的安全检查，可确保每个 CRM 记录都有有效的 `external_id` 链接回本地系统。

**参数：**
- `id` -- 本地实体ID（可以是未定义或为空）
- `entityType` -- 错误消息的实体类型名称（例如，`'ClientProfile'`）

**返回：** 修剪后的 ID 字符串

**抛出：** `Error` 如果 ID 缺失、为 null、未定义或为空字符串。

#### `extractCityFromLocation(location: string | undefined | null): string | null`

解析自由格式的位置字符串以提取城市名称。通过用逗号分隔并获取第一部分来处理各种格式。

**支持的格式：**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**返回：** 城市名称或`null`（如果位置为空/未定义）。

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

将本地 `ClientProfile` 数据库实体映射到 Twenty CRM `Person` 负载。

**字段映射：**

|客户档案字段|二十人场|必填|
|--------------------|--------------------|----------|
|`id`|`external_id`|是（如果丢失则抛出）|
|`name`|`name`|是的|
|`email`|`email`|是的|
|`phone`|`phone`|可选|
|`jobTitle`|`job_title`|可选|
|`company`|`company_name`|可选|
|`website`|`website`|可选|
|`location`|`city`（摘录）|可选|
|`accountType`|`account_type`|可选|
|`plan`|`plan`|可选|
|`totalSubmissions`|`total_submissions`|可选|

**返回：** 仅包含填充字段的 `TwentyPerson` 对象。

**抛出：** 如果`clientProfile.id` 缺失，则`Error`。

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

将本地 `Company` 实体映射到 Twenty CRM `Company` 有效负载。

**字段映射：**

|公司领域|二十公司领域|必填|
|--------------|---------------------|----------|
|`id`|`external_id`|是（如果丢失则抛出）|
|`name`|`name`|是的|
|`domain`|`domain_name`|可选|
|`website`|`website`|可选|
|`status`|`status`|可选|

**返回：** 仅包含填充字段的 `TwentyCompany` 对象。

**抛出：** 如果`company.id` 缺失，则`Error`。

## 实施细节

**空安全映射**：可选字段在分配之前使用显式 `if` 检查，确保 `null`、`undefined` 和空值永远不会发送到 CRM。这可以保持有效负载干净，并避免用空值覆盖现有的 CRM 数据。

**外部 ID 强制**：每个映射器都调用 `ensureExternalId()` 作为其第一个操作。这会立即抛出无效 ID，遵循快速失败模式，防止 CRM 中出现孤立记录。

**无突变**：映射器函数创建新对象而不是修改输入。输入 `ClientProfile` 或 `Company` 对象永远不会改变。

**可选字段修剪**：字段仅在具有真值时才会添加到输出对象中。这会产生最少的有效负载，仅更新 CRM 中的非空字段。

**城市提取启发式**：`extractCityFromLocation()` 函数使用简单的逗号分割方法。这处理最常见的位置格式（城市、城市+州、城市+州+国家），但不尝试解析复杂的地址格式。

## 配置

无需配置。映射器是仅依赖于其输入类型的纯函数。二十个 CRM 连接配置（API URL、令牌）由集成服务层管理。

## 使用示例

```typescript
import {
  mapClientProfileToPerson,
  mapCompanyToTwentyCompany,
  ensureExternalId,
  extractCityFromLocation,
} from '@/lib/mappers/twenty-crm.mapper';

// Map a client profile to a CRM person
const clientProfile = await db.query.clientProfiles.findFirst({
  where: eq(clientProfiles.id, userId),
});

const personPayload = mapClientProfileToPerson(clientProfile);
// {
//   external_id: "usr_abc123",
//   name: "Jane Doe",
//   email: "jane@example.com",
//   job_title: "CTO",
//   company_name: "Acme Corp",
//   city: "San Francisco",
//   plan: "premium",
// }

// Map a company to a CRM company
const company = await db.query.companies.findFirst({
  where: eq(companies.id, companyId),
});

const companyPayload = mapCompanyToTwentyCompany(company);
// {
//   external_id: "comp_xyz789",
//   name: "Acme Corp",
//   domain_name: "acme.com",
//   website: "https://acme.com",
//   status: "active",
// }

// Use utility functions independently
const city = extractCityFromLocation("Berlin, Germany");
// "Berlin"

const validId = ensureExternalId(user.id, "User");
// "usr_abc123" or throws Error
```

## 最佳实践

- 始终使用映射器函数而不是手动构建 CRM 有效负载，以确保一致的字段命名和空安全。
- 在服务层处理`ensureExternalId()`抛出的`Error`；记录它并跳过该记录的 CRM 同步，而不是使整个批次崩溃。
- 向映射器添加新字段时，请遵循现有模式：在分配给输出对象之前检查真实性。
- 为映射器编写单元测试，因为它们是没有依赖项的纯函数，因此易于单独测试。
- 如果需要新的 CRM 集成，请按照相同的模式在同一目录中创建一个新的映射器文件（例如 `hubspot.mapper.ts`）。

## 相关模块

- [Config Manager System](./config-manager-system) -- 通过`configService.integrations`进行集成配置
- [API Client Layer](/template/architecture/api-client-layer) -- CRM 服务使用的 HTTP 客户端
