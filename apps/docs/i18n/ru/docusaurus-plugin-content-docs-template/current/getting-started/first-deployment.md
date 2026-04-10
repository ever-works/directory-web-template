---
title: Первое развёртывание
sidebar_label: Первое развёртывание
sidebar_position: 4
---

# Первое развёртывание

## Вариант 1: Vercel (рекомендуется)
1. Отправьте код на GitHub
2. Перейдите на vercel.com/new
3. Импортируйте репозиторий
4. Добавьте переменные окружения
5. Выполните deploy

## Вариант 2: Docker
```bash
docker build -t directory-web .
docker run -p 3000:3000 -e DATABASE_URL="..." directory-web
```

## Вариант 3: Node.js
```bash
pnpm build && pnpm start
```

## Чек-лист
- [ ] Переменные окружения установлены
- [ ] База данных мигрирована
- [ ] Домен настроен
- [ ] SSL активен
