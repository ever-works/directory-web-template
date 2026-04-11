---
id: performance
title: Otimização de desempenho
sidebar_label: Desempenho
sidebar_position: 5
---

# Otimização de desempenho

Este guia aborda as otimizações de desempenho incorporadas ao modelo Ever Works e técnicas para manter tempos de carregamento rápidos à medida que seu aplicativo cresce.

## Configuração Next.js

O `next.config.ts` do modelo inclui diversas configurações focadas no desempenho:

### Saída autônoma

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

O modo de saída `standalone` cria uma compilação independente que inclui apenas os arquivos necessários para executar o aplicativo. Isso reduz o tamanho do contêiner e o tempo de inicialização da produção.

### Otimização de importação de pacotes

```typescript
experimental: {
  optimizePackageImports: ["@heroui/react", "lucide-react"],
},
```

Esta configuração permite a agitação da árvore para pacotes com muitos arquivos de barril. Em vez de importar toda a biblioteca `@heroui/react` ou `lucide-react` , apenas os componentes realmente usados ​​são incluídos no pacote.

### Otimização de observação do Webpack

```typescript
if (dev) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
  };
}
```

O diretório `.content/` (CMS baseado em Git com mais de 220 arquivos markdown) é excluído do inspetor de arquivos do webpack em desenvolvimento. Isso evita reconstruções desnecessárias quando os arquivos de conteúdo são alterados e reduz significativamente o uso da CPU durante o desenvolvimento.

### Avisos suprimidos

O registro detalhado da infraestrutura é suprimido em ambientes CI e Vercel:

```typescript
if (process.env.CI || process.env.VERCEL) {
  config.infrastructureLogging = { level: 'error' };
}
```

## Otimização de imagem

### Padrões Remotos

O modelo gera dinamicamente padrões de imagens remotas permitidos usando `generateImageRemotePatterns()` . Isso garante que as imagens de CDNs configurados e fontes externas sejam otimizadas por meio do pipeline de imagens integrado do Next.js.

### Manipulação de SVG

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

Imagens SVG são permitidas, mas em sandbox com uma política de segurança de conteúdo rígida que desativa a execução de scripts. Isso permite logotipos e ícones SVG, evitando XSS por meio de injeção de SVG.

### Melhores práticas para imagens

| Técnica | Implementação | Impacto |
|---|---|---|
| Utilize `next/image` | Componente integrado com carregamento lento | WebP/AVIF automático, tamanhos responsivos |
| Definir dimensões explícitas | Adereços `width` e `height` | Impede mudança cumulativa de layout (CLS) |
| Use `priority` para LCP | `<Image priority />` para imagens de heróis | Pré-carrega a imagem de pintura com maior conteúdo |
| Use `sizes` suporte | `sizes="(max-width: 768px) 100vw, 50vw"` | Impede o download de imagens grandes |
| Desfocar espaços reservados | `placeholder="blur"` com `blurDataURL` | Melhora a velocidade de carregamento percebida |

## Estratégias de cache

### Cabeçalhos HTTP

O modelo define cabeçalhos relacionados ao cache em `next.config.ts` :

```typescript
headers: [
  { key: "X-DNS-Prefetch-Control", value: "on" },
]
```

A pré-busca de DNS é habilitada globalmente para reduzir a latência de pesquisa de DNS para recursos externos.

### Geração Estática

O modelo usa um tempo limite generoso para geração de página estática:

```typescript
staticPageGenerationTimeout: 180, // 3 minutes
```

Isso acomoda páginas que buscam dados de APIs externas ou do CMS baseado em Git durante o tempo de construção.

### Configuração de ETag

```typescript
generateEtags: false,
```

ETags são desabilitados no nível Next.js porque o CDN/proxy reverso (Vercel Edge Network ou Cloudflare) lida com a validação de cache com mais eficiência.

### Cache em nível de aplicativo

O processador de análise em segundo plano pré-aquece os caches em intervalos regulares:

| Tipo de cache | Intervalo de atualização | Dados |
|---|---|---|
| Tendências de crescimento de usuários | 10 minutos | Crescimento mensal de usuários por 6, 12, 24 meses |
| Tendências de atividade | 5 minutos | Dados de atividade para janelas de 7, 14 e 30 dias |
| Classificação dos principais itens | 15 minutos | 10, 20, 50 principais itens |
| Actividade recente | 2 minutos | Últimas 10 e 20 entradas de atividades |
| Métricas de desempenho | 30 segundos | Consultar estatísticas de desempenho |
| Limpeza de cache | 1 hora | Remoção de entrada de cache expirada |

## Carregamento lento

### Carregamento lento em nível de componente

