---
id: queries
title: Referência de consultas de banco de dados
sidebar_label: Consultas
sidebar_position: 2
---

# Referência de consultas de banco de dados

O diretório `lib/db/queries/` contém mais de 23 módulos de consulta organizados por domínio. Cada módulo encapsula consultas Drizzle ORM para uma área de recurso específica, seguindo o Princípio de Responsabilidade Única.

## Visão geral do módulo

Todos os módulos de consulta são exportados em barril de `lib/db/queries/index.ts` para importação conveniente:

```typescript
import { getUser, getUserByEmail } from '@/lib/db/queries';
```

## Módulos de consulta

### atividade.queries.ts

Registro e recuperação de atividades para o sistema de trilha de auditoria.

**Funções principais:**
- Registrar atividades do usuário (login, inscrição, alterações na conta)
- Consultar histórico de atividades por usuário ou intervalo de datas

### auth.queries.ts

Operações de banco de dados relacionadas à autenticação.

**Funções principais:**
- Encontre usuário por e-mail para autenticação de credenciais
- Crie e verifique tokens de redefinição de senha
- Gerenciar tokens de verificação

### cliente.queries.ts

O maior módulo de consulta (37 KB), lidando com todas as operações voltadas ao cliente.

**Funções principais:**
- Operações CRUD de perfil de cliente
- Envios e gerenciamento de itens do cliente
- Agregação de dados do painel do cliente
- Pesquise e filtre dados do cliente
- Consultas de listagem paginadas

### comentário.queries.ts

Comente as operações do sistema.

**Funções principais:**
- Criar, atualizar e excluir comentários de forma reversível
- Buscar comentários por item com paginação
- Consultas de moderação de comentários (admin)
- Agregação de classificação

### empresa.queries.ts

Dúvidas da administração da empresa.

**Funções principais:**
- Operações CRUD da empresa
- Pesquisa e filtragem de empresas
- Gerenciamento de associação item-empresa
- Estatísticas e análises da empresa

### dashboard.queries.ts

Agregação de dados de painel para painéis de administração e cliente.

**Funções principais:**
- Estatísticas do painel de administração (total de usuários, itens, receita)
- Estatísticas do painel do cliente (envios, visualizações, engajamento)
- Dados de série temporal para gráficos
- Resumos de atividades

### engajamento.queries.ts

Métricas de engajamento agregadas entre visualizações, votos, favoritos e comentários.

**Funções principais:**
- Obtenha pontuações de engajamento para itens
- Contagens agregadas de visualizações
- Calcule métricas de popularidade
- Classificações de engajamento

### mapeamento de integração.queries.ts

Operações de mapeamento de integração de CRM.

**Funções principais:**
- Criar e atualizar mapeamentos de integração
- Procure IDs de CRM em Ever IDs e vice-versa
- Rastreie carimbos de data/hora de sincronização e hashes de versão
- Operações de mapeamento em massa

### item.queries.ts

Consultas de itens principais (os itens são armazenados no Git, mas os metadados são rastreados no banco de dados).

**Funções principais:**
- Operações de metadados de item
- Rastreamento de visualização de item
- Dados de engajamento do item

### item-audit.queries.ts

Operações de log de auditoria de item.

**Funções principais:**
- Registrar ações de criação, atualização, exclusão e revisão de itens
- Consultar histórico de auditoria para itens específicos
- Filtre registros de auditoria por tipo de ação, executor ou intervalo de datas

### item-view.queries.ts

Rastreamento e análise de visualização de itens.

**Funções principais:**
- Registre visualizações diárias exclusivas (desduplicadas por ID e data do visualizador)
- Consultar contagens de visualizações por item e intervalo de datas
- Ver agregação de análise

### índice de localização.queries.ts

Pesquisa e indexação com base em localização.

**Funções principais:**
- Consultas geoespaciais para itens próximos
- Gerenciamento de índice de localização
- Cálculos de distância
- Pesquisa baseada em localização com filtros

### moderação.queries.ts

Sistema de moderação de conteúdo.

