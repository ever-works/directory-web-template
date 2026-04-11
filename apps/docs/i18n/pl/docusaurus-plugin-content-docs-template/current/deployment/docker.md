---
id: docker
title: Wdrożenie Docker
sidebar_label: Docker
sidebar_position: 2
---

# Wdrożenie Docker

Wdróż swoją witrynę katalogu Ever Works używając kontenerów Docker.

## Wymagania Wstępne

- Docker zainstalowany na twoim systemie
- Docker Compose (opcjonalne, ale zalecane)

## Szybki Start z Docker

### 1. Zbuduj Obraz Docker

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. Uruchom Kontener

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

Twoja strona będzie dostępna pod adresem `http://localhost:3000`.

## Konfiguracja Docker Compose

Utwórz plik `docker-compose.yml`:

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

### Uruchom z Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Zmienne Środowiskowe

Skonfiguruj swoje wdrożenie ze zmiennymi środowiskowymi:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Uwagi Dotyczące Produkcji

### Bezpieczeństwo

- Używaj zarządzania sekretami dla danych wrażliwych
- Włącz HTTPS z odwrotnym serwerem proxy (nginx, Traefik)
- Regularne aktualizacje bezpieczeństwa

### Wydajność

- Używaj wieloetapowych buildów, aby zmniejszyć rozmiar obrazu
- Konfiguruj odpowiednie limity zasobów
- Włącz warstwy buforowania

### Monitorowanie

- Dodaj sprawdzenia zdrowia
- Konfiguruj rejestrowanie
- Skonfiguruj monitorowanie i alerty

## Następne Kroki

- [Zmienne Środowiskowe](/docs/deployment/environment-variables) - Skonfiguruj swoje wdrożenie
- [Monitorowanie](/docs/deployment/monitoring) - Monitoruj swoją aplikację
- [Wsparcie](/docs/advanced-guide/support) - Uzyskaj pomoc z wdrożeniem
