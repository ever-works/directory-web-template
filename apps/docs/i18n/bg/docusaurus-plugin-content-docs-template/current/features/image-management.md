---
id: image-management
title: Управление на изображения
sidebar_label: Управление на изображения
sidebar_position: 21
---

# Управление на изображения

Шаблонът Ever Works включва система за управление на домейни на изображения, която контролира кои външни хостове на изображения са разрешени за оптимизиране на изображения с Next.js. Системата поддържа подбрани списъци с домейни за общи доставчици на изображения и услуги за икони, осигурява управление на домейни по време на изпълнение, валидиране на URL адреси и генерира `remotePatterns` конфигурация за `next.config.js` .

## Преглед на архитектурата

| Компонент | Път | Цел |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | Основни списъци с домейни, генериране на шаблони и помощни програми за валидиране |
| `useImageDomains` | `hooks/use-image-domains.ts` | React кука за управление на домейни по време на изпълнение |
| `useImageValidation` | `hooks/use-image-domains.ts` | React кука за валидиране на URL адреси на изображения срещу разрешени домейни |

## Предварително конфигурирани домейни

Системата се доставя с два подбрани списъка с домейни:

### Общи домейни на изображения

Това са стандартни услуги за хостинг на изображения, използвани за потребителски аватари и изображения на съдържание:

| Домейн | Цел |
|---|---|
| `lh3.googleusercontent.com` | Изображения на потребителския профил на Google |
| `avatars.githubusercontent.com` | Потребителски аватари на GitHub |
| `platform-lookaside.fbsbx.com` | Снимки на профил във Facebook |
| `pbs.twimg.com` | Twitter/X профилни изображения |
| `images.unsplash.com` | Unsplash стокова фотография |

### Икона Домейни

Специализирани услуги за икони и дизайнерски активи:

| Домейн | Цел |
|---|---|
| `flaticon.com` | Flaticon икони |
| `iconify.design` | Iconify библиотека с икони |
| `icons8.com` | Икони8 активи |
| `feathericons.com` | Набор от икони за пера |
| `heroicons.com` | Библиотека с герои |
| `tabler-icons.io` | Икони на Tabler |

## Next.js отдалечени модели

Функцията `generateImageRemotePatterns` създава масива `remotePatterns` за конфигурацията на изображението Next.js:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### Генерирани модели

Функцията създава два типа модели:

1. **Специфични модели** с ограничени имена на пътища за известни услуги:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **Заместващи шаблони** за поддомейни на всички регистрирани домейни:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## Валидиране на домейн

### `isAllowedImageDomain` Проверява дали името на хоста на URL е в списъка с разрешени домейни:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

Функцията изпълнява три нива на съвпадение:

| Проверете | Описание |
|---|---|
| Точно съвпадение | Името на хост съвпада точно с домейн в двата списъка |
| Съвпадение на поддомейн | Името на хоста завършва с `.{domain}` за всеки регистриран домейн |
| Не-HTTP пропуск | URL адресите без префикс `http://` или `https://` винаги преминават |

### `isValidImageUrl` Потвърждава дали даден низ е структурно валиден URL адрес на изображение:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### `isProblematicUrl` Открива URL адреси, които вероятно не са директни връзки към изображения:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| Правило за откриване | Описание |
|---|---|
| URL адреси на страници с Flaticon | URL адреси с `/icone-gratuite/` път на flaticon.com |
| Параметри за пренасочване | URL адреси, съдържащи `related_id=` или `origin=` параметри на заявка |
| Липсва разширение за изображение | URL адреси без `.jpg` , `.jpeg` , `.png` , `.gif` , `.webp` , `.svg` или `.ico` |

### `shouldShowFallback` Определя дали да се покаже резервна икона вместо изображение:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## Управление на домейн по време на изпълнение

### Добавяне на домейни

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

Функцията е идемпотентна - добавянето на вече регистриран домейн няма ефект.

### Премахване на домейни

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### Получаване на всички домейни

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

Връща копия на домейн масиви, предотвратявайки външна мутация.

## Куката `useImageDomains` Hook на React за управление на домейни на изображения със синхронизация на състоянието:

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

### API за кука

| Метод | Параметри | Описание |
|---|---|---|
| `domains` | -- | Текущо състояние: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | Добавяне на домейн и състояние на опресняване |
| `removeDomain` | `(domain: string)` | Премахване на домейн (нормализира входа) и състояние на опресняване |
| `checkDomain` | `(url: string)` | Проверете дали домейнът на URL е разрешен |

Методът `removeDomain` нормализира входа чрез изрязване на интервали, малки букви и премахване на префиксите със заместващи знаци ( `*.` ).

## Куката `useImageValidation` Лека кука за валидиране на URL адреси на изображения спрямо списъка с разрешени домейни:

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

### Резултати от валидирането

| Сценарий | `isValid` | `error` |
|---|---|---|
| Не-HTTP URL (относителен път) | `true` | -- |
| Разрешен домейн | `true` | -- |
| Неразрешен домейн | `false` | „Домейнът не е разрешен. Добавете `hostname` към конфигурацията на домейни на изображения.“ |
| Невалиден URL формат | `false` | „Невалиден URL формат“ |

## Ключови файлове

| Файл | Път |
|---|---|
| Помощна програма за домейни на изображения | `lib/utils/image-domains.ts` |
| Кука за домейни на изображения | `hooks/use-image-domains.ts` |
| Кука за валидиране на изображение | `hooks/use-image-domains.ts` |
