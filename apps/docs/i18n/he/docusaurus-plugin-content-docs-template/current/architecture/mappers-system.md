---
id: mappers-system
title: "מערכת Mappers"
sidebar_label: "מערכת Mappers"
sidebar_position: 48
---

# מערכת Mappers

## סקירה כללית

מערכת Mappers מספקת פונקציות טרנספורמציה טהורות, נטולות תופעות לוואי, הממירות מודלים של נתוני יישומים פנימיים למטענים חיצוניים של CRM (ניהול קשרי לקוחות). נכון לעכשיו, היא מיישמת מיפויים עבור אינטגרציית Twenty CRM, וממירה ישויות `ClientProfile` ו-@@TOK001@@@ ל-20 תואמות `Person` ו-`Company` עם מיפוי שדות בטוח ואימות שדה חובה.

## אדריכלות

מודול המפות נמצא ב-`lib/mappers/` ועוקב אחר דפוס הפרדה קפדני של דאגות:

- **מיפויים** הם פונקציות טהורות: ללא קלט/פלט, ללא קריאות למסד נתונים, ללא בקשות HTTP.
- **שירותים** (ב-`lib/services/`) צורכים ממפים כדי להכין נתונים לפני שליחה לממשקי API חיצוניים.
- **סוגים** מיובאים מסכימת מסד הנתונים (`lib/db/schema`) והגדרות סוג CRM (`lib/types/twenty-crm-entities.types`).

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

זרימת הנתונים היא:

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## הפניה ל-API

### ייצוא מ-`lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

מאמת שמזהה ישות קיים ואינו ריק. זוהי בדיקת בטיחות קריטית המבטיחה שלכל רשומת CRM יש `external_id` קישור תקף חזרה למערכת המקומית.

**פרמטרים:**
- `id` -- מזהה הישות המקומית (יכול להיות לא מוגדר או ריק)
- `entityType` -- שם סוג ישות עבור הודעות שגיאה (למשל, `'ClientProfile'`)

**החזרות:** מחרוזת זיהוי גזומה

**השלכות:** `Error` אם המזהה חסר, ריק, לא מוגדר או מחרוזת ריקה.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

מנתח מחרוזת מיקום חופשית כדי לחלץ את שם העיר. מטפל בפורמטים שונים על ידי פיצול בפסיקים ולקיחת החלק הראשון.

**פורמטים נתמכים:**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**החזרות:** שם העיר או `null` אם המיקום ריק/לא מוגדר.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

ממפה ישות מקומית של מסד נתונים `ClientProfile` למטען Twenty CRM `Person`.

**מיפוי שדות:**

|שדה פרופיל הלקוח|שדה TwentyPerson|חובה|
|--------------------|--------------------|----------|
|`id`|`external_id`|כן (זורק אם חסר)|
|`name`|`name`|כן|
|`email`|`email`|כן|
|`phone`|`phone`|אופציונלי|
|`jobTitle`|`job_title`|אופציונלי|
|`company`|`company_name`|אופציונלי|
|`website`|`website`|אופציונלי|
|`location`|`city` (חולץ)|אופציונלי|
|`accountType`|`account_type`|אופציונלי|
|`plan`|`plan`|אופציונלי|
|`totalSubmissions`|`total_submissions`|אופציונלי|

**מחזיר:** אובייקט `TwentyPerson` עם שדות מאוכלסים בלבד.

**השלכות:** `Error` אם חסר `clientProfile.id`.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

ממפה ישות מקומית `Company` למטען של Twenty CRM `Company`.

**מיפוי שדות:**

|שדה חברה|שדה TwentyCompany|חובה|
|--------------|---------------------|----------|
|`id`|`external_id`|כן (זורק אם חסר)|
|`name`|`name`|כן|
|`domain`|`domain_name`|אופציונלי|
|`website`|`website`|אופציונלי|
|`status`|`status`|אופציונלי|

**מחזיר:** אובייקט `TwentyCompany` עם שדות מאוכלסים בלבד.

**השלכות:** `Error` אם חסר `company.id`.

## פרטי יישום

**מיפוי בטוח לאפס**: שדות אופציונליים משתמשים בבדיקות `if` מפורשות לפני ההקצאה, ומבטיחים ש-`null`, `undefined` וערכים ריקים לעולם לא יישלחו ל-CRM. זה שומר על מטענים נקיים ונמנע מהחלפת נתוני CRM קיימים עם ערכי null.

**אכיפה של זיהוי חיצוני**: כל ממפה קורא ל-`ensureExternalId()` כפעולה הראשונה שלו. זה משליך מיד מזהים לא חוקיים, בעקבות דפוס מהיר של כשל שמונע רשומות מיותמות ב-CRM.

**ללא מוטציה**: פונקציות Mapper יוצרות אובייקטים חדשים במקום לשנות את הקלט. אובייקט הקלט `ClientProfile` או `Company` לעולם אינו משתנה.

**גיזום שדות אופציונלי**: שדות מתווספים לאובייקט הפלט רק כאשר יש להם ערכי אמת. זה מייצר עומסים מינימליים שמעדכנים רק שדות שאינם אפסים ב-CRM.

**היוריסטיקה של חילוץ עיר**: הפונקציה `extractCityFromLocation()` משתמשת בגישה פשוטה של פיצול פסיק. זה מטפל בפורמטים הנפוצים ביותר של מיקום (עיר, עיר + מדינה, עיר + מדינה + מדינה) אך אינו מנסה לנתח פורמטים מורכבים של כתובת.

## תצורה

אין צורך בתצורה. הממפים הם פונקציות טהורות התלויות רק בסוגי הקלט שלהם. תצורת החיבור של Twenty CRM (API URL, tokens) מנוהלת על ידי שכבת שירות האינטגרציה.

## דוגמאות לשימוש

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

## שיטות עבודה מומלצות

- השתמש תמיד בפונקציות הממפה במקום לבנות ידנית מטעני CRM כדי להבטיח שמות שדות עקביים ובטיחות אפסית.
- טפל ב-`Error` שנזרק על ידי `ensureExternalId()` בשכבת השירות; התחבר ודלג על סנכרון CRM עבור הרשומה הזו במקום לקרוס את כל האצווה.
- בעת הוספת שדות חדשים לממפה, עקוב אחר הדפוס הקיים: בדוק את האמת לפני ההקצאה לאובייקט הפלט.
- כתוב בדיקות יחידות לממפים מכיוון שהן פונקציות טהורות ללא תלות, מה שהופך אותן לקלות לבדיקה במנותק.
- אם יש צורך באינטגרציה חדשה של CRM, צור קובץ ממפה חדש (לדוגמה, `hubspot.mapper.ts`) באותה ספרייה לפי אותם דפוסים.

## מודולים קשורים

- [Config Manager System](./config-manager-system) -- תצורת אינטגרציה באמצעות `configService.integrations`
- [שכבת לקוח API](/template/architecture/api-client-layer) -- לקוח HTTP בשימוש על ידי שירותי CRM
