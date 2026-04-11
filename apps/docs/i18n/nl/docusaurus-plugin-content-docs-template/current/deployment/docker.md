---
id: docker
title: Docker-implementatie
sidebar_label: Docker
sidebar_position: 2
---

# Docker-implementatie

Implementeer uw Ever Works directory-website met Docker-containers.

## Vereisten

- Docker geïnstalleerd op uw systeem
- Docker Compose (optioneel maar aanbevolen)

## Snel starten met Docker

### 1. Docker-image bouwen

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. Container uitvoeren

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

Uw site is beschikbaar op `http://localhost:3000`.

## Docker Compose-instelling

Maak een `docker-compose.yml`-bestand aan:

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

### Uitvoeren met Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Omgevingsvariabelen

Configureer uw implementatie met omgevingsvariabelen:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Productieoverwegingen

### Beveiliging

- Secretsbeheer gebruiken voor gevoelige gegevens
- HTTPS inschakelen met reverse proxy (nginx, Traefik)
- Regelmatige beveiligingsupdates uitvoeren

### Prestaties

- Meerfasige builds gebruiken om de image-grootte te reduceren
- Juiste resourcelimieten configureren
- Cache-lagen inschakelen

### Bewaking

- Health-checks toevoegen
- Logboekregistratie configureren
- Bewaking en waarschuwingen instellen

## Volgende stappen

- [Omgevingsvariabelen](/docs/deployment/environment-variables) - Uw implementatie configureren
- [Bewaking](/docs/deployment/monitoring) - Uw applicatie bewaken
- [Ondersteuning](/docs/advanced-guide/support) - Hulp bij implementatie krijgen
