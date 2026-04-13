---
id: category-endpoints
title: "Endpoints de API de Categoria"
sidebar_label: "Categorias"
sidebar_position: 10
---

# Endpoints de API de Categoria

A API de Categorias fornece um endpoint público leve para verificar se existem categorias no sistema. As categorias são derivadas da camada de conteúdo (CMS baseado em Git) em vez de um banco de dados, tornando este endpoint disponível mesmo sem conexão com o banco de dados.

**Arquivo fonte:** `template/app/api/categories/exists/route.ts`

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| GET | `/api/categories/exists` | Nenhuma | Verificar se existem categorias |

---

## GET `/api/categories/exists`

Verifica se há categorias disponíveis no repositório de conteúdo. Retorna um flag booleano `exists` junto com a contagem total. Este endpoint é útil para renderização condicional de UI — por exemplo, ocultar um filtro de categoria quando nenhuma categoria está definida.

### Parâmetros de consulta

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `locale` | string | Não | `"en"` | Código de localidade para buscar categorias localizadas |

### Como funciona

O handler chama `fetchItems` da camada de conteúdo com a localidade solicitada e inspeciona o array `categories` retornado:

```ts
const locale = request?.nextUrl?.searchParams?.get('locale') || 'en';
const { categories } = await fetchItems({ lang: locale });

const hasCategories = Array.isArray(categories) && categories.length > 0;

return NextResponse.json({
  exists: hasCategories,
  count: categories?.length || 0
});
```

### Formato da resposta

#### 200 — Categorias encontradas

```json
{
  "exists": true,
  "count": 12
}
```

#### 200 — Sem categorias

```json
{
  "exists": false,
  "count": 0
}
```

#### Tratamento de Erros

Em caso de erro, o endpoint retorna um fallback seguro em vez de um status 500. Isso garante que os consumidores possam sempre confiar no formato da resposta:

```json
{
  "exists": false,
  "count": 0
}
```

Erros são registrados apenas em modo de desenvolvimento (`NODE_ENV === 'development'`).

### Autenticação

Este é um **endpoint público** — nenhuma autenticação é necessária.

### Exemplo de uso

```ts
// Verificar se categorias existem antes de renderizar a UI de filtro
const res = await fetch('/api/categories/exists?locale=fr');
const { exists, count } = await res.json();

if (exists) {
  console.log(`Encontradas ${count} categorias`);
  // Renderizar filtro de categorias
}
```

### Notas

- As categorias vêm da camada de conteúdo CMS baseado em Git, não do banco de dados.
- O endpoint tem consciência de localidade, portanto diferentes localidades podem ter contagens de categorias diferentes.
- Erros são tratados silenciosamente para não quebrar a UI — o endpoint sempre retorna JSON válido.
- Nenhum cabeçalho de cache é definido pelo handler; o cache é gerenciado no nível de infraestrutura.

### Arquivos fonte relacionados

| Arquivo | Finalidade |
|---------|-----------|
| `template/app/api/categories/exists/route.ts` | Handler de rota |
| `template/lib/content.ts` | Função `fetchItems` que resolve categorias |
