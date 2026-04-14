---
id: admin-settings-endpoints
title: Endpoints de Configurações do Admin
sidebar_label: Configurações do Admin
sidebar_position: 23
---

# Endpoints de Configurações do Admin

A API de configurações do admin fornece endpoints para leitura e modificação da configuração do site armazenada em `config.yml`. Inclui configurações gerais e status do provedor de mapas. Todos os endpoints requerem autenticação de administrador.

## Visão geral

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/admin/settings` | GET | Administrador | Obter todas as configurações |
| `/api/admin/settings` | PATCH | Administrador | Atualizar uma configuração específica |
| `/api/admin/settings/map-status` | GET | Administrador | Obter status da configuração do provedor de mapas |

## Obter Configurações

```
GET /api/admin/settings
```

Retorna a seção completa de `settings` do arquivo `config.yml` do site.

**Autenticação:** Administrador obrigatório (via `getCachedApiSession`)

**Resposta de sucesso (200):**

```json
{
  "settings": {
    "theme": "light",
    "itemsPerPage": 20,
    "enableComments": true,
    "enableVoting": true,
    "enableNewsletter": true,
    "mapProvider": "mapbox",
    "defaultLanguage": "en"
  }
}
```

O formato exato do objeto `settings` depende do `config.yml` do site. O endpoint retorna o que estiver armazenado sob a chave `settings`.

| Status | Condição |
|--------|----------|
| 401 | Não autenticado como administrador |
| 500 | Falha ao ler a configuração |

## Atualizar uma Configuração

```
PATCH /api/admin/settings
```

Atualiza um único valor de configuração na seção `settings` do `config.yml`. A chave é automaticamente associada ao namespace `settings` (ex.: fornecer a chave `"theme"` atualiza `settings.theme` no arquivo de configuração).

**Autenticação:** Administrador obrigatório

**Corpo da solicitação:**

```json
{
  "key": "itemsPerPage",
  "value": 30
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `key` | string | Sim | A chave de configuração a atualizar (relativa a `settings.`) |
| `value` | qualquer | Sim | O novo valor para a configuração |

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "key": "itemsPerPage",
  "value": 30
}
```

A atualização é persistida via `configManager.updateNestedKey()`, que modifica o arquivo `config.yml` subjacente. A chave é automaticamente prefixada com `settings.` antes de ser passada ao gerenciador de configuração.

**Respostas de erro:**

| Status | Condição |
|--------|----------|
| 400 | Campo `key` ausente no corpo da solicitação |
| 401 | Não autenticado como administrador |
| 500 | Falha ao escrever a configuração |

## Status do Provedor de Mapas

### Obter Status do Mapa

```
GET /api/admin/settings/map-status
```

Retorna o status de configuração dos provedores de mapa suportados sem expor as chaves de API reais. Permite que o painel de administração mostre quais provedores de mapa estão disponíveis.

**Autenticação:** Administrador obrigatório

**Resposta de sucesso (200):**

```json
{
  "status": {
    "mapbox": {
      "isConfigured": true,
      "isPreviewAvailable": true,
      "name": "Mapbox"
    },
    "google": {
      "isConfigured": false,
      "isPreviewAvailable": false,
      "name": "Google Maps"
    }
  }
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mapbox.isConfigured` | booleano | Se `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` está definido |
| `mapbox.isPreviewAvailable` | booleano | Igual a `isConfigured` -- a pré-visualização requer o token |
| `google.isConfigured` | booleano | Se `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` está definido |
| `google.isPreviewAvailable` | booleano | Igual a `isConfigured` |

O endpoint verifica a presença das variáveis de ambiente:
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` para Mapbox
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` para Google Maps

Nenhum valor de chave real é exposto na resposta.

| Status | Condição |
|--------|----------|
| 401 | Não autenticado como administrador |
| 500 | Erro interno do servidor |

## Arquitetura de Configuração

O sistema de configurações é baseado no singleton `configManager` de `lib/config-manager`:

- **Armazenamento:** Configurações são armazenadas em um arquivo de configuração YAML (`config.yml`)
- **Acesso:** O método `configManager.getConfig()` lê a configuração completa
- **Atualizações:** O método `configManager.updateNestedKey()` modifica chaves aninhadas específicas
- **Cache:** As sessões são cacheadas via `getCachedApiSession()` para melhor desempenho

Todas as atualizações de configurações são associadas ao namespace `settings` no arquivo de configuração. Isso previne modificação acidental de chaves de configuração de nível superior através da API de configurações.
