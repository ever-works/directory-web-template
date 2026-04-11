---
title: Краткий справочник
sidebar_label: Краткий справочник
sidebar_position: 5
---

# Краткий справочник

## Команды

```bash
pnpm run dev       # Запустить серверы разработки
pnpm run build     # Собрать всё
pnpm run lint      # Линтинг всего
pnpm db:generate   # Генерировать миграции
pnpm db:migrate    # Применить миграции
pnpm db:seed       # Заполнить данными
```

## Ключевые файлы

| Файл | Назначение |
|------|------------|
| apps/web/.env.local | Переменные окружения |
| apps/web/.content/ | Контент CMS |
| apps/web/app/ | Маршруты Next.js |
| apps/web/lib/ | Бизнес-логика |
