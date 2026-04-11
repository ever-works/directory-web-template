---
id: changelog
title: Changelog & Versionamento
sidebar_label: Changelog
---

# Changelog & Versionamento

Esta página explica como o Directory Web Template gerencia o versionamento, lançamentos e caminhos de atualização.

## Versionamento Semântico

O Template segue o [Semantic Versioning (SemVer)](https://semver.org/). Os números de versão usam o formato **MAJOR.MINOR.PATCH**:

| Componente | Quando incrementar                                             |
| ---------- | -------------------------------------------------------------- |
| **MAJOR**  | Mudanças incompatíveis que requerem etapas de migração         |
| **MINOR**  | Novas funcionalidades adicionadas de forma retrocompatível     |
| **PATCH**  | Correções de bugs retrocompatíveis e melhorias menores         |

Versões pré-lançamento podem usar sufixos como `-alpha.1`, `-beta.2` ou `-rc.1` para testes antecipados.

## Migrações de Banco de Dados

O Template usa **Drizzle ORM** com PostgreSQL. As alterações no esquema do banco de dados são gerenciadas por meio do Drizzle Kit:

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio for visual database management
pnpm db:studio
```

Os arquivos de migração são armazenados no diretório `lib/db/migrations/`. Cada migração é um arquivo SQL gerado a partir de alterações nas definições de esquema Drizzle em `lib/db/schema/`.

## Atualizando o Template

Ao atualizar para uma versão mais recente:

```bash
cd directory-web-template

# Pull latest changes
git pull origin main

# Install updated dependencies
pnpm install

# Apply database migrations
pnpm db:migrate

# Verify build
pnpm build
```

### Lidando com Conflitos Durante Atualizações

Se você personalizou o Template, pode encontrar conflitos de merge ao puxar atualizações. A abordagem recomendada:

1. **Mantenha as personalizações em arquivos separados** quando possível (componentes personalizados, novas rotas, serviços adicionais).
2. **Use o CMS baseado em Git** para alterações de conteúdo em vez de modificar arquivos principais.
3. **Revise as notas de lançamento** antes de atualizar para entender quais arquivos foram alterados.
4. **Teste minuciosamente** após resolver conflitos executando `pnpm lint`, `pnpm tsc --noEmit` e `pnpm build`.

## Acompanhando Lançamentos

### GitHub Releases

Os lançamentos são publicados no GitHub em [github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases).

Cada lançamento inclui:

- Uma tag de versão (ex.: `v0.1.0`)
- Notas de lançamento descrevendo alterações, novas funcionalidades, correções de bugs e breaking changes
- Links para pull requests e issues relevantes

### Histórico de Commits

O repositório usa [Conventional Commits](https://www.conventionalcommits.org/), facilitando a varredura do histórico de commits em busca de alterações:

```bash
# View recent commits with conventional commit prefixes
git log --oneline --since="2025-01-01"

# Filter for feature commits only
git log --oneline --grep="^feat:"

# Filter for breaking changes
git log --oneline --grep="BREAKING CHANGE"
```

## Política de Breaking Changes

As breaking changes são levadas a sério. O projeto segue estes princípios:

1. **Aviso prévio.** As breaking changes são anunciadas pelo menos um lançamento minor antes de entrarem em vigor, quando possível.
2. **Guias de migração.** Cada breaking change inclui um guia de migração nas notas de lançamento.
3. **Minimizar interrupções.** As breaking changes são agrupadas em lançamentos major em vez de distribuídas por vários lançamentos minor.
4. **Compatibilidade retroativa do banco de dados.** As migrações são projetadas para ser não destrutivas. Adições de colunas e criações de tabelas são preferidas em relação a remoções ou renomeações.

### Exemplos de Breaking Changes

- Remoção ou renomeação de um endpoint de API público
- Alteração da estrutura dos corpos de requisição ou resposta da API
- Remoção ou renomeação de colunas ou tabelas do banco de dados
- Alteração de variáveis de ambiente obrigatórias
- Abandono do suporte a uma versão do Node.js
- Alteração do comportamento de autenticação ou autorização
- Remoção ou renomeação de tipos ou interfaces TypeScript exportados

### Exemplos de Alterações Não-Breaking

- Adição de novos endpoints de API
- Adição de novos campos opcionais aos corpos de requisição ou resposta
- Adição de novas colunas no banco de dados com valores padrão
- Adição de novas variáveis de ambiente com padrões razoáveis
- Adição de novas funcionalidades ou integrações
- Melhorias de desempenho
- Correções de bugs

## Formato do Changelog

As notas de lançamento seguem esta estrutura:

```markdown
## [0.2.0] - 2025-04-15

### Added

- Category-based directory filtering
- New Polar payment provider integration

### Changed

- Improved authentication flow with better error messages

### Fixed

- Resolved race condition in concurrent directory updates
- Fixed pagination offset calculation for search results

### Deprecated

- Legacy REST endpoints under /api/v1/ (use /api/v2/ instead)

### Breaking Changes

- Removed `LEGACY_AUTH_MODE` environment variable
- Renamed `DirectoryItem` type to `Item` across all APIs
```

Este formato segue as convenções do [Keep a Changelog](https://keepachangelog.com/).
