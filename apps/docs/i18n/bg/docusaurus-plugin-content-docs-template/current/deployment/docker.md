---
id: docker
title: Внедряване с Docker
sidebar_label: Docker
sidebar_position: 2
---

# Внедряване с Docker

Внедрете своя сайт-директория Ever Works с помощта на Docker контейнери.

## Изисквания

- Docker инсталиран на вашата система
- Docker Compose (по избор, но препоръчително)

## Бърз Старт с Docker

### 1. Изграждане на Docker Образ

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. Стартиране на Контейнера

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

Вашият сайт ще бъде достъпен на `http://localhost:3000`.

## Конфигурация на Docker Compose

Създайте файл `docker-compose.yml`:

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

### Стартиране с Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Променливи на Средата

Конфигурирайте вашето внедряване с променливи на средата:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Съображения за Производство

### Сигурност

- Използвайте управление на тайни за чувствителни данни
- Активирайте HTTPS с обратен прокси (nginx, Traefik)
- Редовни актуализации за сигурност

### Производителност

- Използвайте многоетапни сборки за намаляване на размера на образа
- Конфигурирайте подходящи ограничения на ресурсите
- Активирайте кеширане на слоевете

### Мониторинг

- Добавете проверки за здраве
- Конфигурирайте логване
- Настройте мониторинг и сигнали

## Следващи Стъпки

- [Променливи на Средата](/docs/deployment/environment-variables) - Конфигурирайте вашето внедряване
- [Мониторинг](/docs/deployment/monitoring) - Наблюдавайте приложението си
- [Поддръжка](/docs/advanced-guide/support) - Получете помощ с внедряването