**Funções principais:**
- Crie e gerencie relatórios de conteúdo
- Atualizar status e resolução do relatório
- Registrar ações de moderação
- Estatísticas de moderação e gerenciamento de filas

### newsletter.queries.ts

Gerenciamento de assinaturas de newsletters.

**Funções principais:**
- Operações de assinatura e cancelamento de assinatura
- Verifique o status da assinatura
- Listar assinantes ativos
- Rastrear histórico de envio de e-mail

### pagamento.queries.ts

Operações de banco de dados relacionadas a pagamentos.

**Funções principais:**
- Gerenciamento de provedores de pagamento
- Vinculação de conta de pagamento
- Gravação de transações
- Consultas de histórico de pagamentos

### relatório.queries.ts

Consultas do sistema de relatórios de conteúdo.

**Funções principais:**
- Criar relatórios (item ou comentário)
- Listar relatórios com filtros e paginação
- Atualizar status do relatório
- Análise de relatórios

### assinatura.queries.ts

Gerenciamento do ciclo de vida da assinatura (17 KB).

**Funções principais:**
- Criar e atualizar assinaturas
- Transições de status de assinatura
- Gravação do histórico de assinaturas
- Encontre assinaturas por usuário ou ID do provedor
- Operações de renovação e cancelamento
- Análise de assinatura

### pesquisa.queries.ts

Operações do sistema de levantamento.

**Funções principais:**
- Pesquisar operações CRUD
- Gravação de respostas à pesquisa
- Agregação e análise de respostas
- Gerenciamento do status da pesquisa (rascunho, publicado, fechado)

### usuário.queries.ts

Consultas de gerenciamento de usuários.

**Funções principais:**
- Operações CRUD do usuário
- Pesquisa e filtragem de usuários
- Gerenciamento de funções de usuário
- Exclusão de conta (exclusão reversível)

### vote.queries.ts

Operações do sistema de votação.

**Funções principais:**
- Criar, atualizar e remover votos
- Verifique os votos existentes para um par de itens de usuário
- Contagem agregada de votos por item
- Alternância do tipo de voto (voto positivo/voto negativo)

## Utilitários Compartilhados

### tipos.ts

Tipos TypeScript compartilhados usados em módulos de consulta:

```typescript
// Common query parameter types
export interface PaginationParams {
  page: number;
  limit: number;
}
```

### utilitários.ts

Funções utilitárias compartilhadas para criação de consultas:

- Auxiliares de paginação (cálculo de deslocamento, formatação de resultados)
- Construtores de filtros comuns
- Ajudantes de fragmentos SQL

## Padrões de consulta

### Padrão de consulta padrão

Todos os módulos de consulta seguem um padrão consistente:

```typescript
import { db } from '../drizzle';
import { eq, desc, and, sql } from 'drizzle-orm';
import { tableName } from '../schema';

export async function getItemById(id: string) {
  const result = await db
    .select()
    .from(tableName)
    .where(eq(tableName.id, id))
    .limit(1);
  return result[0] || null;
}
```

### Consultas paginadas

Muitos módulos implementam consultas paginadas:

```typescript
export async function getItems(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select().from(tableName)
      .orderBy(desc(tableName.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(tableName),
  ]);
  return {
    items,
    total: Number(countResult[0].count),
    page,
    limit,
  };
}
```

### Consultas de agregação

Os módulos de engajamento e painel usam agregação SQL:

```typescript
export async function getEngagementScore(itemId: string) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(v.vote_count, 0) as votes,
      COALESCE(c.comment_count, 0) as comments,
      COALESCE(f.favorite_count, 0) as favorites,
      COALESCE(iv.view_count, 0) as views
    FROM ...
  `);
  return result;
}
```

## Convenção de Importação

Funções de consulta de importação por meio da exportação barril:

```typescript
// Preferred: import from barrel
import { getUser, createSubscription, getVotesByItem } from '@/lib/db/queries';

// Also valid: import from specific module
import { getUser } from '@/lib/db/queries/user.queries';
```
