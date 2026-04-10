---
id: ci-cd
title: Pipeline CI/CD
sidebar_label: CI/CD Pipeline
sidebar_position: 3
---

# Pipeline CI/CD

O Template Ever Works inclui um pipeline CI/CD completo construído com GitHub Actions. Este guia aborda a estrutura do workflow, varredura de segurança, estratégia de proteção de branches e o fluxo de promoção de implantação.

## Visão Geral do Workflow

O pipeline consiste em seis arquivos de workflow em `.github/workflows/`:

| Workflow | Arquivo | Gatilho | Propósito |
|---|---|---|---|
| CI | `ci.yml` | Push/PR para `main`, `develop` | Lint, verificação de tipos, build |
| CodeQL | `codeql.yml` | Push/PR para `main`, `develop` + agendamento semanal | Varredura de vulnerabilidades de segurança |
| Dev Deploy | `deploy_dev.yaml` | Push para `develop` | Implantar em ambiente de prévia |
| Prod Deploy | `deploy_prod.yaml` | Push para `main` | Implantar em ambiente de produção |
| Vercel Deploy | `deploy_vercel.yaml` | Chamado pelos workflows dev/prod | Lógica de implantação Vercel compartilhada |
| Disable CodeQL | `disable-default-codeql.yml` | Somente manual | Utilitário para resolver conflitos CodeQL |

### Fluxo do Pipeline

```
Feature Branch --> PR to develop --> CI runs
                                     |
                                     v
                               Merge to develop --> Dev Deploy (preview)
                                     |
                                     v
                               PR to main --> CI runs
                                     |
                                     v
                               Merge to main --> Prod Deploy (production)
```

## Workflow CI (ci.yml)

O workflow CI é executado em cada push e pull request para `main` e `develop`. Ele valida a qualidade do código e garante que o projeto seja compilado com sucesso.

### Jobs

O workflow contém um único job `lint-and-build` executado em `ubuntu-latest`:

**Passos**:

1. **Checkout do código** -- Clona o repositório
2. **Detectar gerenciador de pacotes** -- Detecta automaticamente pnpm, yarn ou npm a partir de lockfiles
3. **Configurar pnpm** -- Instala pnpm v9 se detectado
4. **Configurar Node.js** -- Instala Node 20 com cache do gerenciador de pacotes
5. **Instalar dependências** -- Executa `pnpm install`
6. **Executar lint** -- Executa `pnpm lint` (continua com erros para PRs)
7. **Verificação de tipos** -- Executa `pnpm typecheck` ou `pnpm check:types`
8. **Criar diretórios de conteúdo** -- Cria `.content/data` para a build
9. **Compilar o projeto** -- Executa `pnpm build` com todas as variáveis de ambiente necessárias
10. **Verificar sucesso da build** -- Verifica se o diretório `.next` foi criado

### Controle de Concorrência

```yaml
concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true
```

Se um novo push ocorrer no mesmo branch enquanto o CI ainda está em execução, a execução anterior é automaticamente cancelada. Isso economiza minutos de CI e garante que apenas o commit mais recente seja validado.

### Variáveis de Ambiente

O workflow CI usa uma combinação de valores padrão fixos e secrets do GitHub:

| Variável | Fonte | Propósito |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Fixo | URL da aplicação para a build |
| `DATABASE_URL` | Secret ou padrão | Conexão com o banco de dados para a build |
| `AUTH_SECRET` | Valor fixo de CI | Assinatura de token de autenticação (não para produção) |
| `DATA_REPOSITORY` | Secret ou padrão | URL do repositório de conteúdo |
| `CONTENT_WARNINGS_SILENT` | Fixo `true` | Suprimir avisos de conteúdo no CI |
| `CI` | Fixo `true` | Indica ambiente CI |
| Secrets OAuth | Secrets GitHub | Credenciais Google, GitHub, Facebook, Twitter |
| `RESEND_API_KEY` | Secret GitHub | Serviço de email para verificações em tempo de build |

### Permissões

O workflow solicita permissões mínimas:

```yaml
permissions:
  contents: read
```

Apenas acesso de leitura ao conteúdo do repositório é necessário para o job CI.

## Análise de Segurança CodeQL (codeql.yml)

### O Que Faz

O CodeQL realiza análise semântica de código para detectar vulnerabilidades de segurança em código JavaScript/TypeScript. Ele é executado:

- Em cada push e PR para `main` e `develop`
- Semanalmente às segundas-feiras às 6:00 UTC (varredura agendada)
- Na ativação manual

### Passos de Análise

1. **Checkout** e **configuração** Node.js + pnpm
2. **Inicializar CodeQL** com a linguagem `javascript-typescript`
3. **Configurar ambiente CodeQL** via `scripts/codeql-setup.js`
4. **Instalar dependências** para o contexto de análise
5. **Autobuild** -- Detecção automática de build do CodeQL
6. **Analisar com upload** -- Carrega resultados para a guia Security do GitHub
7. **Análise de fallback** -- Se o upload falhar, análise sem upload

### Permissões

O CodeQL requer permissões mais amplas para relatório de eventos de segurança:

```yaml
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
```

### Visualizando Resultados

Após uma execução bem-sucedida com upload:
1. Vá ao seu repositório no GitHub
2. Navegue até **Security** > **Code scanning**
3. Revise os resultados, filtre por gravidade e gerencie alertas

### Resolvendo Conflitos CodeQL

Se você encontrar conflitos de processamento SARIF com a configuração CodeQL padrão do GitHub, use o workflow `disable-default-codeql.yml`:

```bash
# Trigger manually from GitHub Actions tab
# This disables the default configuration that may conflict with your custom setup
```

