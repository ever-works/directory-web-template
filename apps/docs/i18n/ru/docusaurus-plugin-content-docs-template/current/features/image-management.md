---
id: image-management
title: Управление изображениями
sidebar_label: Управление изображениями
sidebar_position: 21
---

# Управление изображениями

Шаблон Ever Works включает систему управления доменом изображений, которая контролирует, какие внешние хосты изображений разрешены для оптимизации изображений Next.js. Система поддерживает курируемые списки доменов для распространенных поставщиков изображений и служб значков, обеспечивает управление доменами во время выполнения, проверку URL-адресов и генерирует конфигурацию `remotePatterns` для `next.config.js` .

## Обзор архитектуры

| Компонент | Путь | Цель |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | Списки основных доменов, утилиты для создания шаблонов и проверки |
| `useImageDomains` | `hooks/use-image-domains.ts` | Перехватчик React для управления доменами во время выполнения |
| `useImageValidation` | `hooks/use-image-domains.ts` | Перехватчик React для проверки URL-адресов изображений на соответствие разрешенным доменам |

## Предварительно настроенные домены

Система поставляется с двумя курируемыми списками доменов:

### Общие домены изображений

Это стандартные услуги хостинга изображений, используемые для аватаров пользователей и изображений контента:

| Домен | Цель |
|---|---|
| `lh3.googleusercontent.com` | Изображения профиля пользователя Google |
| `avatars.githubusercontent.com` | Аватары пользователей GitHub |
| `platform-lookaside.fbsbx.com` | Изображения профиля Facebook |
| `pbs.twimg.com` | Изображения профиля Twitter/X |
| `images.unsplash.com` | Сток фотография |

### Домены значков

Специализированные услуги по иконкам и дизайну:

| Домен | Цель |
|---|---|
| `flaticon.com` | Флэтикон-иконки |
| `iconify.design` | Библиотека иконок Iconify |
| `icons8.com` | Icons8 активов |
| `feathericons.com` | Набор иконок перо |
| `heroicons.com` | Библиотека героев |
| `tabler-icons.io` | Иконки таблиц |

## Удаленные шаблоны Next.js

Функция `generateImageRemotePatterns` создает массив `remotePatterns` для конфигурации изображения Next.js:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### Сгенерированные шаблоны

Функция создает два типа шаблонов:

1. **Особые шаблоны** с ограниченными путями для известных сервисов:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **Шаблоны подстановочных знаков** для субдоменов всех зарегистрированных доменов:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## Проверка домена

### `isAllowedImageDomain` Проверяет, находится ли имя хоста URL-адреса в списке разрешенных доменов:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

Функция выполняет три уровня сопоставления:

| Проверить | Описание |
|---|---|
| Точное совпадение | Имя хоста точно соответствует домену в любом списке |
| Соответствие субдомена | Имя хоста заканчивается на `.{domain}` для любого зарегистрированного домена |
| Не HTTP-пропуск | URL-адреса без префикса `http://` или `https://` всегда проходят |

### `isValidImageUrl` Проверяет, является ли строка структурно допустимым URL-адресом изображения:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### `isProblematicUrl` Обнаруживает URL-адреса, которые, скорее всего, не являются прямыми ссылками на изображения:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| Правило обнаружения | Описание |
|---|---|
| URL-адреса страниц Flaticon | URL-адреса с путем `/icone-gratuite/` на сайте Flaticon.com |
| Параметры перенаправления | URL-адреса, содержащие параметры запроса `related_id=` или `origin=` |
| Отсутствует расширение изображения | URL-адреса без `.jpg` , `.jpeg` , `.png` , `.gif` , `.webp` , `.svg` или `.ico` |

### `shouldShowFallback` Определяет, отображать ли запасной значок вместо изображения:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## Управление доменом во время выполнения

### Добавление доменов

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

Функция идемпотентна: добавление уже зарегистрированного домена не имеет никакого эффекта.

### Удаление доменов

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### Получение всех доменов

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

Возвращает копии массивов доменов, предотвращая внешнюю мутацию.

## Крючок `useImageDomains` Хук React для управления доменами изображений с синхронизацией состояний:

```tsx
import { useImageDomains } from '@/hooks/use-image-domains';

function ImageDomainManager() {
  const { domains, addDomain, removeDomain, checkDomain } = useImageDomains();

  return (
    <div>
      <h3>Common Domains ({domains.common.length})</h3>
      <ul>
        {domains.common.map(domain => (
          <li key={domain}>
            {domain}
            <button onClick={() => removeDomain(domain)}>Remove</button>
          </li>
        ))}
      </ul>

      <h3>Icon Domains ({domains.icons.length})</h3>
      <ul>
        {domains.icons.map(domain => (
          <li key={domain}>{domain}</li>
        ))}
      </ul>

      <button onClick={() => addDomain('cdn.new-service.com')}>
        Add Domain
      </button>
    </div>
  );
}
```

### API перехвата

| Метод | Параметры | Описание |
|---|---|---|
| `domains` | -- | Текущее состояние: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | Добавьте домен и обновите состояние |
| `removeDomain` | `(domain: string)` | Удалить домен (нормализовать ввод) и обновить состояние |
| `checkDomain` | `(url: string)` | Проверьте, разрешен ли домен URL |

Метод `removeDomain` нормализует ввод путем обрезки пробелов, строчных букв и удаления префиксов подстановочных знаков ( `*.` ).

## Крючок `useImageValidation` Облегченный крючок для проверки URL-адресов изображений на соответствие списку разрешенных доменов:

```tsx
import { useImageValidation } from '@/hooks/use-image-domains';

function ImageUrlInput({ value, onChange }) {
  const { checkImageUrl } = useImageValidation();

  const handleChange = (url: string) => {
    const { isValid, error } = checkImageUrl(url);
    if (!isValid) {
      console.warn(error);
      // e.g., "Domain not allowed. Add cdn.example.com to image domains configuration."
    }
    onChange(url);
  };

  return <input value={value} onChange={(e) => handleChange(e.target.value)} />;
}
```

### Результаты проверки

| Сценарий | `isValid` | `error` |
|---|---|---|
| URL-адрес, отличный от HTTP (относительный путь) | `true` | -- |
| Разрешенный домен | `true` | -- |
| Запрещенный домен | `false` | «Домен не разрешен. Добавьте `hostname` в конфигурацию доменов изображений». |
| Неверный формат URL | `false` | «Неверный формат URL» |

## Ключевые файлы

| Файл | Путь |
|---|---|
| Утилита доменов изображений | `lib/utils/image-domains.ts` |
| Домены изображений Крючок | `hooks/use-image-domains.ts` |
| Крючок проверки изображения | `hooks/use-image-domains.ts` |
