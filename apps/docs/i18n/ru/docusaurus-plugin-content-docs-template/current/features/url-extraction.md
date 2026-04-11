---
id: url-extraction
title: Система извлечения URL-адресов
sidebar_label: Извлечение URL-адресов
sidebar_position: 13
---

# Система извлечения URL-адресов

Шаблон Ever Works включает в себя систему извлечения URL-адресов на базе искусственного интеллекта, которая автоматически извлекает метаданные из URL-адресов, включая названия продуктов, описания, категории, теги, информацию о бренде и изображения. Эта функция упрощает процесс отправки элементов за счет автоматического заполнения полей формы по предоставленному URL-адресу.

## Обзор архитектуры

| Компонент | Путь | Цель |
|---|---|---|
| `useUrlExtraction` крючок | `hooks/use-url-extraction.ts` | Перехватчик React на стороне клиента для запуска извлечения |
| `/api/extract` конечная точка | `app/api/extract/` | Маршрут API на стороне сервера, выполняющий фактическое извлечение |

## Как это работает

1. Пользователь предоставляет URL-адрес в форме отправки.
2. Перехватчик `useUrlExtraction` отправляет URL-адрес в конечную точку `/api/extract` .
3. Сервер извлекает метаданные (имя, описание, категория, теги, бренд, изображения)
4. Извлеченные данные возвращаются и могут использоваться для автоматического заполнения полей формы.

## Крючок `useUrlExtraction` ### Интерфейс

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

### Использование

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

## Извлеченные поля данных

| Поле | Тип | Описание |
|---|---|---|
| `name` | `string` | Название продукта или услуги, извлеченное со страницы |
| `description` | `string` | Описание продукта или мета-описание |
| `category` | `string?` | Предлагаемая категория, сопоставленная с существующими категориями, если они предусмотрены |
| `tags` | `string[]?` | Соответствующие теги, извлеченные из содержимого страницы |
| `brand` | `string?` | Торговая марка или название компании |
| `brand_logo_url` | `string?` | URL-адрес изображения логотипа бренда |
| `images` | `string[]?` | Массив URL-адресов соответствующих изображений, найденных на странице |

## Соответствие категории

Функция `extractFromUrl` принимает дополнительный параметр `existingCategories` . При его предоставлении API извлечения пытается сопоставить извлеченный контент с этими категориями, обеспечивая соответствие предлагаемой категории таксономии сайта:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## Обработка ошибок

Хук реализует несколько уровней обработки ошибок:

| Сценарий | Поведение |
|---|---|
| Пустой URL | Выдает ошибку «URL-адрес не указан» |
| Ошибка HTTP-запроса | Регистрирует ошибку, показывает всплывающее уведомление |
| Функция отключена | Возвращает `null` молча (изящная деградация) |
| Ошибка API | Регистрирует ошибку, показывает всплывающее сообщение с сообщением |
| Неожиданная ошибка | Перехватывает все ошибки, показывает общее всплывающее сообщение, возвращает `null` |

### Грациозная деградация

Система поддерживает постепенное ухудшение, если функция извлечения не настроена:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

Это позволяет форме отправки работать нормально, даже если служба извлечения AI не настроена, просто пропуская этап автозаполнения.

## Интеграция запросов React

Перехватчик использует `useMutation` запроса TanStack Query для управления запросом на извлечение:

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

Преимущества использования `useMutation` :
- Автоматическое управление состоянием загрузки через `isPending` - Встроенная обработка ошибок с обратным вызовом `onError` .
- API на основе обещаний через `mutateAsync` ## Интеграция с формой отправки

Извлечение URL-адреса обычно интегрируется в процесс отправки элемента:

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

## API-клиент

Перехватчик использует шаблон `serverClient` для HTTP-связи:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## Ключевые файлы

| Файл | Путь |
|---|---|
| Хук для извлечения URL-адресов | `hooks/use-url-extraction.ts` |
| Извлечь маршрут API | `app/api/extract/route.ts` |
| Серверный API-клиент | `lib/api/server-api-client.ts` |
