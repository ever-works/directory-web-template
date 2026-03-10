---
id: docker
title: Docker Deployment
sidebar_label: Docker
sidebar_position: 2
---

# Docker Deployment

Deploy your Ever Works directory website using Docker containers.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional but recommended)

## Quick Start with Docker

### 1. Build the Docker Image

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. Run the Container

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

Your site will be available at `http://localhost:3000`.

## Docker Compose Setup

Create a `docker-compose.yml` file:

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

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Environment Variables

Configure your deployment with environment variables:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Production Considerations

### Security

- Use secrets management for sensitive data
- Enable HTTPS with reverse proxy (nginx, Traefik)
- Regular security updates

### Performance

- Use multi-stage builds to reduce image size
- Configure proper resource limits
- Enable caching layers

### Monitoring

- Add health checks
- Configure logging
- Set up monitoring and alerts

## Next Steps

- [Environment Variables](/docs/deployment/environment-variables) - Configure your deployment
- [Monitoring](/docs/deployment/monitoring) - Monitor your application
- [Support](/docs/advanced-guide/support) - Get deployment help
