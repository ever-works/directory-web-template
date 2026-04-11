---
id: troubleshooting
title: Guia de solução de problemas
sidebar_label: Solução de problemas
sidebar_position: 7
---

# Guia de solução de problemas

Este guia aborda erros comuns, técnicas de depuração, interpretação de log e problemas ambientais para o modelo Ever Works. Os problemas são organizados por categoria com sintomas, causas e soluções.

## Problemas de compilação

### Módulo não encontrado durante a compilação

**Sintomas**: A compilação falha com `Module not found: Can't resolve 'postgres'` ou erros semelhantes de módulo nativo do Node.js.

**Causa**: o Webpack tenta agrupar módulos somente de servidor para o pacote do cliente.

**Solução**: Verifique se o módulo está listado em `serverExternalPackages` em `next.config.ts` :

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

Se você adicionou uma nova dependência somente de servidor, adicione-a a esta matriz.

### Tempo limite de geração de página estática

**Sintomas**: A compilação falha com `Error: Timeout of 180000ms exceeded` durante a geração estática.

**Causa**: as páginas que buscam dados externos durante o tempo de compilação excedem o tempo limite.

**Solução**: o modelo define um tempo limite de 3 minutos:

```typescript
staticPageGenerationTimeout: 180,
```

Para páginas que precisam de mais tempo, aumente esse valor. Alternativamente, mude páginas lentas para renderização dinâmica:

```typescript
export const dynamic = 'force-dynamic';
```

### Diretório de conteúdo ausente durante a construção

**Sintomas**: A compilação falha porque `.content/data` não existe.

**Causa**: o conteúdo do CMS baseado em Git não foi clonado. O script `scripts/clone.cjs` é executado durante os ganchos `predev` e `prebuild` .

**Solução**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### Avisos de Webpack de Supabase, bcryptjs, postgres, stripe

**Sintomas**: A compilação produz avisos sobre esses pacotes, mas é concluída com êxito.

**Causa**: avisos conhecidos de pacotes que fazem referência a APIs Node.js não disponíveis no navegador.

**Solução**: Estes já estão suprimidos em `next.config.ts` :

```typescript
config.ignoreWarnings = [
	{ module: /@supabase\/realtime-js/ },
	{ module: /@supabase\/supabase-js/ },
	{ module: /bcryptjs/ },
	{ message: /bcryptjs/ },
	{ module: /postgres/ },
	{ module: /stripe/ }
];
```

Nenhuma ação necessária – os avisos não afetam a saída do build.

### Pilha de JavaScript sem memória

**Sintomas**: O build trava com `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` .

**Solução**: os scripts de compilação já alocam 8 GB:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

Se a compilação ainda ficar sem memória, verifique:

- Geração excessiva de páginas estáticas (reduz páginas construídas em tempo de construção)
- Dependências grandes não abaladas adequadamente
- Vazamentos de memória em scripts em tempo de construção

## Problemas de banco de dados

### Conexão recusada ao PostgreSQL

**Sintomas**: O aplicativo falha com `connection refused` , `ECONNREFUSED` ou `connect ETIMEDOUT` .

**Etapas de diagnóstico**:

1. Verifique `DATABASE_URL` em `.env.local` :
    ```bash
    node -e "require('dotenv').config({caminho:'.env.local'}); console.log(process.env.DATABASE_URL? 'Definir': 'ausente')"
    ```
2. Teste a conexão diretamente: `psql $DATABASE_URL -c "SELECT 1"` 3. Verifique se o PostgreSQL está em execução: `pg_isready` **Causas comuns e soluções**:

| Causa | Correção |
| ---------------------- | ---------------------------------------------------------- |
| PostgreSQL não está funcionando | Inicie o serviço |
| Porta errada | Verifique a porta na sua string de conexão |
| Banco de dados ausente | `createdb your_database_name` |
| Falha de autenticação | Verifique o nome de usuário/senha em `DATABASE_URL` |
| SSL necessário | Adicione `?sslmode=require` à cadeia de conexão |

