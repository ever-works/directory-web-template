---
id: admin-settings-endpoints
title: Конечные точки настроек администратора
sidebar_label: Настройки администратора
sidebar_position: 23
---

# Конечные точки настроек администратора

API настроек администратора предоставляет конечные точки для чтения и изменения конфигурации сайта, хранящейся в `config.yml`.

## Обзор

| Конечная точка | Метод | Аутентификация | Описание |
|---|---|---|---|
| `/api/admin/settings` | GET | Администратор | Получить все настройки |
| `/api/admin/settings` | PATCH | Администратор | Обновить отдельную настройку |
| `/api/admin/settings/map-status` | GET | Администратор | Статус поставщиков карт |

## Получить настройки

```
GET /api/admin/settings
```

Извлекает полный раздел `settings` из `config.yml`.

**Успешный ответ (200):**

```json
{
  "settings": {
    "theme": "light",
    "itemsPerPage": 20,
    "enableComments": true,
    "mapProvider": "mapbox",
    "defaultLanguage": "en"
  }
}
```

| Статус | Условие |
|---|---|
| 401 | Нет сессии администратора |
| 500 | Ошибка чтения конфигурации |

## Обновить настройку

```
PATCH /api/admin/settings
```

Обновляет одно значение в разделе `settings` файла `config.yml`.

**Тело запроса:**

```json
{
  "key": "itemsPerPage",
  "value": 30
}
```

| Поле | Тип | Обязательный | Описание |
|---|---|---|---|
| `key` | string | Да | Ключ настройки (относительно `settings.`) |
| `value` | any | Да | Новое значение |

| Статус | Условие |
|---|---|
| 400 | Отсутствует поле `key` |
| 401 | Нет сессии |
| 500 | Ошибка записи конфигурации |

## Статус поставщиков карт

```
GET /api/admin/settings/map-status
```

Возвращает статус настройки поставщиков карт без раскрытия фактических ключей API.

**Успешный ответ (200):**

```json
{
  "status": {
    "mapbox": { "isConfigured": true, "isPreviewAvailable": true, "name": "Mapbox" },
    "google": { "isConfigured": false, "isPreviewAvailable": false, "name": "Google Maps" }
  }
}
```

| Поле | Описание |
|---|---|
| `mapbox.isConfigured` | Установлен ли `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` |
| `google.isConfigured` | Установлен ли `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
