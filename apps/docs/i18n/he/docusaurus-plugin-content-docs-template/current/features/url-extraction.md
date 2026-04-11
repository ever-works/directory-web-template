---
id: url-extraction
title: מערכת חילוץ כתובות אתרים
sidebar_label: חילוץ כתובת אתר
sidebar_position: 13
---

# מערכת חילוץ כתובות אתרים

תבנית Ever Works כוללת מערכת חילוץ URL המופעלת על ידי בינה מלאכותית המחלצת אוטומטית מטא נתונים מכתובות URL, כולל שמות מוצרים, תיאורים, קטגוריות, תגים, מידע על מותג ותמונות. תכונה זו מייעלת את תהליך הגשת הפריטים על ידי מילוי אוטומטי של שדות טופס מכתובת אתר מסופקת.

## סקירה כללית של אדריכלות

| רכיב | נתיב | מטרה |
|---|---|---|
| `useUrlExtraction` וו | `hooks/use-url-extraction.ts` | וו React בצד הלקוח להפעלת חילוץ |
| `/api/extract` נקודת קצה | `app/api/extract/` | נתיב API בצד השרת שמבצע את החילוץ בפועל |

## איך זה עובד

1. המשתמש מספק כתובת URL בטופס ההגשה
2. הוק `useUrlExtraction` שולח את כתובת האתר לנקודת הקצה `/api/extract` 3. השרת מחלץ מטא נתונים (שם, תיאור, קטגוריה, תגים, מותג, תמונות)
4. הנתונים שחולצו מוחזרים וניתן להשתמש בהם למילוי אוטומטי של שדות טופס

## ה- `useUrlExtraction` הוק

### ממשק

```tsx
interface ExtractionResult {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  brand?: string;
  brand_logo_url?: string;
  images?: string[];
}

interface UseUrlExtractionReturn {
  isLoading: boolean;
  extractFromUrl: (url: string, existingCategories?: string[]) => Promise<ExtractionResult | null>;
}
```

### שימוש

```tsx
import { useUrlExtraction } from '@/hooks/use-url-extraction';

function SubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();

  const handleUrlSubmit = async (url: string) => {
    const existingCategories = ['Project Management', 'Time Tracking', 'CRM'];
    const result = await extractFromUrl(url, existingCategories);

    if (result) {
      // Auto-fill form fields with extracted data
      setFormData({
        name: result.name,
        description: result.description,
        category: result.category || '',
        tags: result.tags || [],
      });
    }
  };

  return (
    <div>
      <input
        type="url"
        placeholder="Enter product URL..."
        onBlur={(e) => handleUrlSubmit(e.target.value)}
      />
      {isLoading && <span>Extracting data...</span>}
    </div>
  );
}
```

## שדות נתונים שחולצו

| שדה | הקלד | תיאור |
|---|---|---|
| `name` | `string` | שם המוצר או השירות שחולץ מהדף |
| `description` | `string` | תיאור מוצר או מטא תיאור |
| `category` | `string?` | קטגוריה מוצעת, תואמת לקטגוריות קיימות כאשר היא מסופקת |
| `tags` | `string[]?` | תגים רלוונטיים שחולצו מתוכן העמוד |
| `brand` | `string?` | שם מותג או חברה |
| `brand_logo_url` | `string?` | כתובת אתר לתמונת לוגו המותג |
| `images` | `string[]?` | מערך של כתובות אתרים רלוונטיות לתמונות שנמצאו בדף |

## התאמת קטגוריות

הפונקציה `extractFromUrl` מקבלת פרמטר `existingCategories` אופציונלי. כאשר מסופק, ממשק ה-API לחילוץ מנסה להתאים את התוכן שחולץ לקטגוריות אלו, ומבטיח שהקטגוריה המוצעת מתאימה לטקסונומיה של האתר:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## טיפול בשגיאות

הקרס מיישם מספר שכבות של טיפול בשגיאות:

| תרחיש | התנהגות |
|---|---|
| כתובת אתר ריקה | זורק שגיאה עם "לא סופקה כתובת URL" |
| כשל בבקשת HTTP | שגיאה ביומן, מציגה הודעת טוסט |
| תכונה מושבתת | מחזיר `null` בשקט (השפלה חיננית) |
| כשל ב-API | יומן שגיאה, מציג טוסט עם ההודעה |
| שגיאה לא צפויה | תופס את כל השגיאות, מציג טוסט גנרי, מחזיר `null` |

### השפלה חיננית

המערכת תומכת בהשפלה חיננית כאשר תכונת החילוץ אינה מוגדרת:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

זה מאפשר לטופס ההגשה לעבוד כרגיל גם אם שירות חילוץ הבינה המלאכותית אינו מוגדר, פשוט דילוג על שלב המילוי האוטומטי.

## שילוב שאילתות תגובה

הקרס משתמש ב- `useMutation` של TanStack Query לניהול בקשת החילוץ:

```tsx
const mutation = useMutation({
  mutationFn: async ({ url, existingCategories }) => {
    const response = await serverClient.post('/api/extract', {
      url,
      existingCategories
    });
    // ... validation and error handling
    return response.data.data;
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to extract data from URL');
  }
});
```

יתרונות השימוש ב- `useMutation` :
- ניהול מצב טעינה אוטומטי באמצעות `isPending` - טיפול בשגיאות מובנה עם `onError` התקשרות חוזרת
- API מבוסס הבטחה דרך `mutateAsync` ## שילוב עם טופס הגשה

חילוץ כתובת האתר משולבת בדרך כלל בזרימת הגשת הפריטים:

```tsx
function ItemSubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', tags: []
  });

  const handleUrlChange = async (url: string) => {
    if (!url) return;

    const result = await extractFromUrl(url, availableCategories);
    if (result) {
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        description: result.description || prev.description,
        category: result.category || prev.category,
        tags: result.tags?.length ? result.tags : prev.tags,
      }));
    }
  };

  return (
    <form>
      <input
        name="url"
        placeholder="Product URL"
        onBlur={(e) => handleUrlChange(e.target.value)}
        disabled={isLoading}
      />
      {/* Form fields auto-populated from extraction */}
    </form>
  );
}
```

## לקוח API

ה-hook משתמש ב- `serverClient` של התבנית עבור תקשורת HTTP:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## קבצי מפתח

| קובץ | נתיב |
|---|---|
| הוק לחילוץ כתובת URL | `hooks/use-url-extraction.ts` |
| מסלול חילוץ API | `app/api/extract/route.ts` |
| Server API Client | `lib/api/server-api-client.ts` |
