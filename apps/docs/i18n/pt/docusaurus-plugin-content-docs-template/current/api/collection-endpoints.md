---
id: collection-endpoints
title: "Endpoints de API de Coleções"
sidebar_label: "Coleções"
sidebar_position: 11
---

# Endpoints de API de Coleções

A API de Coleções fornece um endpoint público para verificar se há coleções ativas no sistema. As coleções são armazenadas no banco de dados e gerenciadas pela camada de repositório de coleções.

**Arquivo fonte:** `template/app/api/collections/exists/route.ts`

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| GET | `/api/collections/exists` | Nenhuma | Verificar se há coleções ativas |

---

## GET `/api/collections/exists`

Verifica se há coleções ativas disponíveis. Retorna um flag booleano `exists` junto com a contagem de coleções ativas. Este é um endpoint público usado principalmente pelo frontend para decidir se deve renderizar elementos de UI relacionados a coleções.

### Parâmetros de consulta

Nenhum.

### Como funciona

O handler usa o `collectionRepository` para buscar todas as coleções ativas e verifica se o resultado é um array não vazio:

```ts
const collections = await collectionRepository.findAll({
  includeInactive: false
});

const hasCollections =
  Array.isArray(collections) && collections.length > 0;

return NextResponse.json({
  exists: hasCollections,
  count: collections?.length || 0
});
```

### Formato da resposta

#### 200 — Coleções encontradas

```json
{
  "exists": true,
  "count": 5
}
```

#### 200 — Sem coleções

```json
{
  "exists": false,
  "count": 0
}
```

#### 500 — Erro no servidor

Em caso de falha, o endpoint retorna status 500 com uma mensagem de erro genérica. Informações detalhadas de erro são registradas apenas no servidor:

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

### Autenticação

Este é um **endpoint público** — nenhuma autenticação é necessária.

### Exemplo de uso

```ts
// Verificar se coleções existem antes de renderizar a seção de coleções
const res = await fetch('/api/collections/exists');
const data = await res.json();

if (data.exists) {
  console.log(`${data.count} coleções ativas disponíveis`);
  // Renderizar navegação de coleções
}
```

### Diferenças em relação ao Endpoint de Categorias

| Aspecto | Categorias | Coleções |
|---------|-----------|----------|
| Fonte de dados | Conteúdo do CMS baseado em Git | Banco de dados via camada de repositório |
| Comportamento de erro | Retorna 200 com `exists: false` | Retorna 500 com mensagem de erro |
| Suporte a filtros | Parâmetro de localidade | Filtro somente-ativo (fixo) |
| Requer banco de dados | Não | Sim |

### Notas

- Apenas coleções **ativas** são contadas. Coleções inativas são excluídas pelo filtro `includeInactive: false`.
- Erros detalhados são registrados no servidor e nunca expostos ao cliente (para evitar divulgação de informações).
- O endpoint requer uma conexão de banco de dados funcional, pois as coleções são baseadas em banco de dados.

### Arquivos fonte relacionados

| Arquivo | Finalidade |
|---------|-----------|
| `template/app/api/collections/exists/route.ts` | Handler de rota |
| `template/lib/repositories/collection.repository.ts` | Camada de acesso a dados de coleções |
