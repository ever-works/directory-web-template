---
title: Установка
sidebar_label: Установка
sidebar_position: 1
---

# Установка

## Предварительные требования
- Node.js >= 20.19.0
- pnpm
- Git
- PostgreSQL (опционально)

## Системные требования
- ОС: Windows, macOS или Linux
- Память: минимум 4 ГБ RAM
- Хранилище: 2 ГБ свободного места

## Шаги

1. Клонирование:
```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

2. Установка:
```bash
pnpm install
```

3. Настройка:
```bash
cp apps/web/.env.example apps/web/.env.local
```

4. Запуск:
```bash
pnpm run dev
```
Откройте http://localhost:3000