## Workflows de Implantação

### Mapeamento Branch-Ambiente

| Branch | Workflow | Ambiente | Domínio |
|---|---|---|---|
| `develop` | `deploy_dev.yaml` | `preview` | URL de prévia do Vercel |
| `main` | `deploy_prod.yaml` | `production` | Domínio de produção |

### Gate do Provedor de Implantação

Ambos os workflows de implantação verificam uma variável de repositório antes de prosseguir:

```yaml
jobs:
  Vercel:
    if: ${{ vars.DEPLOY_PROVIDER == 'vercel' }}
```

Defina `DEPLOY_PROVIDER=vercel` nas **Configurações > Variáveis** do seu repositório para habilitar implantações Vercel. Isso permite trocar de provedor de implantação sem modificar os arquivos de workflow.

### Implantação Vercel (deploy_vercel.yaml)

O workflow de implantação Vercel compartilhado lida com implantações de prévia e produção.

**Estratégia de Implantação**: O workflow usa uma abordagem em duas fases:

1. **Implantação via API** (primária): Aciona a implantação via API Vercel para builds mais rápidas
2. **Fallback CLI**: Se a chamada à API falhar, recorre a `vercel build` + `vercel deploy --prebuilt`

**Passos**:

1. **Checkout** do código
2. **Detectar gerenciador de pacotes** e configurar pnpm
3. **Instalar Vercel CLI** globalmente
4. **Vincular projeto Vercel** usando `VERCEL_TOKEN` e escopo de equipe opcional
5. **Definir variáveis de ambiente** (DATA_REPOSITORY, GH_TOKEN, CRON_SECRET) via Vercel CLI
6. **Extrair configurações Vercel** para o ambiente de destino
7. **Acionar implantação via API** ou recorrer ao CLI build/deploy
8. **Atualizar agendamento cron** via `scripts/update-cron.ts`

### Secrets Necessários

Configure esses nos secrets do seu repositório GitHub:

| Secret | Necessário | Propósito |
|---|---|---|
| `VERCEL_TOKEN` | Sim | Autenticação da API Vercel |
| `VERCEL_TEAM_SCOPE` | Se usando equipes | Slug da equipe Vercel |
| `DATA_REPOSITORY` | Sim | Nome do repositório de conteúdo |
| `GH_TOKEN` | Sim | Token GitHub para clonagem de conteúdo |
| `CRON_SECRET` | Recomendado | Autentica chamadas de endpoint cron |
| `DATABASE_URL` | Para a build | String de conexão com o banco de dados |
| Secrets OAuth | Se usando OAuth | Credenciais do provedor |

### Atualizações do Agendamento Cron

Após implantação bem-sucedida, o workflow executa `scripts/update-cron.ts` para sincronizar os agendamentos cron:

```yaml
- name: Update cron schedule
  if: success() && steps.trigger_deployment.outputs.deployment_id != ''
  run: npx tsx scripts/update-cron.ts
```

## Regras de Proteção de Branch

### Configurações Recomendadas para `main`

| Configuração | Valor | Propósito |
|---|---|---|
| Exigir pull request | Sim | Sem pushes diretos para produção |
| Revisões necessárias | 1+ | Revisão de código antes do merge |
| Exigir verificações de status | CI (lint-and-build) | CI deve passar antes do merge |
| Exigir CodeQL | Análise CodeQL | Varredura de segurança deve passar |
| Exigir branches atualizados | Sim | PR deve ser rebaseado no main mais recente |
| Incluir administradores | Sim | Regras se aplicam a todos |

### Configurações Recomendadas para `develop`

| Configuração | Valor | Propósito |
|---|---|---|
| Exigir pull request | Opcional | Pushes diretos permitidos para iteração rápida |
| Verificações de status necessárias | CI (lint-and-build) | Gate de qualidade básico |
| Exigir branches atualizados | Não | Permite iteração mais rápida |

### Configurando Proteção de Branch

1. Vá para **Configurações** > **Branches** do repositório
2. Clique em **Adicionar regra de proteção de branch**
3. Insira o padrão de nome do branch (ex. `main`)
4. Configure as configurações nas tabelas acima
5. Salvar alterações

## Fluxo de Promoção

O template segue um fluxo de promoção padrão:

### Ciclo de Desenvolvimento

```
1. Create feature branch from develop
2. Implement changes
3. Open PR to develop
4. CI validates (lint, type check, build)
5. CodeQL scans for vulnerabilities
6. Code review and approval
7. Merge to develop --> automatic preview deployment
```

### Lançamento para Produção

```
1. Open PR from develop to main
2. CI validates against main
3. CodeQL security scan
4. Final code review
5. Merge to main --> automatic production deployment
```

### Processo de Hotfix

```
1. Create hotfix branch from main
2. Implement fix
3. Open PR directly to main
4. CI + CodeQL validation
5. Emergency review and merge
6. Backport to develop
```

## Personalização

### Adicionando Novos Passos CI

Para adicionar testes ou validação adicional, adicione passos ao job `ci.yml`:

```yaml
- name: Run unit tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test

- name: Run E2E tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test:e2e
```

### Adicionando Notificações de Implantação

Adicione um passo de notificação no final do workflow de implantação:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text": "Deployed to ${{ inputs.environment }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Variáveis Específicas do Ambiente

Use **Ambientes** do GitHub para delimitar secrets a targets de implantação específicos:

1. Vá para **Configurações** > **Ambientes**
2. Crie os ambientes `production` e `preview`
3. Adicione secrets específicos do ambiente
4. Referencie-os nos workflows com a configuração `environment:`
