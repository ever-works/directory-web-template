---
id: view-tracking
title: Преглед на проследяване и ангажираност
sidebar_label: Преглед на проследяване
sidebar_position: 35
---

# Вижте проследяване и ангажираност

Шаблонът включва система за проследяване на изгледи, съобразена с поверителността, която записва уникални ежедневни изгледи на артикул. Той осигурява броя на показванията на страниците с артикули, анализите на таблото за управление, класирането на набиращи тенденции артикули и оценяването на популярността.

## Преглед на архитектурата

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## Тръбопровод за обработка

Когато потребител посети страница с подробности за артикул, компонентът `ItemViewTracker` задейства POST заявка. Сървърът го обработва чрез многоетапен конвейер:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### Формат на отговора

```json
{ "success": true, "counted": true }
```

| Отговор | Значение |
|----------|---------|
| `counted: true` | Беше записан нов изглед |
| `counted: false` | Дубликат за днес (същият зрител + елемент + дата) |
| `counted: false, reason: "bot"` | Открит потребителски агент на бот |
| `counted: false, reason: "owner"` | Удостоверен потребител, разглеждащ собствения си елемент |

## Проследяване от страна на клиента `ItemViewTracker` е клиентски компонент, който задейства една POST заявка при монтиране:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

Инструментът за проследяване използва подход на най-доброто усилие: неизправностите се игнорират безмълвно, така че проследяването на изгледите никога не нарушава потребителското изживяване.

## Откриване на ботове

Модулът `lib/utils/bot-detection.ts` поддържа списък с известни модели на бот потребителски агент, включително роботи на търсачки, инструменти за наблюдение и автоматизирани клиенти. Когато бъде открит бот, крайната точка връща успешен отговор с `counted: false` , без да докосва базата данни.

## Идентификация на зрителя

Прегледите се приписват на идентификационен номер на зрителя, съхранен в бисквитка само за HTTP на първа страна:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### Свойства за поверителност

- **Без лични данни** -- бисквитката съдържа само случаен UUID, а не самоличността на потребителя.
- **HTTP-only** -- JavaScript не може да прочете бисквитката, предотвратявайки ексфилтрация на базирано на XSS проследяване.
- **Same-site lax** -- бисквитката не се изпраща при заявки от кръстосан произход.
- **Флаг за сигурност** -- наложен в производството, за да изисква HTTPS.
- **Без услуги на трети страни** -- всички данни за проследяване остават във вашата база данни.

## Ежедневно дедупликация

Основната логика за записване използва `ON CONFLICT DO NOTHING` на PostgreSQL:

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

Таблицата `itemViews` има уникално ограничение върху `(itemId, viewerId, viewedDateUtc)` . Първият изглед за деня за двойка зрител-елемент вмъква ред и връща `true` . Следващите изгледи в същия ден се пропускат тихо. Датата се изчислява като UTC `YYYY-MM-DD` за последователна дедупликация, независимо от часовата зона.

## Изключване на собственик

Когато удостоверен потребител разглежда свой собствен артикул, прегледът не се отчита:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

Това не позволява на собствениците на артикули да увеличат изкуствено броя си показвания.

## Заявки за агрегиране

Файлът `item-view.queries.ts` експортира няколко функции за анализ:

| Функция | Тип връщане | Описание |
|----------|-------------|-------------|
| `getTotalViewsCount(slugs)` | `number` | Общ брой показвания за всички времена на елементи |
| `getRecentViewsCount(slugs, days)` | `number` | Прегледи в рамките на плъзгащ се прозорец (по подразбиране 7 дни) |
| `getDailyViewsData(slugs, days)` | `Map<string, number>` | Карта с ключове за дата за диаграми с искрящи линии |
| `getViewsPerItem(slugs)` | `Map<string, number>` | Общо гледания на артикул за класиране |

## Интеграция на Анализ

### Оценка на популярността

Броят на прегледите се захранва с логаритмичния алгоритъм за оценка на популярността, използван от системата за споделени карти:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

Това гарантира, че артикулите с много изгледи се класират по-високо в режим на сортиране „Популярно“, като същевременно предотвратяват бягащи резултати от вирусни артикули.

### Клиентско табло

Таблото за управление на клиента на `/client/dashboard` показва:
- Общ преглед на всички изпратени елементи
- Прегледи през последните 7 дни с индикатори за тенденция
- Дневна диаграма на гледанията чрез `getDailyViewsData` ### Администраторско табло

Таблото за управление на администратора използва `GET /api/admin/dashboard/stats` за показатели за преглед на целия сайт. Крайната точка на геоанализа осигурява географско разпределение на изгледите.

## Обработка на грешки

Грешките при проследяване на преглед се обработват безшумно в производството:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

Режимът на разработка регистрира грешки за отстраняване на грешки. Производството потиска изхода на конзолата, за да избегне шума.

## Конфигурация

Проследяването на изгледи работи автоматично без необходимите променливи на средата. Системата грациозно деградира:

- **Няма база данни** -- крайната точка връща 503 и клиентът игнорира грешката.
- **Режим на симулация на база данни** -- когато е активиран, изгледите се проследяват спрямо симулирани данни.
- **Флагове за функции** -- броят на показванията се показва условно въз основа на настройките на шаблона.

## Достъпност

- `ItemViewTracker` не изобразява DOM елементи, гарантирайки нулево въздействие върху оформлението на страницата и екранните четци.
- Броят показвания, показан в картите, използва атрибути `aria-label` за контекста на екранния четец.
- Диаграмите на таблото за управление включват описателни заглавия и обобщен текст.

## Свързана документация

- [Компоненти на таблото за управление](/docs/template/components/dashboard-components) -- Преглед на показване на статистически данни
- [Споделени компоненти на карта] (/docs/template/components/shared-card-components) -- Оценяване на популярността
– [Admin Analytics](/docs/template/features/admin-analytics) – Показатели за преглед на целия сайт
- [Гласуване и коментари](/docs/template/features/voting-comments) -- Други функции за ангажиране
