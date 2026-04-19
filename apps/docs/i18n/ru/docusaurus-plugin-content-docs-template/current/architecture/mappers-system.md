---
id: mappers-system
title: "Система картографов"
sidebar_label: "Система картографов"
sidebar_position: 48
---

# Система картографов

## Обзор

Система Mappers предоставляет чистые функции преобразования без побочных эффектов, которые преобразуют внутренние модели данных приложения во внешние полезные данные CRM (управление взаимоотношениями с клиентами). В настоящее время он реализует преобразователи для интеграции Twenty CRM, преобразуя сущности `ClientProfile` и `Company` в Twenty-совместимые полезные нагрузки `Person` и `Company` с нулевым сопоставлением полей и проверкой обязательных полей.

## Архитектура

Модуль картографов находится в `lib/mappers/` и следует строгому шаблону разделения ответственности:

- **Сопоставители** – это чистые функции: без ввода-вывода, без вызовов базы данных и без HTTP-запросов.
- **Сервисы** (в `lib/services/`) используют картографы для подготовки данных перед отправкой во внешние API.
- **Типы** импортируются из схемы базы данных (`lib/db/schema`) и определений типов CRM (`lib/types/twenty-crm-entities.types`).

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

Поток данных:

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## Справочник по API

### Экспорт из `lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

Проверяет, что идентификатор объекта присутствует и не пуст. Это критическая проверка безопасности, гарантирующая, что каждая запись CRM имеет действительную `external_id`, связывающую ее с локальной системой.

**Параметры:**
- `id` -- Идентификатор локального объекта (может быть неопределенным или нулевым).
- `entityType` — имя типа объекта для сообщений об ошибках (например, `'ClientProfile'`)

**Возвраты:** Обрезанная строка идентификатора.

**Выдает:** `Error`, если идентификатор отсутствует, равен нулю, не определен или представляет собой пустую строку.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

Анализирует строку местоположения в произвольной форме, чтобы извлечь название города. Обрабатывает различные форматы, разделяя их запятыми и принимая первую часть.

**Поддерживаемые форматы:**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**Возвраты:** Название города или `null`, если местоположение пусто/не определено.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

Сопоставляет локальный объект базы данных `ClientProfile` с полезной нагрузкой Twenty CRM `Person`.

**Сопоставление полей:**

|Поле профиля клиента|Двадцать человек поле|Требуется|
|--------------------|--------------------|----------|
|`id`|`external_id`|Да (выбрасывает, если отсутствует)|
|`name`|`name`|Да|
|`email`|`email`|Да|
|`phone`|`phone`|Необязательно|
|`jobTitle`|`job_title`|Необязательно|
|`company`|`company_name`|Необязательно|
|`website`|`website`|Необязательно|
|`location`|`city` (извлечено)|Необязательно|
|`accountType`|`account_type`|Необязательно|
|`plan`|`plan`|Необязательно|
|`totalSubmissions`|`total_submissions`|Необязательно|

**Возвраты:** Объект `TwentyPerson` только с заполненными полями.

**Выдает:** `Error`, если `clientProfile.id` отсутствует.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

Сопоставляет локальный объект `Company` с полезной нагрузкой Twenty CRM `Company`.

**Сопоставление полей:**

|Поле компании|ДвадцатьКомпания Поле|Требуется|
|--------------|---------------------|----------|
|`id`|`external_id`|Да (выбрасывает, если отсутствует)|
|`name`|`name`|Да|
|`domain`|`domain_name`|Необязательно|
|`website`|`website`|Необязательно|
|`status`|`status`|Необязательно|

**Возвраты:** Объект `TwentyCompany` только с заполненными полями.

**Выдает:** `Error`, если `company.id` отсутствует.

## Детали реализации

**Сопоставление с нулевым значением**: в необязательных полях перед назначением используются явные проверки `if`, гарантирующие, что `null`, `undefined` и пустые значения никогда не отправляются в CRM. Это обеспечивает чистоту полезных данных и позволяет избежать перезаписи существующих данных CRM нулевыми значениями.

**Принудительное использование внешнего идентификатора**: каждый картограф вызывает `ensureExternalId()` в качестве своей первой операции. Это немедленно вызывает неверные идентификаторы, следуя шаблону отказоустойчивости, который предотвращает появление потерянных записей в CRM.

**Без мутации**: функции Mapper создают новые объекты, а не изменяют входные данные. Входной объект `ClientProfile` или `Company` никогда не изменяется.

**Необязательное сокращение полей**. Поля добавляются к выходному объекту только в том случае, если они имеют достоверные значения. Это создает минимальные полезные данные, которые обновляют только ненулевые поля в CRM.

**Эвристика извлечения городов**: функция `extractCityFromLocation()` использует простой подход разделения запятыми. Он обрабатывает наиболее распространенные форматы местоположений (город, город + штат, город + штат + страна), но не пытается анализировать сложные форматы адресов.

## Конфигурация

Никакой настройки не требуется. Сопоставители — это чистые функции, которые зависят только от типов входных данных. Конфигурация подключения Twenty CRM (URL-адрес API, токены) управляется уровнем службы интеграции.

## Примеры использования

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

## Лучшие практики

- Всегда используйте функции сопоставления вместо ручного создания полезных данных CRM, чтобы обеспечить согласованное именование полей и нулевую безопасность.
- Обработка `Error`, выдаваемого `ensureExternalId()` на уровне обслуживания; зарегистрируйте его и пропустите синхронизацию CRM для этой записи, вместо того, чтобы привести к сбою всего пакета.
- При добавлении новых полей в сопоставитель следуйте существующей схеме: проверяйте достоверность перед назначением выходному объекту.
- Напишите модульные тесты для картографов, поскольку они представляют собой чистые функции без зависимостей, что упрощает их изолированное тестирование.
- Если необходима новая интеграция CRM, создайте новый файл сопоставления (например, `hubspot.mapper.ts`) в том же каталоге, следуя тем же шаблонам.

## Связанные модули

- [Система диспетчера конфигураций](./config-manager-system) — настройка интеграции через `configService.integrations`
- [API Client Layer](/template/architecture/api-client-layer) — HTTP-клиент, используемый службами CRM.
