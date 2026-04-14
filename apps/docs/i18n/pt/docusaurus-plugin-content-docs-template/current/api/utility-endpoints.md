---
id: utility-endpoints
title: Endpoints Utilitários da API
sidebar_label: Endpoints Utilitários
sidebar_position: 5
---

# Endpoints Utilitários da API

Os endpoints utilitários fornecem serviços de infraestrutura, incluindo verificações de saúde, informações de versão, configuração de funcionalidades, geocodificação, verificação de reCAPTCHA, extração de URL, dados de localização e operações internas.

## Verificação de Saúde (`/api/health`)

### Saúde do Banco de Dados

| Método | Caminho | Descrição |
|--------|---------|----------|
| `GET` | `/api/health/database` | Verificar conectividade com o banco de dados |

Retorna o status de conexão do banco de dados. Utilizado por sistemas de monitoramento e verificações de saúde de implantação.

**Resposta (saudável):**

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Resposta (não saudável):**

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection refused",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Autenticação:** Público (sem auth necessária). Este endpoint deve ser acessível por balanceadores de carga e serviços de monitoramento.

## Versão (`/api/version`)

| Método | Caminho | Descrição |
|--------|---------|----------|
| `GET` | `/api/version` | Obter informações de versão da aplicação |
| `GET` | `/api/version/sync` | Obter versão e status de sincronização |

### Resposta de Versão

Retorna a versão da aplicação, informações de build e ambiente de execução:

```json
{
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Versão + Status de Sincronização

O endpoint `/api/version/sync` estende as informações de versão com o status de sincronização do repositório de conteúdo, útil para depurar a atualidade do conteúdo.

**Autenticação:** Público.

## Configuração de Funcionalidades (`/api/config`)

| Método | Caminho | Descrição |
|--------|---------|----------|
| `GET` | `/api/config/features` | Obter flags de funcionalidades habilitadas |

Retorna a configuração atual de feature flags para a aplicação no lado do cliente. Isso permite que o frontend renderize condicionalmente funcionalidades com base na configuração do servidor.

**Resposta:**

```json
{
  "features": {
    "payments": true,
    "sponsorAds": true,
    "surveys": false,
    "map": true,
    "newsletter": true
  }
}
```

**Autenticação:** Público. Feature flags não são dados sensíveis.

## Extração de URL (`/api/extract`)

| Método | Caminho | Descrição |
|--------|---------|----------|
| `POST` | `/api/extract` | Extrair metadados de uma URL |

Busca uma URL e extrai metadados, incluindo título, descrição, imagem e favicon. Utilizado pelo formulário de envio de itens para preencher campos automaticamente a partir de uma URL.

**Requisição:**

```json
{
  "url": "https://example.com/product"
}
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "title": "Product Name",
    "description": "Product description from meta tags",
    "image": "https://example.com/og-image.png",
    "favicon": "https://example.com/favicon.ico",
    "siteName": "Example.com"
  }
}
```

**Autenticação:** Obrigatória. Previne abuso da busca de URL server-side.

## Geocodificação (`/api/geocode`)

| Método | Caminho | Descrição |
|--------|---------|----------|
| `POST` | `/api/geocode` | Geocodificar um endereço para coordenadas |

Converte um endereço de texto em coordenadas geográficas (latitude/longitude) usando um serviço externo de geocodificação.

**Requisição:**

```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "lat": 37.4224764,
    "lng": -122.0842499,
    "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"
  }
}
```

**Autenticação:** Obrigatória.

## Dados de Localização (`/api/location`)

Endpoints para pesquisa de localização e dados de referência.

| Método | Caminho | Descrição |
|--------|---------|----------|
| `GET` | `/api/location/countries` | Listar todos os países |
| `GET` | `/api/location/cities` | Listar cidades (com filtro de país) |
| `GET` | `/api/location/coordinates` | Obter coordenadas para uma localização |
| `GET` | `/api/location/search` | Pesquisar localizações por string de consulta |

### Países

Retorna uma lista de países com códigos ISO, nomes e metadados opcionais.

### Cidades

Suporta filtragem por código de país:

```
GET /api/location/cities?country=US
```

### Pesquisa de Localização

Pesquisa de localização por texto completo:

```
GET /api/location/search?q=San Francisco
```

**Autenticação:** Público.

## Verificação reCAPTCHA (`/api/verify-recaptcha`)

| Método | Caminho | Descrição |
|--------|---------|----------|
| `POST` | `/api/verify-recaptcha` | Verificar um token reCAPTCHA |

Verificação server-side de tokens do Google reCAPTCHA. Utilizado por formulários que requerem proteção contra bots.

**Autenticação:** Público.
