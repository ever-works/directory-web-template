---
id: surveys
title: Sistema de pesquisas
sidebar_label: Pesquisas
sidebar_position: 11
---

# Sistema de pesquisas

O modelo Ever Works inclui um sistema de pesquisas integrado que suporta pesquisas globais (feedback em todo o site) e pesquisas específicas de itens (anexadas a itens individuais do diretório). As pesquisas são gerenciadas por meio do painel de administração e as respostas são coletadas de usuários autenticados.

## Arquitetura

```
Surveys System
  |
  +-- SurveyService (lib/services/survey.service.ts)
  |     Server-side business logic singleton
  |
  +-- Database Queries (lib/db/queries/)
  |     Survey and response CRUD operations
  |
  +-- Admin Pages (app/[locale]/admin/surveys/)
  |     Create, edit, preview, publish, view responses
  |
  +-- API Client (lib/api/survey-api.client.ts)
  |     Client-side API wrapper
  |
  +-- Database Schema (lib/db/schema.ts)
        surveys + survey_responses tables
```

## Tipos de pesquisa

| Tipo | Descrição | Caso de uso |
|------|-------------|----------|
| **Global** | Pesquisa em todo o site, não vinculada a nenhum item | Feedback geral, pesquisas NPS, satisfação do usuário |
| **Específico do item** | Vinculado a um item específico via `itemId` | Feedback de produtos, análises de serviços, solicitações de recursos |

## SurveyService

A classe `SurveyService` ( `lib/services/survey.service.ts` ) lida com toda a lógica de negócios. É um serviço apenas do lado do servidor (não importa componentes do cliente).

### Operações CRUD

| Método | Descrição |
|--------|------------|
| `create(data)` | Crie uma nova pesquisa com slug gerado automaticamente |
| `getOne(id)` | Obter pesquisa por ID |
| `getBySlug(slug)` | Obtenha pesquisa por slug compatível com URL |
| `getMany(filters?, userId?)` | Listar pesquisas com paginação, filtragem e status de conclusão |
| `update(id, data)` | Atualizar campos de pesquisa e lidar com transições de status |
| `delete(id)` | Excluir pesquisa (bloqueada se existirem respostas) |

### Operações de resposta

| Método | Descrição |
|--------|------------|
| `submitResponse(data)` | Envie uma resposta à pesquisa (valida que a pesquisa foi publicada) |
| `getResponses(surveyId, filters?)` | Obtenha respostas paginadas para uma pesquisa |
| `getResponseById(id)` | Obtenha uma única resposta |

### Geração de Lesmas

Slugs de pesquisa são gerados automaticamente a partir do título com suporte Unicode:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

O serviço garante a exclusividade do slug anexando um contador se uma colisão for detectada.

## Ciclo de vida da pesquisa

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| Estado | Descrição |
|--------|------------|
| `draft` | A pesquisa está sendo editada, não visível para os usuários |
| `published` | A pesquisa está ativa e aceitando respostas |
| `closed` | A pesquisa não aceita mais respostas |

As transições de status atualizam os carimbos de data e hora dos metadados:

- Definir status para `published` define `publishedAt` - Definir status para `closed` define `closedAt` ## Estrutura de dados da pesquisa

As pesquisas usam uma definição de pergunta baseada em JSON armazenada na coluna `surveyJson` . Isto permite estruturas de pesquisa flexíveis sem alterações de esquema.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: 'global' | 'item';
  itemId?: string;          // Required when type is 'item'
  status?: 'draft' | 'published' | 'closed';
  surveyJson: object;       // Question definitions
}
```

### Estrutura de resposta à pesquisa

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;          // Authenticated user ID
  itemId?: string;          // Item ID for item-specific surveys
  data: object;             // Response data matching surveyJson
  ipAddress?: string;       // For rate limiting
  userAgent?: string;       // For analytics
}
```

## Gerenciamento administrativo

As páginas de pesquisa do administrador fornecem uma interface completa de gerenciamento do ciclo de vida:

### Rotas administrativas

| Rota | Descrição |
|-------|------------|
| `/admin/surveys` | Listagem de pesquisas com guias de status |
| `/admin/surveys/create` | Novo formulário de criação de pesquisa |
| `/admin/surveys/[slug]/edit` | Editar pesquisa existente |
| `/admin/surveys/[slug]/preview` | Visualize a pesquisa antes de publicar |
| `/admin/surveys/[slug]/responses` | Visualizar e analisar respostas |

### Capacidades administrativas

- **Crie pesquisas** com título, descrição, tipo e pergunta JSON
- **Editar pesquisas** em estado de rascunho ou publicado
- **Visualizar** antes de publicar para verificar a aparência
- **Publicar/fechar** pesquisas para controlar a coleta de respostas
- **Ver respostas** com filtragem e paginação
- **Excluir pesquisas** (somente se nenhuma resposta tiver sido coletada)

O método `getMany` suporta consultas eficientes com:

- **Contagem de respostas** via SQL JOINs (consulta única, sem N+1)
- **Status de conclusão** por usuário (mostra se o usuário atual já respondeu)
- **Paginação** com parâmetros de página/limite
- **Filtragem** por status e tipo

## Tratamento de erros

O serviço inclui tratamento robusto de erros para problemas comuns de banco de dados:

| Condição de erro | Comportamento |
|----------------|----------|
| Tabela não encontrada | Mensagem clara: "Executar migrações de banco de dados" |
| Conexão recusada | "Falha na conexão com o banco de dados" |
| DATABASE_URL ausente | “Banco de dados não configurado” |
| Pesquisa não encontrada | Erro estilo 404 |
| Pesquisa não publicada | “A pesquisa está [status] e não aceita respostas” |
| Excluir com respostas | "Não é possível excluir pesquisa com N respostas" |

## Sinalizadores de recursos

As pesquisas são controladas pelo sistema de sinalizadores de recursos. O sinalizador `surveys` é habilitado automaticamente quando `DATABASE_URL` é configurado:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## Uso do lado do cliente

Os componentes do cliente usam o wrapper do cliente API em vez do serviço diretamente:

```typescript
// Use in client components
import { surveyApiClient } from '@/lib/api/survey-api.client';

// Fetch surveys
const surveys = await surveyApiClient.getMany({ status: 'published' });

// Submit response
await surveyApiClient.submitResponse({
  surveyId: 'survey-uuid',
  data: { rating: 5, feedback: 'Great!' },
});
```

## Teste E2E

As pesquisas são cobertas por vários arquivos de teste E2E:

- `e2e/tests/admin/surveys.spec.ts` -- Fluxos de trabalho de gerenciamento administrativo
- `e2e/tests/public/surveys.spec.ts` -- Exibição e envio da pesquisa pública
- `e2e/page-objects/admin/surveys.page.ts` -- Objeto da página de pesquisa do administrador

## Arquivos Relacionados

- `lib/services/survey.service.ts` -- Serviço de lógica de negócios
- `lib/db/schema.ts` -- `surveys` e `survey_responses` definições de tabela
- `lib/db/queries/` -- Consultas de banco de dados de pesquisa
- `lib/types/survey.ts` -- Definições de tipo TypeScript
- `lib/api/survey-api.client.ts` -- Wrapper da API do lado do cliente
- `app/[locale]/admin/surveys/` -- Páginas de administração
- `components/admin/` -- Componentes da interface de administração
- `e2e/tests/admin/surveys.spec.ts` -- Testes de administração E2E
- `e2e/tests/public/surveys.spec.ts` -- Testes E2E públicos
