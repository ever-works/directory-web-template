---
id: categories-api-endpoints
title: Endpoints de API de Categorias
sidebar_label: API de Categorias
sidebar_position: 56
---

# Endpoints de API de Categorias

A API de Categorias fornece um endpoint público para verificar se alguma categoria existe no sistema de conteúdo. As categorias são obtidas do repositório de conteúdo baseado em Git e representam a taxonomia de nível superior para organizar itens.

**Fonte:** `template/app/api/categories/exists/route.ts`

---

## Verificar Existência de Categorias

Verifica se há categorias disponíveis no sistema e retorna a contagem.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/categories/exists` |
| **Auth** | Nenhuma (público) |

### Parâmetros de consulta

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `locale` | `string` | Não | `"en"` | Código de localidade para buscar categorias (ex.: `en`, `fr`, `de`) |

### Resposta

**Status 200** — Existência de categorias verificada com sucesso.

```json
{
  "exists": true,
  "count": 12
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `exists` | `boolean` | Se há categorias disponíveis |
| `count` | `number` | Número de categorias encontradas |

### Tratamento de Erros

Em caso de erro, o endpoint retorna uma resposta `200` com valores padrão seguros em vez de um código de status de erro:

```json
{
  "exists": false,
  "count": 0
}
```

Esse comportamento à prova de falhas garante que a interface possa degradar graciosamente quando o sistema de conteúdo estiver indisponível.

### Exemplo com curl

```bash
# Verificar se existem categorias (localidade padrão)
curl -s http://localhost:3000/api/categories/exists

# Verificar categorias para localidade francesa
curl -s http://localhost:3000/api/categories/exists?locale=fr
```

### Uso em TypeScript

```typescript
interface CategoriesExistResponse {
  exists: boolean;
  count: number;
}

async function checkCategoriesExist(locale: string = 'en'): Promise<CategoriesExistResponse> {
  const res = await fetch(`/api/categories/exists?locale=${locale}`);
  return res.json();
}

// Uso
const { exists, count } = await checkCategoriesExist('en');
if (exists) {
  console.log(`Encontradas ${count} categorias`);
}
```

### Notas de Implementação

- As categorias são obtidas do CMS baseado em Git via `fetchItems()` de `@/lib/content`.
- O endpoint não requer autenticação — ele foi projetado para uso pela interface pública para renderizar condicionalmente os elementos de navegação de categorias.
- Erros são registrados apenas em modo de desenvolvimento (`NODE_ENV === 'development'`).
- O parâmetro `locale` é mapeado para a opção `lang` na camada de busca de conteúdo.
