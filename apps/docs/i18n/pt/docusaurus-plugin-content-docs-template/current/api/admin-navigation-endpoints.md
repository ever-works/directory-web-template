---
id: admin-navigation-endpoints
title: Endpoints de Navegação e Índice de Localização do Admin
sidebar_label: Navegação do Admin
sidebar_position: 29
---

# Endpoints de Navegação e Índice de Localização do Admin

Estes endpoints de admin gerenciam links de navegação personalizados do site e o índice de localização geográfica. Os endpoints de navegação permitem configurar links personalizados de cabeçalho e rodapé armazenados em `config.yml`. Os endpoints do índice de localização gerenciam o índice espacial usado para análise geográfica e recursos de mapa.

## Visão geral

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/api/admin/navigation` | GET | Administrador | Obter configuração de navegação personalizada |
| `/api/admin/navigation` | PATCH | Administrador | Atualizar itens de navegação personalizada |
| `/api/admin/location-index` | GET | Administrador | Obter estatísticas do índice de localização |
| `/api/admin/location-index` | POST | Administrador | Reconstruir ou limpar o índice de localização |

## Endpoints de Navegação

### Obter Configuração de Navegação

```
GET /api/admin/navigation
```

Recupera os itens de navegação `custom_header` e `custom_footer` do arquivo `config.yml` do site. Retorna arrays vazios se nenhuma navegação personalizada estiver configurada.

**Autenticação:** Administrador obrigatório (via `getCachedApiSession`)

**Resposta de sucesso (200):**

```json
{
  "custom_header": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Documentation",
      "path": "/pages/docs"
    }
  ],
  "custom_footer": [
    {
      "label": "GitHub",
      "path": "https://github.com/example"
    },
    {
      "label": "footer.PRIVACY_POLICY",
      "path": "/pages/privacy-policy"
    }
  ]
}
```

Cada item de navegação tem dois campos:

| Campo | Tipo | Descrição |
|---|---|---|
| `label` | string | Texto de exibição (texto simples ou chave de tradução i18n como `"footer.PRIVACY_POLICY"`) |
| `path` | string | Caminho URL (rota interna começando com `/` ou URL externo com `http://`/`https://`) |

| Status | Condição |
|---|---|
| 401 | Não autenticado como administrador |
| 500 | Falha ao ler a configuração |

**Fonte:** `template/app/api/admin/navigation/route.ts`

### Atualizar Configuração de Navegação

```
PATCH /api/admin/navigation
```

Atualiza os itens de navegação personalizada do cabeçalho ou rodapé em `config.yml`. Valida o formato do caminho de cada item para evitar ataques XSS por meio de esquemas de URL perigosos.

**Autenticação:** Administrador obrigatório

**Corpo da solicitação:**

```json
{
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Blog",
      "path": "https://blog.example.com"
    }
  ]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `type` | string | Sim | `"header"` ou `"footer"` |
| `items` | array | Sim | Array de itens de navegação |
| `items[].label` | string | Sim | Rótulo de exibição não vazio |
| `items[].path` | string | Sim | Caminho URL válido |

**Validação de Caminho:**

A função `isValidNavigationPath()` aplica regras estritas de formato de caminho:

| Formato do Caminho | Permitido | Exemplo |
|---|---|---|
| Rotas internas | Sim | `/about`, `/pages/docs` |
| URLs HTTPS | Sim | `https://example.com` |
| URLs HTTP | Sim | `http://example.com` |
| URLs com protocolo relativo | Não | `//evil.com` |
| URLs JavaScript | Não | `javascript:alert(1)` |
| URLs de dados | Não | `data:text/html,...` |
| Outros esquemas | Não | `vbscript:`, `file:` |

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    }
  ]
}
```

**Respostas de erro:**

| Status | Condição |
|---|---|
| 400 | `type` não é `"header"` ou `"footer"` |
| 400 | `items` não é um array |
| 400 | Item sem campos de string `label` ou `path` |
| 400 | Formato de caminho inválido (prevenção de XSS) |
| 401 | Não autenticado como administrador |
| 500 | Falha ao escrever a configuração |

Passe um array `items` vazio para limpar toda a navegação personalizada do tipo especificado.

**Fonte:** `template/app/api/admin/navigation/route.ts`

## Endpoints do Índice de Localização

### Obter Estatísticas do Índice de Localização

```
GET /api/admin/location-index
```

Retorna estatísticas sobre o índice de localização geográfica incluindo total de itens indexados, contagens de cidades e países, e metadados de reconstrução. Usa o serviço de índice de localização para recuperação de dados.

**Autenticação:** Administrador obrigatório (via `checkAdminAuth()`)

**Cache:** Desabilitado -- utiliza `force-dynamic`, `revalidate: 0` e `force-no-store`.

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "data": {
    "totalIndexed": 450,
    "citiesCount": 85,
    "countriesCount": 25,
    "remoteCount": 30,
    "lastIndexedAt": "2024-01-20T10:30:00.000Z",
    "lastRebuildAt": "2024-01-15T08:00:00.000Z"
  }
}
```

| Status | Condição |
|---|---|
| 401 | Não autenticado como administrador |
| 500 | Erro interno do servidor |

**Fonte:** `template/app/api/admin/location-index/route.ts`

### Gerenciar Índice de Localização

```
POST /api/admin/location-index
```

Realiza ações de gerenciamento no índice de localização. Suporta reconstrução do índice do zero ou limpeza de todas as entradas.

**Autenticação:** Administrador obrigatório

**Corpo da solicitação:**

```json
{
  "action": "rebuild"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `action` | string | Sim | `"rebuild"` ou `"clear"` |

**Ações:**

| Ação | Descrição |
|---|---|
| `rebuild` | Busca todos os itens do repositório e re-indexa seus dados de localização. Retorna estatísticas de reconstrução. |
| `clear` | Remove todas as entradas do índice de localização. Retorna o número de entradas removidas. |

**Resposta de sucesso (200) -- Reconstrução:**

```json
{
  "success": true,
  "data": {
    "indexed": 420,
    "skipped": 80,
    "errors": 0
  }
}
```

**Resposta de sucesso (200) -- Limpeza:**

```json
{
  "success": true,
  "data": {
    "cleared": 450
  }
}
```

**Respostas de erro:**

| Status | Condição |
|---|---|
| 400 | Ação inválida (não é `"rebuild"` ou `"clear"`) |
| 401 | Não autenticado como administrador |
| 500 | Erro interno do servidor |

**Fonte:** `template/app/api/admin/location-index/route.ts`

## Detalhes de Implementação

- **Prevenção de XSS:** A validação de caminho de navegação rejeita todos os esquemas de URL exceto `/`, `http://` e `https://`. Isso bloqueia `javascript:`, `data:`, `vbscript:` e URLs com protocolo relativo (`//evil.com`) que poderiam ser usados para cross-site scripting.
- **Armazenamento de Configuração:** Os itens de navegação são armazenados em `config.yml` sob as chaves `custom_header` e `custom_footer`, persistidos via `configManager.updateNestedKey()`.
- **Rótulos i18n:** Os rótulos de navegação podem ser texto simples ou chaves de tradução (ex.: `"footer.PRIVACY_POLICY"`). O frontend é responsável por resolver as chaves de tradução.
- **Reconstrução do Índice de Localização:** A operação de reconstrução carrega todos os itens do `ItemRepository` e os passa para o serviço de índice de localização. Isso pode ser uma operação intensiva em recursos para grandes conjuntos de dados.
- **Desativação de Cache:** Os endpoints do índice de localização desabilitam explicitamente todo o cache para garantir que o painel de administração sempre exiba dados atuais.
