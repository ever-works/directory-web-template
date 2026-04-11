---
id: docker
title: Docker-Bereitstellung
sidebar_label: Docker
sidebar_position: 2
---

# Docker-Bereitstellung

Stellen Sie Ihre Ever Works Verzeichnis-Website mit Docker-Containern bereit.

## Voraussetzungen

- Docker auf Ihrem System installiert
- Docker Compose (optional, aber empfohlen)

## Schnellstart mit Docker

### 1. Docker-Image erstellen

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. Container ausführen

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

Ihre Website ist unter `http://localhost:3000` verfügbar.

## Docker Compose Setup

Erstellen Sie eine `docker-compose.yml`-Datei:

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

### Mit Docker Compose ausführen

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Umgebungsvariablen

Konfigurieren Sie Ihr Deployment mit Umgebungsvariablen:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Produktionsüberlegungen

### Sicherheit

- Secrets-Verwaltung für sensible Daten verwenden
- HTTPS mit Reverse-Proxy aktivieren (nginx, Traefik)
- Regelmäßige Sicherheitsupdates durchführen

### Performance

- Mehrstufige Builds verwenden, um die Image-Größe zu reduzieren
- Ordnungsgemäße Ressourcenlimits konfigurieren
- Caching-Schichten aktivieren

### Überwachung

- Health-Checks hinzufügen
- Protokollierung konfigurieren
- Überwachung und Warnmeldungen einrichten

## Nächste Schritte

- [Umgebungsvariablen](/docs/deployment/environment-variables) - Deployment konfigurieren
- [Überwachung](/docs/deployment/monitoring) - Anwendung überwachen
- [Support](/docs/advanced-guide/support) - Deployment-Hilfe erhalten
