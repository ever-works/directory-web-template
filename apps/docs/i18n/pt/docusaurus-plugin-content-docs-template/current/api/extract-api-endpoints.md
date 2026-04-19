---
id: extract-api-endpoints
title: Endpoints de API de Extração
sidebar_label: API de Extração
sidebar_position: 61
---

# Endpoints de API de Extração

A API de Extração fornece um endpoint de proxy seguro para extrair metadados de itens (nome, descrição, categorias, etc.) de uma URL fornecida. Ela encaminha solicitações para a API da Plataforma Ever Works para extração de conteúdo com IA.

**Origem:** `template/app/api/extract/route.ts`

---

## Extrair metadados de URL

Extrai metadados de itens de uma URL fornecida fazendo proxy da solicitação para a API da Plataforma.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `POST` |
| **Caminho** | `/api/extract` |
| **Auth** | Nenhuma (pública, mas requer que `PLATFORM_API_URL` esteja configurada) |

### Corpo da solicitação

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `url` | `string` (URI) | Sim | A URL para extrair metadados |
| `existingCategories` | `string[]` | Não | Nomes de categorias existentes para auxiliar na categorização por IA |

### Respostas

**Status 200** -- Extração bem-sucedida.

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description extracted from the page.",
    "category": "Productivity",
    "tags": ["automation", "workflow"]
  }
}
```

O formato de `data` depende da resposta da API da Plataforma -- normalmente inclui `name`, `description` e campos sugeridos de categorização.

**Status 200** -- Funcionalidade desativada (API da Plataforma não configurada).

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

:::note
Quando `PLATFORM_API_URL` não está definida, o endpoint retorna status `200` com `featureDisabled: true` em vez de um erro. Isso permite que o frontend oculte graciosamente a funcionalidade de extração.
:::

**Status 400** -- Solicitação inválida.

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Status 500** -- Erro do servidor durante a extração.

```json
{
  "success": false,
  "error": "Internal server error during extraction"
}
```

### Validação

O corpo da solicitação é validado com Zod:

- `url` deve ser uma string de URL válida.
- `existingCategories` é um array opcional de strings.

### Exemplos com curl

```bash
# Extrair metadados de uma URL
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/some-project",
    "existingCategories": ["Developer Tools", "Open Source"]
  }'

# Solicitação mínima (apenas URL)
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/product" }'
```

### Uso em TypeScript

```typescript
interface ExtractRequest {
  url: string;
  existingCategories?: string[];
}

interface ExtractSuccessResponse {
  success: true;
  data: {
    name: string;
    description: string;
    category?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

interface ExtractDisabledResponse {
  success: false;
  featureDisabled: true;
  message: string;
}

interface ExtractErrorResponse {
  success: false;
  error: string;
}

type ExtractResponse = ExtractSuccessResponse | ExtractDisabledResponse | ExtractErrorResponse;

async function extractMetadata(
  url: string,
  existingCategories?: string[]
): Promise<ExtractResponse> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, existingCategories }),
  });
  return res.json();
}

// Uso
const result = await extractMetadata('https://example.com/tool', ['Productivity']);

if ('featureDisabled' in result && result.featureDisabled) {
  console.log('Funcionalidade de extração não disponível');
} else if (result.success) {
  console.log('Extraído:', result.data.name, result.data.description);
} else {
  console.error('Falha na extração:', result.error);
}
```

### Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `PLATFORM_API_URL` | Não | URL base da API da Plataforma Ever Works. Se não definida, a funcionalidade é desativada graciosamente. |
| `PLATFORM_API_SECRET_TOKEN` | Não | Token Bearer opcional para autenticação com a API da Plataforma. |

### Notas de implementação

- Este endpoint atua como um **proxy seguro** -- a URL e o token da API da Plataforma nunca são expostos ao cliente.
- O endpoint remove barras finais de `PLATFORM_API_URL` antes de construir a URL de extração.
- O endpoint da API da Plataforma chamado é `<PLATFORM_API_URL>/extract-item-details`.
- O campo `existingCategories` é encaminhado como `existing_data` no corpo da solicitação da API da Plataforma.
- Respostas de erro não-JSON da API da Plataforma (ex.: páginas de erro HTML) são tratadas graciosamente com fallback para `statusText`.
