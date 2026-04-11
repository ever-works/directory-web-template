---
id: url-extraction
title: Система за извличане на URL адреси
sidebar_label: URL извличане
sidebar_position: 13
---

# Система за извличане на URL адреси

Шаблонът Ever Works включва захранвана с AI система за извличане на URL адреси, която автоматично извлича метаданни от URL адреси, включително имена на продукти, описания, категории, тагове, информация за марката и изображения. Тази функция рационализира процеса на подаване на артикул чрез автоматично попълване на полетата на формуляра от предоставен URL адрес.

## Преглед на архитектурата

| Компонент | Път | Цел |
|---|---|---|
| `useUrlExtraction` кука | `hooks/use-url-extraction.ts` | React кука от страна на клиента за задействане на извличане |
| `/api/extract` крайна точка | `app/api/extract/` | API маршрут от страна на сървъра, който извършва действителното извличане |

## Как работи

1. Потребителят предоставя URL във формуляра за изпращане
2. Куката `useUrlExtraction` изпраща URL адреса до крайната точка `/api/extract` 3. Сървърът извлича метаданни (име, описание, категория, тагове, марка, изображения)
4. Извлечените данни се връщат и могат да се използват за автоматично попълване на полетата на формуляра

## Куката `useUrlExtraction` ### Интерфейс

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

### Използване

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

## Извлечени полета с данни

| Поле | Тип | Описание |
|---|---|---|
| `name` | `string` | Име на продукт или услуга, извлечено от страницата |
| `description` | `string` | Описание на продукта или мета описание |
| `category` | `string?` | Предложена категория, съпоставена със съществуващи категории, когато е предоставена |
| `tags` | `string[]?` | Подходящи тагове, извлечени от съдържанието на страницата |
| `brand` | `string?` | Марка или име на фирма |
| `brand_logo_url` | `string?` | URL към изображението на логото на марката |
| `images` | `string[]?` | Масив от подходящи URL адреси на изображения, намерени на страницата |

## Съвпадение на категория

Функцията `extractFromUrl` приема незадължителен параметър `existingCategories` . Когато е предоставен, API за извличане се опитва да съпостави извлеченото съдържание с тези категории, като гарантира, че предложената категория е в съответствие с таксономията на сайта:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## Обработка на грешки

Куката прилага множество нива на обработка на грешки:

| Сценарий | Поведение |
|---|---|
| Празен URL адрес | Извежда грешка с „Няма предоставен URL“ |
| Неуспешна HTTP заявка | Регистрира грешка, показва тост известие |
| Функцията е деактивирана | Връща `null` тихо (грациозна деградация) |
| Грешка в API | Регистрира грешка, показва тост със съобщение |
| Неочаквана грешка | Улавя всички грешки, показва общ тост, връща `null` |

### Грациозна деградация

Системата поддържа грациозна деградация, когато функцията за извличане не е конфигурирана:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

Това позволява на формуляра за подаване да работи нормално, дори ако услугата за извличане на AI не е конфигурирана, просто пропускате стъпката за автоматично попълване.

## Интеграция на React Query

Куката използва `useMutation` на TanStack Query за управление на заявката за извличане:

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

Ползи от използването на `useMutation` :
- Автоматично управление на състоянието на зареждане чрез `isPending` - Вградено обработване на грешки с `onError` обратно извикване
- API, базиран на обещание чрез `mutateAsync` ## Интегриране с формуляр за изпращане

Извличането на URL обикновено е интегрирано в потока за подаване на артикул:

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

## API клиент

Куката използва `serverClient` на шаблона за HTTP комуникация:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## Ключови файлове

| Файл | Път |
|---|---|
| Кука за извличане на URL | `hooks/use-url-extraction.ts` |
| Извличане на API маршрут | `app/api/extract/route.ts` |
| API клиент на сървър | `lib/api/server-api-client.ts` |
