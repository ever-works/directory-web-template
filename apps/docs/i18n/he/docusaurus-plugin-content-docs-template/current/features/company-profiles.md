---
id: company-profiles
title: פרופילי חברה
sidebar_label: פרופילי חברה
sidebar_position: 16
---

# פרופילי חברה

תבנית Ever Works כוללת מערכת ניהול חברה מלאה המאפשרת למנהלי מערכת ליצור, לנהל ולשייך חברות לפריטים רשומים. המערכת תומכת במניעת כפילויות חכמה באמצעות התאמת דומיין ושמות, רישום מעוצב עם חיפוש, ויחס אחד לאחד בין פריטים וחברות.

## סקירה כללית של אדריכלות

| רכיב | נתיב | מטרה |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | וו לקוח לאגודות פריט-חברה |
| `company.service.ts` | `lib/services/company.service.ts` | הגיון עסקי להקמת חברה ומניעת כפילות |
| `company.queries.ts` | `lib/db/queries/company.queries.ts` | שאילתות מסד נתונים עבור חברת CRUD ועמותות |
| `company.ts` | `types/company.ts` | הגדרות סוג TypeScript |
| `company.ts` | `lib/validations/company.ts` | סכימות אימות Zod |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | תפריט נפתח של בורר חברה |
| `CompanyModal` | `components/admin/companies/company-modal.tsx` | צור/ערוך חברה |
| `CompanyStats` | `components/admin/companies/company-stats.tsx` | סטטיסטיקת החברה מציגה |
| `ItemCompanyManager` | `components/admin/items/item-company-manager.tsx` | ניהול אסוציאציות של פריט-חברה |

## מודל נתוני חברה

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

| שדה | תיאור |
|---|---|
| `id` | מזהה ייחודי (UUID) |
| `name` | שם תצוגה של החברה |
| `website` | כתובת האתר המלאה |
| `domain` | תחום מנורמל (לדוגמה, `example.com` ) למניעת כפילויות |
| `slug` | שבלול הבטוח בכתובת האתר נוצר מהשם |
| `status` | סטטוס פעיל או לא פעיל |

## שירות החברה

ה- `company.service.ts` מספק היגיון עסקי ליצירת חברה עם מניעת כפילויות מובנית.

### אסטרטגיית מניעת כפילות

השירות משתמש באסטרטגיית חיפוש בת שלושה שלבים לפני יצירת חברה חדשה:

1. **חיפוש דומיין** (ראשי) -- הכי אמין לזיהוי אותה חברה
2. **חיפוש שם** (החלפה) -- התאמה מדויקת לשם החברה
3. **צור חדש** -- רק אם שני החיפושים נכשלים

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### יצירה מנתוני לקוח

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### חילוץ דומיין

השירות מנרמל כתובות אתרים כדי לחלץ דומיינים נקיים:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### דור שבלולים

שבלולים נוצרים אוטומטית משמות חברות:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## שאילתות מסד נתונים

מודול `company.queries.ts` מספק פעולות CRUD מקיפות:

### חברת CRUD

| פונקציה | תיאור |
|---|---|
| `createCompany(data)` | צור חברה חדשה |
| `getCompanyById(id)` | קבל חברה לפי UUID |
| `getCompanyBySlug(slug)` | קבל חברה לפי שבלול (לא תלוי רישיות) |
| `getCompanyByDomain(domain)` | קבל חברה לפי דומיין (לא תלוי רישיות) |
| `getCompanyByName(name)` | קבל חברה לפי שם מדויק (לא תלוי רישיות) |
| `updateCompany(id, data)` | עדכן שדות חברה |
| `deleteCompany(id)` | מחק חברה |

### רישום חברה

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

### איגודי פריט-חברה

ניתן לקשר כל פריט לחברה אחת בדיוק. העמותה מנוהלת באמצעות טבלת הצמתים `itemsCompanies` :

| פונקציה | תיאור |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | קישור אימפוטנטי (יוצר או מעדכן) |
| `unlinkItemFromCompany(itemSlug)` | ביטול קישור אידמונטי |
| `getCompanyByItemSlug(itemSlug)` | קבל חברה לפריט |
| `listItemsByCompany(companyId, params)` | רשימת פריטים השייכים לחברה |
| `itemHasCompany(itemSlug)` | בדוק אם לפריט יש חברה |
| `getCompaniesWithItemCount(params)` | רשימת חברות עם ספירת הפריטים שלהן |

הפונקציה `linkItemToCompany` אינה חזקה:
- אם לא קיימת אסוציאציה, זה יוצר אחד
- אם אותה חברה כבר מקושרת, היא מחזירה את השיוך הקיים
- אם חברה אחרת מקושרת, היא מעדכנת את העמותה

## הוק `useItemCompany` הוו בצד הלקוח מספק ניהול חברה המופעל על ידי React Query עבור פריטים:

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

### תצורת מטמון

| הגדרה | ערך |
|---|---|
| `staleTime` | 5 דקות |
| `gcTime` | 10 דקות |
| `retry` | 2 ניסיונות |

### נקודות קצה של ממשק API

הוו מתקשר עם נקודות הקצה הבאות של REST:

| שיטה | נקודת קצה | תיאור |
|---|---|---|
| `GET` | `/api/items/{slug}/company` | אחזר חברה נוכחית לפריט |
| `POST` | `/api/items/{slug}/company` | שיוך חברה לפריט |
| `DELETE` | `/api/items/{slug}/company` | הסר חברה מפריט |

## רכיבי ניהול

### בורר חברה

רכיב נפתח לבחירת חברות קיימות:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### חברה מודאלית

מודל ליצירה או עריכה של חברות:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### סטטיסטיקת חברה

מציג נתונים סטטיסטיים מצטברים:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## קבצי מפתח

| קובץ | נתיב |
|---|---|
| פריט חברה הוק | `hooks/use-item-company.ts` |
| שירות החברה | `lib/services/company.service.ts` |
| שאילתות חברה | `lib/db/queries/company.queries.ts` |
| סוגי חברות | `types/company.ts` |
| אימותי חברה | `lib/validations/company.ts` |
| בורר חברה | `components/admin/companies/company-selector.tsx` |
| חברת מודאל | `components/admin/companies/company-modal.tsx` |
| מנהל חברת פריט | `components/admin/items/item-company-manager.tsx` |
