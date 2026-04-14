---
id: collections-api-endpoints
title: Endpoints de API de Coleções
sidebar_label: API de Coleções
sidebar_position: 57
---

# Endpoints de API de Coleções

A API de Coleções fornece um endpoint público para verificar se há coleções ativas no banco de dados. As coleções são agrupamentos curados de itens gerenciados pelo painel de administração e armazenados no banco de dados via repositório de coleções.

**Fonte:** `template/app/api/collections/exists/route.ts`

---

## Verificar Existência de Coleções

Verifica se há coleções ativas disponíveis no sistema.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/collections/exists` |
| **Auth** | Nenhuma (público) |

### Parâmetros de consulta

Nenhum.

### Resposta

**Status 200** — Existência de coleções verificada com sucesso.

```json
{
  "exists": true,
  "count": 5
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `exists` | `boolean` | Se há coleções ativas |
| `count` | `number` | Número de coleções ativas |

### Resposta de Erro

**Status 500** — Erro interno do servidor.

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `exists` | `boolean` | Sempre `false` em caso de erro |
| `count` | `number` | Sempre `0` em caso de erro |
| `error` | `string` | Mensagem de erro genérica (erros detalhados são registrados apenas no servidor) |

### Exemplo com curl

```bash
# Verificar se há coleções ativas
curl -s http://localhost:3000/api/collections/exists
```

### Uso em TypeScript

```typescript
interface CollectionsExistResponse {
  exists: boolean;
  count: number;
  error?: string;
}

async function checkCollectionsExist(): Promise<CollectionsExistResponse> {
  const res = await fetch('/api/collections/exists');
  return res.json();
}

// Uso
const { exists, count } = await checkCollectionsExist();
if (exists) {
  console.log(`Encontradas ${count} coleções ativas`);
} else {
  console.log('Nenhuma coleção disponível');
}
```

### Notas de Implementação

- As coleções são obtidas do banco de dados via `collectionRepository.findAll()` com `includeInactive: false`, o que significa que apenas coleções ativas são contadas.
- Ao contrário do endpoint de categorias, este endpoint retorna um status `500` adequado em caso de erro, em vez de retornar valores padrão silenciosamente.
- A resposta de erro inclui um campo `error` genérico — informações detalhadas de erro são registradas no servidor para evitar divulgação de informações.
- Este endpoint é usado pelo frontend para renderizar condicionalmente a seção de navegação de coleções.
