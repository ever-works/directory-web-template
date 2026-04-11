---
id: view-tracking
title: Ver rastreamento e envolvimento
sidebar_label: Ver rastreamento
sidebar_position: 35
---

# Ver rastreamento e envolvimento

O modelo inclui um sistema de rastreamento de visualização preocupado com a privacidade que registra visualizações diárias exclusivas por item. Ele permite visualizar contagens em páginas de itens, análises de painel, classificações de itens em alta e pontuação de popularidade.

## Visão geral da arquitetura

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## Pipeline de processamento

Quando um usuário visita a página de detalhes de um item, o componente `ItemViewTracker` dispara uma solicitação POST. O servidor o processa por meio de um pipeline de vários estágios:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### Formato de resposta

```json
{ "success": true, "counted": true }
```

| Resposta | Significado |
|----------|---------|
| `counted: true` | Uma nova visualização foi registrada |
| `counted: false` | Duplicado para hoje (mesmo visualizador + item + data) |
| `counted: false, reason: "bot"` | Agente de usuário do bot detectado |
| `counted: false, reason: "owner"` | Usuário autenticado visualizando seu próprio item |

## Rastreador do lado do cliente

O `ItemViewTracker` é um componente cliente que dispara uma única solicitação POST na montagem:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

O rastreador usa uma abordagem de melhor esforço: as falhas são ignoradas silenciosamente para que o rastreamento de visualizações nunca atrapalhe a experiência do usuário.

## Detecção de bots

O módulo `lib/utils/bot-detection.ts` mantém uma lista de padrões conhecidos de agente de usuário de bot, incluindo rastreadores de mecanismos de pesquisa, ferramentas de monitoramento e clientes automatizados. Quando um bot é detectado, o endpoint retorna uma resposta bem-sucedida com `counted: false` sem tocar no banco de dados.

## Identificação do visualizador

As visualizações são atribuídas a um ID de visualizador armazenado em um cookie somente HTTP primário:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### Propriedades de privacidade

- **Sem dados pessoais** -- o cookie contém apenas um UUID aleatório, não a identidade do usuário.
- **Somente HTTP** -- O JavaScript não consegue ler o cookie, impedindo a exfiltração de rastreamento baseada em XSS.
- **Fácil no mesmo site** - o cookie não é enviado em solicitações de origem cruzada.
- **Sinalizador seguro** – aplicado na produção para exigir HTTPS.
- **Sem serviços de terceiros** – todos os dados de rastreamento permanecem em seu banco de dados.

## Deduplicação diária

A lógica de gravação principal usa `ON CONFLICT DO NOTHING` do PostgreSQL:

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

A tabela `itemViews` tem uma restrição única em `(itemId, viewerId, viewedDateUtc)` . A primeira visualização do dia para um par visualizador-item insere uma linha e retorna `true` . As visualizações subsequentes no mesmo dia são ignoradas silenciosamente. A data é calculada como UTC `YYYY-MM-DD` para desduplicação consistente, independentemente do fuso horário.

## Exclusão do Proprietário

Quando um usuário autenticado visualiza seu próprio item, a visualização não é contada:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

Isso evita que os proprietários de itens aumentem artificialmente suas contagens de visualizações.

## Consultas de agregação

O arquivo `item-view.queries.ts` exporta diversas funções para análise:

| Função | Tipo de retorno | Descrição |
|----------|-------------|-------------|
| `getTotalViewsCount(slugs)` | `number` | Total de visualizações de todos os tempos em slugs de itens |
| `getRecentViewsCount(slugs, days)` | `number` | Visualizações em uma janela deslizante (padrão 7 dias) |
| `getDailyViewsData(slugs, days)` | `Map<string, number>` | Mapa com data marcada para gráficos minigráficos |
| `getViewsPerItem(slugs)` | `Map<string, number>` | Total de visualizações por item para classificações |

## Integração analítica

### Pontuação de popularidade

As contagens de visualizações alimentam o algoritmo de pontuação de popularidade logarítmica usado pelo sistema de cartão compartilhado:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

Isso garante que os itens com muitas visualizações tenham uma classificação mais elevada no modo de classificação "Popular", ao mesmo tempo que evita pontuações descontroladas de itens virais.

### Painel do cliente

O painel do cliente em `/client/dashboard` exibe:
- Total de visualizações em todos os itens enviados
- Visualizações nos últimos 7 dias com indicadores de tendência
- Um gráfico de visualizações diárias via `getDailyViewsData` ### Painel de administração

O painel de administração usa `GET /api/admin/dashboard/stats` para métricas de visualização de todo o site. O endpoint de geoanalítica fornece distribuição geográfica de visualizações.

## Tratamento de erros

Os erros de rastreamento de visualizações são tratados silenciosamente na produção:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

O modo de desenvolvimento registra erros para depuração. A produção suprime a saída do console para evitar ruído.

## Configuração

O rastreamento de visualizações opera automaticamente sem variáveis de ambiente necessárias. O sistema degrada normalmente:

- **Sem banco de dados** – o endpoint retorna 503 e o cliente ignora a falha.
- **Modo de simulação de banco de dados** – quando ativado, as visualizações são rastreadas em relação aos dados simulados.
- **Sinalizadores de recursos** -- as contagens de visualizações são exibidas condicionalmente com base nas configurações do modelo.

## Acessibilidade

- O `ItemViewTracker` não renderiza elementos DOM, garantindo impacto zero no layout da página e nos leitores de tela.
- As contagens de visualizações exibidas nos cartões usam atributos `aria-label` para o contexto do leitor de tela.
- Os gráficos de visualização do painel incluem títulos descritivos e texto de resumo.

## Documentação Relacionada

- [Componentes do painel](/docs/template/components/dashboard-components) -- Ver exibição de estatísticas
- [Componentes do cartão compartilhado](/docs/template/components/shared-card-components) -- Pontuação de popularidade
- [Admin Analytics](/docs/template/features/admin-analytics) -- Métricas de visualização de todo o site
- [Votação e comentários](/docs/template/features/voting-comments) -- Outros recursos de engajamento