### Falha na migração

**Sintomas**: `pnpm db:migrate` falha com erros de esquema ou SQL.

**Solução**: use a ferramenta de migração CLI detalhada para depuração:

```bash
pnpm db:migrate:cli
```

Isso mostra:

1. Estado atual da migração (lista de migrações aplicadas)
2. Saída detalhada da execução da migração
3. Verificação de esquema após migração

Se as migrações estiverem corrompidas, verifique a tabela de rastreamento do Drizzle:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### Falha na inicialização do banco de dados na instrumentação

**Sintomas**: O console mostra `[Instrumentation] Database initialization failed` na inicialização.

**Causa**: O gancho `instrumentation.ts` executa a migração e a propagação na inicialização. A falha indica um problema de conectividade ou esquema do banco de dados.

**Comportamento por ambiente**:

| Meio Ambiente | Em caso de falha |
| ----------- | -------------------------------------- |
| Produção | Gera erro, a implantação atende 503 |
| Desenvolvimento | Aviso de registros, aplicativo é iniciado para depuração |
| Visualização | Aviso de registros, aplicativo é iniciado para depuração |

De `instrumentation.ts` :

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### Semente presa no estado "semeando"

**Sintomas**: O aplicativo registra `[DB Init] Another instance is seeding` repetidamente.

**Causa**: uma operação de propagação anterior falhou sem atualizar o status.

**Solução**: o código de inicialização lida automaticamente com sementes obsoletas após 5 minutos:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

Para resolver imediatamente, atualize manualmente o status da semente:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

Em seguida, reinicie o aplicativo.

## Problemas de autenticação

### AUTH_SECRET não definido

**Sintomas**: O aplicativo trava com `AUTH_SECRET is not set` ou erros de sessão.

**Solução**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### Incompatibilidade de URL de retorno de chamada OAuth

**Sintomas**: O login do OAuth redireciona para uma página de erro com `redirect_uri_mismatch` .

**Solução**: o URL de retorno de chamada no console do provedor OAuth deve corresponder exatamente a:

| Provedor | URL de retorno de chamada |
| -------- | --------------------------------------------------- |
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

Para desenvolvimento local, use `http://localhost:3000/api/auth/callback/<provider>` .

### Provedores OAuth não aparecem

**Sintomas**: Apenas as credenciais de login são mostradas, os botões OAuth estão faltando.

**Causa**: os provedores OAuth voltam para desabilitados se a configuração falhar. De `auth.config.ts` :

```typescript
} catch (error) {
  // Fallback to credentials only
  return createNextAuthProviders({
    credentials: { enabled: true },
    google: { enabled: false },
    github: { enabled: false },
    facebook: { enabled: false },
    twitter: { enabled: false },
  });
}
```

**Solução**: Verifique se `CLIENT_ID` e `CLIENT_SECRET` estão definidos para cada provedor. O script de verificação de ambiente valida pares OAuth:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### Sessões expirando inesperadamente

**Causas comuns**:

| Causa | Solução |
| ---------------------- | ---------------------------------------------------- |
| `AUTH_SECRET` alterado | Alterar o segredo invalida todas as sessões |
| Incompatibilidade de domínio de cookie | Defina `COOKIE_DOMAIN` para corresponder ao seu domínio de implantação |
| Incompatibilidade de HTTPS | Defina `COOKIE_SECURE=false` para desenvolvimento HTTP local |

## Problemas de implantação

### A compilação do Vercel falha, mas a compilação local é bem-sucedida

**Lista de verificação**:

1. Todas as variáveis de ambiente necessárias definidas no painel do Vercel
2. `DATABASE_URL` acessível na rede Vercel
3. Compatível com versão Node.js (requer 20.19.0 ou superior)
4. O diretório de conteúdo existe (CI cria `.content/data` automaticamente)
5. Alocação de memória suficiente

### Vercel cron jobs não estão em execução

**Sintomas**: Os endpoints programados em `vercel.json` não são executados.

**Etapas de diagnóstico**:

