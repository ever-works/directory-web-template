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

## GitHub Actions Build and Publish

The repository includes separate branch-specific Docker publish workflows to
build the root `Dockerfile` and publish images without deploying them.

### Triggers

- `.github/workflows/docker-build-publish-dev.yml` runs on `develop` and publishes `directory-web-template-dev`.
- `.github/workflows/docker-build-publish-stage.yml` runs on `stage` and publishes `directory-web-template-stage`.
- `.github/workflows/docker-build-publish-prod.yml` runs on `main` and publishes `directory-web-template`.
- Each workflow also supports `workflow_dispatch`.

Each image receives `latest` and the 12-character commit SHA as tags.

### Registries

GHCR is always enabled and uses the workflow `GITHUB_TOKEN`:

```text
ghcr.io/<owner>/directory-web-template:latest
ghcr.io/<owner>/directory-web-template:<short-sha>
```

Docker Hub is enabled when these secrets are present:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Set the optional `DOCKERHUB_NAMESPACE` repository variable when the namespace
differs from `DOCKERHUB_USERNAME`.

DigitalOcean Container Registry is enabled when `DIGITALOCEAN_ACCESS_TOKEN` is
present. The registry name defaults to `ever`; set the `DIGITALOCEAN_REGISTRY`
repository variable to override it.

For build-time Git CMS content, set `DATA_REPOSITORY` to the content repository
name and `GH_TOKEN` to a token that can read it. `GH_TOKEN` is passed to Docker
as a BuildKit secret rather than a build argument.

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
