---
id: mappers-system
title: "Система за картографиране"
sidebar_label: "Система за картографиране"
sidebar_position: 48
---

# Система за картографиране

## Преглед

Системата Mappers предоставя чисти функции за трансформация без странични ефекти, които преобразуват вътрешните модели на данни на приложенията във външни CRM (управление на взаимоотношенията с клиенти) полезни натоварвания. Понастоящем той прилага съпоставители за Twenty CRM интеграция, преобразувайки `ClientProfile` и `Company` обекти в Twenty-съвместими `Person` и `Company` полезни натоварвания с нулево-безопасно картографиране на полета и валидиране на задължително поле.

## Архитектура

Модулът за картографиране се намира в `lib/mappers/` и следва строг модел на разделяне на загрижеността:

- **Mappers** са чисти функции: без I/O, без извиквания към база данни, без HTTP заявки.
- **Услугите** (в `lib/services/`) използват картографи, за да подготвят данни преди изпращане към външни API.
- **Типовете** се импортират от схемата на базата данни (`lib/db/schema`) и дефинициите на тип CRM (`lib/types/twenty-crm-entities.types`).

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

Потокът от данни е:

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## Справка за API

### Износ от `lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

Потвърждава дали ИД на обект присъства и не е празен. Това е критична проверка на безопасността, която гарантира, че всеки CRM запис има валидна `external_id` връзка към локалната система.

**Параметри:**
- `id` -- Идентификаторът на местния обект (може да е недефиниран или нулев)
- `entityType` -- Име на тип обект за съобщения за грешка (напр. `'ClientProfile'`)

**Връща:** Изрязан ID низ

**Хвърля:** `Error`, ако идентификаторът липсва, е нула, недефиниран или е празен низ.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

Анализира низ за местоположение в свободна форма, за да извлече името на града. Обработва различни формати, като разделя на запетаи и взема първата част.

**Поддържани формати:**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**Връща:** Името на града или `null`, ако местоположението е празно/недефинирано.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

Съпоставя локален `ClientProfile` обект на база данни към Twenty CRM `Person` полезен товар.

**Картографиране на полето:**

|ClientProfile Field|TwentyPerson Field|Задължително|
|--------------------|--------------------|----------|
|`id`|`external_id`|Да (хвърля, ако липсва)|
|`name`|`name`|да|
|`email`|`email`|да|
|`phone`|`phone`|Не е задължително|
|`jobTitle`|`job_title`|Не е задължително|
|`company`|`company_name`|Не е задължително|
|`website`|`website`|Не е задължително|
|`location`|`city` (извлечено)|Не е задължително|
|`accountType`|`account_type`|Не е задължително|
|`plan`|`plan`|Не е задължително|
|`totalSubmissions`|`total_submissions`|Не е задължително|

**Връща:** Обект `TwentyPerson` само с попълнени полета.

**Хвърля:** `Error`, ако `clientProfile.id` липсва.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

Картографира локален `Company` обект към Twenty CRM `Company` полезен товар.

**Картографиране на полето:**

|Фирмено поле|Поле TwentyCompany|Задължително|
|--------------|---------------------|----------|
|`id`|`external_id`|Да (хвърля, ако липсва)|
|`name`|`name`|да|
|`domain`|`domain_name`|Не е задължително|
|`website`|`website`|Не е задължително|
|`status`|`status`|Не е задължително|

**Връща:** Обект `TwentyCompany` само с попълнени полета.

**Хвърля:** `Error`, ако `company.id` липсва.

## Подробности за изпълнението

**Съпоставяне срещу нула**: Незадължителните полета използват изрични `if` проверки преди присвояване, като гарантират, че `null`, `undefined` и празните стойности никога не се изпращат до CRM. Това поддържа полезните натоварвания чисти и избягва презаписването на съществуващи CRM данни с нулеви стойности.

**Налагане на външен ID**: Всеки картограф извиква `ensureExternalId()` като своя първа операция. Това незабавно хвърля невалидни идентификатори, следвайки бърз модел, който предотвратява осиротели записи в CRM.

**Без мутация**: Функциите на Mapper създават нови обекти, вместо да променят входа. Входният обект `ClientProfile` или `Company` никога не се променя.

**Незадължително съкращаване на полето**: Полетата се добавят към изходния обект само когато имат верни стойности. Това създава минимални полезни натоварвания, които актуализират само ненулеви полета в CRM.

**Евристика за извличане на град**: Функцията `extractCityFromLocation()` използва прост подход за разделяне със запетая. Това обработва най-често срещаните формати за местоположение (град, град + щат, град + щат + държава), но не се опитва да анализира сложни адресни формати.

## Конфигурация

Не е необходима конфигурация. Мапърите са чисти функции, които зависят само от техните типове вход. Конфигурацията на връзката на Twenty CRM (URL на API, токени) се управлява от слоя на услугата за интеграция.

## Примери за използване

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

## Най-добри практики

- Винаги използвайте функциите за картографиране вместо ръчно конструиране на CRM полезни натоварвания, за да осигурите последователно именуване на полета и нулева безопасност.
- Обработете `Error`, хвърлен от `ensureExternalId()` на нивото на услугата; регистрирайте го и пропуснете синхронизирането на CRM за този запис, вместо да сринете цялата партида.
- Когато добавяте нови полета към картограф, следвайте съществуващия модел: проверете за достоверност, преди да присвоите към изходния обект.
- Напишете модулни тестове за картографи, тъй като те са чисти функции без зависимости, което ги прави лесни за тестване в изолация.
- Ако е необходима нова CRM интеграция, създайте нов файл за картографиране (напр. `hubspot.mapper.ts`) в същата директория, като следвате същите модели.

## Свързани модули

- [Config Manager System](./config-manager-system) -- Конфигуриране на интеграция чрез `configService.integrations`
- [API клиентски слой](/template/architecture/api-client-layer) -- HTTP клиент, използван от CRM услуги
