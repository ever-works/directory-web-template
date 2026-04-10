---
title: "Инсталация"
sidebar_label: "Инсталация"
sidebar_position: 1
---

# Инсталация

## Предварителни изисквания

- **Node.js >= 20.19.0**
- **pnpm** – мениджър на пакети
- **Git**
- **PostgreSQL** (по избор за локална разработка)

## Системни изисквания

- **ОС**: Windows, macOS или Linux
- **RAM**: минимум 4 GB
- **Дисково пространство**: минимум 2 GB

## Стъпки за инсталация

### 1. Клониране на репозитория

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

### 2. Инсталиране на зависимости

```bash
pnpm install
```

### 3. Настройка на средата

```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. Конфигуриране на променливите

Редактирайте `apps/web/.env.local` и задайте необходимите стойности.

### 5. Стартиране на сървъра за разработка

```bash
pnpm run dev
```
