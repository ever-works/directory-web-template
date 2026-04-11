---
title: "Първо внедряване"
sidebar_label: "Първо внедряване"
sidebar_position: 4
---

# Първо внедряване

## Вариант 1: Vercel (препоръчително)

1. Качете кода си в GitHub
2. Влезте в [vercel.com](https://vercel.com) и импортирайте проекта
3. Добавете необходимите средови променливи
4. Щракнете върху „Deploy"

## Вариант 2: Docker

```bash
docker build -t directory-web-template .
docker run -p 3000:3000 directory-web-template
```

## Вариант 3: Ръчно внедряване

```bash
pnpm build
pnpm start
```

Уверете се, че всички средови променливи са настроени в производствената среда.
