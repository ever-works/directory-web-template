---
id: url-extraction
title: Sistema de extração de URL
sidebar_label: Extração de URL
sidebar_position: 13
---

# Sistema de extração de URL

O modelo Ever Works inclui um sistema de extração de URL alimentado por IA que extrai automaticamente metadados de URLs, incluindo nomes de produtos, descrições, categorias, tags, informações de marca e imagens. Este recurso agiliza o processo de envio de itens preenchendo automaticamente os campos do formulário a partir de um URL fornecido.

## Visão geral da arquitetura

| Componente | Caminho | Finalidade |
|---|---|---|
| `useUrlExtraction` gancho | `hooks/use-url-extraction.ts` | Gancho React do lado do cliente para acionar extração |
| `/api/extract` ponto final | `app/api/extract/` | Rota API do lado do servidor que executa a extração real |

## Como funciona

1. O usuário fornece um URL no formulário de envio
2. O gancho `useUrlExtraction` envia a URL para o endpoint `/api/extract` 3. O servidor extrai metadados (nome, descrição, categoria, tags, marca, imagens)
4. Os dados extraídos são retornados e podem ser usados para preencher automaticamente os campos do formulário

## O Gancho `useUrlExtraction` ###Interface

```tsx
interface ExtractionResult {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  brand?: string;
  brand_logo_url?: string;
  images?: string[];
}

interface UseUrlExtractionReturn {
  isLoading: boolean;
  extractFromUrl: (url: string, existingCategories?: string[]) => Promise<ExtractionResult | null>;
}
```

### Uso

```tsx
import { useUrlExtraction } from '@/hooks/use-url-extraction';

function SubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();

  const handleUrlSubmit = async (url: string) => {
    const existingCategories = ['Project Management', 'Time Tracking', 'CRM'];
    const result = await extractFromUrl(url, existingCategories);

    if (result) {
      // Auto-fill form fields with extracted data
      setFormData({
        name: result.name,
        description: result.description,
        category: result.category || '',
        tags: result.tags || [],
      });
    }
  };

  return (
    <div>
      <input
        type="url"
        placeholder="Enter product URL..."
        onBlur={(e) => handleUrlSubmit(e.target.value)}
      />
      {isLoading && <span>Extracting data...</span>}
    </div>
  );
}
```

## Campos de dados extraídos

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | `string` | Nome do produto ou serviço extraído da página |
| `description` | `string` | Descrição do produto ou meta descrição |
| `category` | `string?` | Categoria sugerida, comparada com categorias existentes, quando fornecida |
| `tags` | `string[]?` | Tags relevantes extraídas do conteúdo da página |
| `brand` | `string?` | Marca ou nome da empresa |
| `brand_logo_url` | `string?` | URL para a imagem do logotipo da marca |
| `images` | `string[]?` | Matriz de URLs de imagens relevantes encontradas na página |

## Correspondência de categoria

A função `extractFromUrl` aceita um parâmetro opcional `existingCategories` . Quando fornecida, a API de extração tenta combinar o conteúdo extraído com essas categorias, garantindo que a categoria sugerida esteja alinhada com a taxonomia do site:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## Tratamento de erros

O gancho implementa múltiplas camadas de tratamento de erros:

| Cenário | Comportamento |
|---|---|
| URL vazio | Lança um erro com "Nenhum URL fornecido" |
| Falha na solicitação HTTP | Erro de registro, mostra notificação do sistema |
| Recurso desativado | Retorna `null` silenciosamente (degradação graciosa) |
| Falha na API | Erro de log, mostra brinde com mensagem |
| Erro inesperado | Captura todos os erros, mostra brinde genérico, retorna `null` |

### Degradação Graciosa

O sistema suporta degradação graciosa quando o recurso de extração não está configurado:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

Isso permite que o formulário de envio funcione normalmente mesmo que o serviço de extração de IA não esteja configurado, simplesmente ignorando a etapa de preenchimento automático.

## Integração de consulta React

O gancho usa `useMutation` do TanStack Query para gerenciar a solicitação de extração:

```tsx
const mutation = useMutation({
  mutationFn: async ({ url, existingCategories }) => {
    const response = await serverClient.post('/api/extract', {
      url,
      existingCategories
    });
    // ... validation and error handling
    return response.data.data;
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to extract data from URL');
  }
});
```

Benefícios de usar `useMutation` :
- Gerenciamento automático do estado de carregamento via `isPending` - Tratamento de erros integrado com retorno de chamada `onError` - API baseada em promessa via `mutateAsync` ## Integração com envio de formulário

A extração de URL normalmente é integrada ao fluxo de envio de itens:

```tsx
function ItemSubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', tags: []
  });

  const handleUrlChange = async (url: string) => {
    if (!url) return;

    const result = await extractFromUrl(url, availableCategories);
    if (result) {
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        description: result.description || prev.description,
        category: result.category || prev.category,
        tags: result.tags?.length ? result.tags : prev.tags,
      }));
    }
  };

  return (
    <form>
      <input
        name="url"
        placeholder="Product URL"
        onBlur={(e) => handleUrlChange(e.target.value)}
        disabled={isLoading}
      />
      {/* Form fields auto-populated from extraction */}
    </form>
  );
}
```

## Cliente API

O gancho usa o `serverClient` do modelo para comunicação HTTP:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## Arquivos principais

| Arquivo | Caminho |
|---|---|
| Gancho de extração de URL | `hooks/use-url-extraction.ts` |
| Extrair rota API | `app/api/extract/route.ts` |
| Cliente API do Servidor | `lib/api/server-api-client.ts` |
