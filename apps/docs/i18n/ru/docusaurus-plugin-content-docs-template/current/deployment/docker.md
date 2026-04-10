---
id: docker
title: Развертывание с Docker
sidebar_label: Docker
sidebar_position: 2
---

# Развертывание с Docker

Разверните свой сайт-каталог Ever Works с помощью контейнеров Docker.

## Требования

- Docker установлен на вашей системе
- Docker Compose (необязательно, но рекомендуется)

## Быстрый Старт с Docker

### 1. Сборка Docker Образа

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. Запуск Контейнера

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

Ваш сайт будет доступен по адресу `http://localhost:3000`.

## Настройка Docker Compose

Создайте файл `docker-compose.yml`:

```yaml
version: '3.8'

services:
    app:
        build: .
        ports:
            - '3000:3000'
        environment:
            - NODE_ENV=production
            - NEXT_PUBLIC_API_BASE_URL=https://your-api.com
        volumes:
            - ./.content:/app/.content
        restart: unless-stopped

    # Optional: Add a database service
    postgres:
        image: postgres:15
        environment:
            POSTGRES_DB: everworks
            POSTGRES_USER: user
            POSTGRES_PASSWORD: password
        volumes:
            - postgres_data:/var/lib/postgresql/data
        restart: unless-stopped

volumes:
    postgres_data:
```

### Запуск с Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Переменные Окружения

Настройте своё развёртывание с помощью переменных окружения:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Производственные Соображения

### Безопасность

- Используйте управление секретами для конфиденциальных данных
- Включите HTTPS с обратным прокси (nginx, Traefik)
- Регулярные обновления безопасности

### Производительность

- Используйте многоэтапные сборки для уменьшения размера образа
- Настройте соответствующие ограничения ресурсов
- Включите кеширование слоёв

### Мониторинг

- Добавьте проверки работоспособности
- Настройте логирование
- Настройте мониторинг и оповещения

## Следующие Шаги

- [Переменные Окружения](/docs/deployment/environment-variables) - Настройте своё развёртывание
- [Мониторинг](/docs/deployment/monitoring) - Отслеживайте своё приложение
- [Поддержка](/docs/advanced-guide/support) - Получите помощь с развёртыванием
