---
id: test-data
title: Dados de Teste & Fixtures
sidebar_label: Dados de Teste
sidebar_position: 6
---

# Dados de Teste & Fixtures

O template Ever Works fornece vários mecanismos para gerar e gerenciar dados de teste em contextos de desenvolvimento, seeding e testes E2E. Esta página cobre dados fictícios, seeds de banco de dados, fixtures E2E e estratégias para manter a consistência de dados.

## Dados de Teste E2E (`e2e/helpers/test-data.ts`)

O conjunto de testes E2E define seus dados de teste através de um módulo helper centralizado:

```typescript
export const TEST_DATA = {
  get ADMIN_EMAIL()    { return requireEnv('SEED_ADMIN_EMAIL'); },
  get ADMIN_PASSWORD() { return requireEnv('SEED_ADMIN_PASSWORD'); },
  CLIENT_PASSWORD: 'TestClient123!',
  generateClientEmail: () =>
    `e2e-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
  generateItemName: () =>
    `E2E Test Item ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  generateItemUrl: () =>
    `https://e2e-test-${Date.now()}.example.com`,
};
```

### Decisões de Design Principais

- **Credenciais de admin via env** -- E-mail e senha do admin são lidos das variáveis de ambiente `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`, garantindo que os testes usem as mesmas credenciais do usuário admin semeado.
- **Dados únicos de cliente** -- E-mails de cliente e nomes de itens incluem timestamps e sufixos aleatórios para evitar colisões em execuções paralelas de testes.
- **Avaliação lazy** -- Credenciais de admin usam funções getter que lançam imediatamente se variáveis de ambiente estiverem faltando, capturando erros de configuração cedo.

### Registro de Rotas Públicas

O módulo de dados de teste também define todas as rotas públicas para testes de navegação:

```typescript
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/discover/1', name: 'Discover Page 1' },
  { path: '/categories', name: 'Categories' },
  { path: '/tags', name: 'Tags' },
  { path: '/collections', name: 'Collections' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/about', name: 'About' },
  { path: '/help', name: 'Help' },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/terms-of-service', name: 'Terms of Service' },
  { path: '/cookies', name: 'Cookies' },
  { path: '/auth/signin', name: 'Sign In' },
  { path: '/auth/register', name: 'Register' },
];
```

## Fixtures de Estado de Autenticação E2E

O estado de autenticação é gerenciado através de arquivos de estado de armazenamento do Playwright:

```
e2e/auth-states/
  admin.json    # Sessão de admin serializada (cookies, localStorage)
  client.json   # Sessão de cliente serializada
```

Esses arquivos são gerados durante `global-setup.ts` ao fazer login programaticamente com credenciais de admin e cliente. O fixture de autenticação (`e2e/fixtures/auth.fixture.ts`) fornece contextos de browser pré-autenticados:

- `adminContext` / `adminPage` -- Contexto de browser com sessão admin carregada
- `clientContext` / `clientPage` -- Contexto de browser com sessão cliente carregada

Arquivos de teste importam o objeto `test` personalizado em vez do padrão do Playwright:

```typescript
import { test, expect } from '@/e2e/fixtures';

test('admin can view dashboard', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading')).toContainText('Dashboard');
});
```

## Seeding do Banco de Dados

### Script de Seed (`lib/db/seed.ts`)

O script de seed do banco de dados é executado via `pnpm db:seed` e popula o banco de dados com dados iniciais necessários para o funcionamento do aplicativo:

- **Usuário admin** -- Criado a partir das variáveis de ambiente `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`
- **Usuários fictícios** -- Gerados com base em `SEED_FAKE_USER_COUNT` (padrão: 10)
- **Dados de demonstração** -- Quando `NEXT_PUBLIC_DEMO=true`, dados de demonstração abrangentes são semeados para todos os recursos

O script de seed é idempotente -- ele verifica dados existentes antes de inserir para evitar duplicatas em re-execuções.

### Modo Demo

Quando `NEXT_PUBLIC_DEMO=true`, o script de seed gera:

- Múltiplos usuários com papéis e perfis variados
- Itens de exemplo em diferentes categorias e status
- Comentários, votos e dados de engajamento
- Submissões de anúncios patrocinados em vários estados
- Definições de pesquisa com respostas de exemplo

## Estratégias de Consistência de Dados

### Isolamento Entre Execuções de Teste

Os testes E2E usam várias estratégias para evitar interferência de dados:

1. **Identificadores únicos** -- Todos os dados de teste gerados incluem timestamps para evitar colisões de nomes
2. **Limpeza por teste** -- Testes que criam dados devem limpar após si mesmos
3. **Contextos de autenticação separados** -- Testes de admin e cliente são executados em contextos de browser isolados
4. **Setup/teardown global** -- `global-setup.ts` prepara o estado de autenticação, `global-teardown.ts` cuida da limpeza

### Desenvolvimento vs Testes vs Produção

| Preocupação | Desenvolvimento | Testes (E2E) | Produção |
|-------------|----------------|--------------|----------|
| Banco de dados | SQLite (`file:./dev.db`) ou Postgres | Igual ao dev (servidor reutilizado) | Postgres |
| Conteúdo | Clonado de `DATA_REPOSITORY` | Conteúdo pré-existente do dev | CMS baseado em Git |
| Usuários | Admin semeado + usuários fictícios | Igual ao dev + usuários gerados pelo E2E | Usuários reais |
| Dados de demo | Quando `NEXT_PUBLIC_DEMO=true` | Depende dos dados de demo semeados | `NEXT_PUBLIC_DEMO=false` |

### Melhores Práticas

1. **Sempre semeie antes de testar** -- Execute `pnpm db:seed` antes dos testes E2E para garantir que o usuário admin exista
2. **Use geradores de dados únicos** -- Nunca fixe nomes de itens ou e-mails nos testes
3. **Verifique variáveis de ambiente** -- O helper `requireEnv()` fornece mensagens de erro claras quando variáveis obrigatórias estão faltando
4. **Mantenha fixtures mínimos** -- Arquivos de estado de autenticação contêm apenas os cookies e entradas de armazenamento necessários
5. **Evite dependências entre testes** -- Cada arquivo de spec deve ser executável independentemente

## Variáveis de Ambiente para Testes

```bash
# Obrigatórias para testes E2E
SEED_ADMIN_EMAIL=admin@changeme.com
SEED_ADMIN_PASSWORD=changeme_password

# Opcionais
BASE_URL=http://localhost:3000
SEED_FAKE_USER_COUNT=10
NEXT_PUBLIC_DEMO=true
```

## Arquivos Relacionados

- `e2e/helpers/test-data.ts` -- Geradores de dados de teste e constantes
- `e2e/fixtures/auth.fixture.ts` -- Fixtures de autenticação para o Playwright
- `e2e/global-setup.ts` -- Configuração de autenticação pré-teste
- `e2e/global-teardown.ts` -- Limpeza pós-teste
- `lib/db/seed.ts` -- Script de seeding do banco de dados
- `.env.example` -- Referência completa de variáveis de ambiente