1. Verifique se `vercel.json` está na raiz do projeto com os caminhos corretos:
    ```json
    { "caminho": "/api/cron/sync", "programação": "0 3 * * *" }
    ```
2. Confirme se o plano Vercel suporta cron (Pro ou Enterprise)
3. Verifique o Vercel Dashboard na guia Cron Jobs para logs de execução
4. Teste o endpoint manualmente: `curl https://yourdomain.com/api/cron/sync` ### A migração em tempo de compilação falha no Vercel

**Sintomas**: O log de compilação mostra `[Build Migration] Migration error` .

**Comportamento**: O script `scripts/build-migrate.ts` lida com diferentes cenários:

- **Produção**: todas as falhas causam falha na compilação
- **Visualização com erro de conexão**: a compilação continua com um aviso
- **Visualização com erro de autenticação**: falha na compilação (configuração incorreta)

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

Para ignorar totalmente as migrações em tempo de construção:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## Problemas de internacionalização

### Chaves de tradução mostradas em vez de texto

**Sintomas**: As páginas exibem `common.WELCOME` em vez de "Bem-vindo".

**Solução**:

1. Verifique se o arquivo de tradução existe: `messages/<locale>.json` 2. Verifique se o caminho da chave corresponde ao namespace usado em `useTranslations` 3. O sistema substituto usa `deepmerge` para mesclar mensagens de localidade com padrões em inglês:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Se uma chave estiver faltando no arquivo de localidade, o substituto em inglês deverá fornecê-la.

### O roteamento local retorna 404

**Sintomas**: URLs como `/fr/discover` retornam uma página 404.

**Solução**: Verifique se a localidade está no array `LOCALES` em `lib/constants.ts` :

```typescript
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
```

E verifique a configuração de roteamento em `i18n/routing.ts` :

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## Interpretação de registro

### Prefixos de registro

| Prefixo | Fonte | Localização |
| ------------------- | ----------------------------------- | -------------------------- |
| `[Instrumentation]` | Inicialização do aplicativo (DB init, Sentry) | `instrumentation.ts` |
| `[Migration]` | Execução de migração de banco de dados | `lib/db/migrate.ts` |
| `[DB Init]` | Inicialização e propagação do banco de dados | `lib/db/initialize.ts` |
| `[Build Migration]` | Script de migração em tempo de construção | `scripts/build-migrate.ts` |
| `[Layout]` | Erros de busca de dados de layout raiz | `app/[locale]/layout.tsx` |

### Tags de erro de sentinela

Erros de sentinela da instrumentação incluem estas tags para filtragem:

| Etiqueta | Valores |
| ------------- | ----------------------------------------- |
| `component` | `instrumentation` |
| `phase` | `database_init` |
| `environment` | `production` , `preview` ou `development` |

## Comandos de diagnóstico

| Tarefa | Comando |
| ------------------------ | ----------------------------------- |
| Verifique os erros do TypeScript | `pnpm tsc --noEmit` |
| Execute linter | `pnpm lint` |
| Validar ambiente | `node scripts/check-env.js` |
| Verificação rápida do ambiente | `node scripts/check-env.js --quick` |
| Testar conexão com banco de dados | `pnpm db:studio` |
| Ver estado da migração | `pnpm db:migrate:cli` |
| Gerar novas migrações | `pnpm db:generate` |
| Aplicar migrações pendentes | `pnpm db:migrate` |
| Banco de dados de sementes | `pnpm db:seed` |
| Limpe o cache de compilação | `rm -rf .next` |
| Reconstrução completa | `rm -rf .next && pnpm build` |
| Redefinir banco de dados | `node scripts/clean-database.js` |

## Obtendo ajuda

1. Pesquise [Problemas do GitHub](https://github.com/ever-works/directory-web-template/issues)
2. Revise o arquivo `CLAUDE.md` para obter diretrizes de desenvolvimento assistido por IA
3. Verifique o painel do Sentry para obter detalhes do erro (se configurado)
4. Para questões de segurança, envie um e-mail para security@ever.co em particular
