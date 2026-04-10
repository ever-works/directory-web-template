---
id: docker
title: Implantação com Docker
sidebar_label: Docker
sidebar_position: 2
---

# Implantação com Docker

Implante seu site de diretório Ever Works usando containers Docker.

## Pré-requisitos

- Docker instalado no seu sistema
- Docker Compose (opcional, mas recomendado)

## Início Rápido com Docker

### 1. Construir a Imagem Docker

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. Executar o Container

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

Seu site estará disponível em `http://localhost:3000`.

## Configuração Docker Compose

Crie um arquivo `docker-compose.yml`:

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

### Executar com Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Variáveis de Ambiente

Configure sua implantação com variáveis de ambiente:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Considerações de Produção

### Segurança

- Use gerenciamento de secrets para dados sensíveis
- Habilite HTTPS com proxy reverso (nginx, Traefik)
- Atualizações regulares de segurança

### Desempenho

- Use builds multi-stage para reduzir o tamanho da imagem
- Configure limites de recursos adequados
- Habilite camadas de cache

### Monitoramento

- Adicione health checks
- Configure logging
- Configure monitoramento e alertas

## Próximos Passos

- [Variáveis de Ambiente](/docs/deployment/environment-variables) - Configure sua implantação
- [Monitoramento](/docs/deployment/monitoring) - Monitore sua aplicação
- [Suporte](/docs/advanced-guide/support) - Obtenha ajuda com a implantação
