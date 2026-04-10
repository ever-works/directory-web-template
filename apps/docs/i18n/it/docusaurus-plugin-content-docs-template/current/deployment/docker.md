---
id: docker
title: Distribuzione Docker
sidebar_label: Docker
sidebar_position: 2
---

# Distribuzione Docker

Distribuisci il tuo sito web directory Ever Works usando container Docker.

## Prerequisiti

- Docker installato sul tuo sistema
- Docker Compose (opzionale ma consigliato)

## Avvio Rapido con Docker

### 1. Costruire l'Immagine Docker

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. Eseguire il Container

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

Il tuo sito sarà disponibile su `http://localhost:3000`.

## Configurazione Docker Compose

Crea un file `docker-compose.yml`:

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

### Eseguire con Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Variabili d'Ambiente

Configura il tuo deploy con variabili d'ambiente:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Considerazioni per la Produzione

### Sicurezza

- Usa la gestione dei secret per i dati sensibili
- Abilita HTTPS con reverse proxy (nginx, Traefik)
- Aggiornamenti di sicurezza regolari

### Prestazioni

- Usa build multi-stage per ridurre le dimensioni dell'immagine
- Configura limiti di risorse appropriati
- Abilita i livelli di caching

### Monitoraggio

- Aggiungi health check
- Configura il logging
- Imposta monitoraggio e avvisi

## Prossimi Passi

- [Variabili d'Ambiente](/docs/deployment/environment-variables) - Configura il tuo deploy
- [Monitoraggio](/docs/deployment/monitoring) - Monitora la tua applicazione
- [Supporto](/docs/advanced-guide/support) - Ottieni aiuto con il deploy
