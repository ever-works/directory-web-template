---
id: docker
title: Despliegue con Docker
sidebar_label: Docker
sidebar_position: 2
---

# Despliegue con Docker

Despliega tu sitio de directorio Ever Works usando contenedores Docker.

## Requisitos Previos

- Docker instalado en tu sistema
- Docker Compose (opcional, pero recomendado)

## Inicio Rápido con Docker

### 1. Construir la Imagen Docker

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. Ejecutar el Contenedor

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

Tu sitio estará disponible en `http://localhost:3000`.

## Configuración Docker Compose

Crea un archivo `docker-compose.yml`:

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

### Ejecutar con Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Variables de Entorno

Configura tu despliegue con variables de entorno:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Consideraciones de Producción

### Seguridad

- Usa gestión de secretos para datos sensibles
- Habilita HTTPS con un proxy inverso (nginx, Traefik)
- Actualizaciones de seguridad regulares

### Rendimiento

- Usa builds multi-etapa para reducir el tamaño de imagen
- Configura límites de recursos apropiados
- Habilita capas de caché

### Monitoreo

- Añade health checks
- Configura logging
- Configura monitoreo y alertas

## Próximos Pasos

- [Variables de Entorno](/docs/deployment/environment-variables) - Configura tu despliegue
- [Monitoreo](/docs/deployment/monitoring) - Monitorea tu aplicación
- [Soporte](/docs/advanced-guide/support) - Obtén ayuda con el despliegue