Use `next/dynamic` para componentes pesados que não são necessários na renderização inicial:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // disable SSR for client-only components
});
```

### Divisão de código em nível de rota

O Next.js App Router divide o código automaticamente por rota. Cada página em `app/[locale]/` recebe seu próprio pacote, então os usuários baixam apenas o JavaScript necessário para a página atual.

### Importações dinâmicas em trabalhos em segundo plano

O modelo usa importações dinâmicas dentro de retornos de chamada de trabalho para evitar que o webpack extraia módulos somente de servidor para o pacote do cliente:

```typescript
manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
  const { syncManager } = await import('@/lib/services/sync-service');
  await syncManager.performSync();
}, 5 * 60 * 1000);
```

## Otimização do tamanho do pacote

### Analisando o pacote

Execute o seguinte para inspecionar a composição do pacote:

```bash
ANALYZE=true pnpm build
```

Se `@next/bundle-analyzer` estiver configurado, isso produz um mapa de árvore interativo mostrando quais módulos contribuem para o tamanho do pacote.

### Técnicas comuns de otimização

| Técnica | Exemplo | Poupança |
|---|---|---|
| Otimização de arquivo barril | `optimizePackageImports` na configuração | Impede a importação de bibliotecas inteiras de ícones/UI |
| Módulos somente para servidor | `import 'server-only'` em arquivos lib | Evita agrupamento acidental de clientes |
| Importações dinâmicas | `await import('@/lib/services/...')` | Adia o carregamento até que seja necessário |
| Pacotes externos | `serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']` | Exclui do pacote webpack |

A configuração `serverExternalPackages` é particularmente importante:

```typescript
serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
```

Esses pacotes são excluídos do pacote webpack e carregados nativamente em tempo de execução, reduzindo o tempo de construção e evitando problemas de compatibilidade com módulos nativos.

## Dicas de otimização do farol

### Principais metas vitais da Web

| Métrica | Alvo | Fatores-chave |
|---|---|---|
| **LCP** (Maior pintura com conteúdo) | <2,5s | Otimização de imagem, carregamento prioritário, tempo de resposta do servidor |
| **FID** (atraso na primeira entrada) | <100ms | Divisão de código, bloqueio mínimo de thread principal |
| **CLS** (mudança cumulativa de layout) | <0,1 | Dimensões explícitas da imagem, estratégia de carregamento de fontes |
| **TTFB** (tempo até o primeiro byte) | <800ms | Cache CDN, funções de borda, otimização de consulta de banco de dados |

### Lista de verificação prática

1. **Imagens**: Use `next/image` com adereços `width` , `height` e `sizes` explícitos. Marque as imagens acima da dobra com `priority` .
2. **Fontes**: Use `next/font` para auto-hospedar fontes com `display: swap` e pré-carregar arquivos de fontes essenciais.
3. **JavaScript**: Revise `optimizePackageImports` e adicione quaisquer bibliotecas grandes que usem arquivos barril.
4. **CSS**: o modelo usa Tailwind CSS, que já foi eliminado nas compilações de produção. Evite importar módulos CSS não utilizados.
5. **Scripts de terceiros**: adie scripts não críticos usando `next/script` com `strategy="lazyOnload"` .
6. **Componentes do servidor**: O padrão é React Server Components (RSC) e use apenas `"use client"` quando a interatividade for necessária.

### Farol de corrida

O modelo inclui uma configuração `lighthouse-test.json` . Execute testes automatizados do Lighthouse:

```bash
npx lhci autorun --config=lighthouse-test.json
```

Ou use o painel Chrome DevTools Lighthouse para auditorias manuais.

## Desempenho de consulta de banco de dados

### Pool de conexões

Use o pool de conexões para evitar a abertura de uma nova conexão de banco de dados por solicitação. Consulte o [Guia de escalabilidade](/deployment/scaling) para obter detalhes de configuração.

### Otimização de consulta

- Utilize o padrão de repositório ( `lib/repositories/` ) para centralizar e otimizar consultas.
- O repositório analítico inclui camadas de cache integradas com TTL configurável.
- Monitore consultas lentas por meio do trabalho em segundo plano de métricas de desempenho.

### Estratégia de Indexação

Revise `lib/db/schema.ts` para índices existentes. Adicione índices para:
- Colunas usadas em cláusulas `WHERE` - Colunas de chave estrangeira
- Colunas usadas nas cláusulas `ORDER BY` - Índices compostos para pesquisas em várias colunas

## Monitorando o desempenho

### Integração Sentinela

O modelo integra Sentry para monitoramento de desempenho em `instrumentation.ts` :

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Os traços são amostrados em 10% na produção e 100% no desenvolvimento. Ajuste `tracesSampleRate` com base no volume de tráfego e nos limites do plano Sentry.

### Marcadores de desempenho personalizados

Use a API Web Performance para temporização personalizada:

```typescript
performance.mark('data-fetch-start');
const data = await fetchData();
performance.mark('data-fetch-end');
performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
```

## Resumo

| Área | Otimização integrada | Etapas Adicionais |
|---|---|---|
| Imagens | WebP/AVIF automático, sandbox SVG | Adicione `priority` às imagens LCP, use `sizes` |
| JavaScript | Otimização de pacotes, divisão de código | Adicionar bibliotecas a `optimizePackageImports` |
| Cache | Aquecimento de cache em segundo plano, pré-busca de DNS | Configurar regras de cache CDN |
| Banco de dados | Pool de conexões, padrão de repositório | Adicione índices, monitore consultas lentas |
| Construir | Saída independente, pacotes externos | Habilitar analisador de pacote configurável |
| Monitoramento | Rastreamentos de sentinela, trabalho de métricas de desempenho | Configurar alertas para métricas degradadas |
