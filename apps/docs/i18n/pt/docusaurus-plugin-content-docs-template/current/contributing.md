---
id: contributing
title: Guia de Contribuição
sidebar_label: Contribuição
---

# Guia de Contribuição

Obrigado pelo seu interesse em contribuir com o Directory Web Template. Este guia cobre tudo o que você precisa saber para fazer contribuições significativas.

## Repositório

O código-fonte do Template está hospedado em [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

Para contribuições à Plataforma Ever Works, veja o [repositório da Plataforma](https://github.com/ever-works/ever-works) e seu guia de contribuição em [docs.ever.works](https://docs.ever.works).

## Pré-requisitos

Antes de começar, certifique-se de ter o seguinte instalado:

- **Node.js** >= 20.19.0 (LTS recomendado)
- **pnpm** >= 10.x (rigorosamente aplicado; não use npm ou yarn)
- **Git** >= 2.30
- **PostgreSQL** (para banco de dados; Supabase fornece uma opção hospedada)

### Instalando pnpm

```bash
# Usando corepack (recomendado, incluso com Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# Ou via npm (bootstrap único)
npm install -g pnpm
```

**Importante:** O repositório usa campos `packageManager` e arquivos de lock específicos para pnpm. Executar `npm install` ou `yarn install` falhará ou produzirá árvores de dependência incorretas.

## Configuração de Desenvolvimento

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# Copiar arquivo de ambiente e configurar
cp .env.example .env.local
# Edite .env.local com seus valores (veja o README para detalhes)

pnpm dev        # Servidor de dev Next.js na porta 3000
```

## Padrões de Código

### TypeScript

O Template usa TypeScript em todo lugar. Não introduza arquivos `.js` simples. Siga práticas rigorosas de TypeScript:

- Habilite e respeite as configurações do modo `strict` em `tsconfig.json`
- Prefira tipos de retorno explícitos em funções exportadas
- Use `unknown` em vez de `any` onde possível
- Valide entrada com esquemas **Zod**

### Formatação (Prettier)

A formatação é aplicada via Prettier. A configuração fica na `package.json` raiz:

```json
{
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed"
}
```

Execute o formatador antes de fazer commits:

```bash
pnpm format          # Formatar todos os arquivos
pnpm format:check    # Verificar sem modificar (amigável ao CI)
```

### Linting (ESLint)

O Template usa a configuração plana do ESLint (`eslint.config.mjs`) com plugins React, React Hooks e TypeScript:

```bash
pnpm lint
```

### Convenções de Nomenclatura

| Elemento                    | Convenção        | Exemplo                               |
| --------------------------- | ---------------- | ------------------------------------- |
| Arquivos                    | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| Classes, Interfaces, Tipos  | PascalCase       | `DirectoryService`, `UserProfile`     |
| Funções, Variáveis          | camelCase        | `getDirectoryById`, `itemCount`       |
| Constantes                  | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## Convenções de Commit

O repositório aplica [Conventional Commits](https://www.conventionalcommits.org/) via **commitlint** e hooks pre-commit do **husky**.

| Prefixo     | Uso                                                  |
| ----------- | ---------------------------------------------------- |
| `feat:`     | Novos recursos                                       |
| `fix:`      | Correções de bugs                                    |
| `docs:`     | Alterações na documentação                           |
| `refactor:` | Reestruturação de código sem mudança de comportamento |
| `test:`     | Adicionar ou atualizar testes                        |
| `chore:`    | Tarefas de manutenção, atualizações de dependências  |
| `style:`    | Alterações de formatação (sem mudança de lógica)     |
| `perf:`     | Melhorias de desempenho                              |
| `ci:`       | Alterações de configuração CI/CD                     |

Exemplo:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## Nomenclatura de Branches

Use nomes de branch descritivos com um prefixo:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## Processo de Pull Request

1. **Faça um fork** do repositório (ou crie um branch se tiver acesso de escrita).
2. **Crie um branch de feature** a partir de `main`.
3. **Faça suas alterações** seguindo os padrões de código acima.
4. **Execute verificações de qualidade** antes de fazer push (veja abaixo).
5. **Faça push** do seu branch e abra um Pull Request contra `main`.
6. **Preencha o template de PR** com uma descrição, issues relacionadas e notas de teste.
7. **Aguarde a revisão.** Um mantenedor revisará seu PR e pode solicitar alterações.
8. Após aprovação, um mantenedor fará o merge do seu PR.

### Verificações de Qualidade Antes de Enviar um PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # Verificação TypeScript
pnpm build          # Build de produção completo
```

### Testes

O Template usa **Playwright** para testes end-to-end:

```bash
pnpm test:e2e
```

Se suas alterações tocam funcionalidade existente, garanta que todos os testes relacionados passem. Se você adicionar nova funcionalidade, inclua testes para ela.

## Licença

O Directory Web Template é licenciado sob a **GNU Affero General Public License v3.0 (AGPL-3.0)**. Ao submeter uma contribuição, você concorda que seu trabalho será licenciado sob a mesma licença.

## Código de Conduta

Todos os contribuidores devem seguir o Código de Conduta do projeto. Seja respeitoso, construtivo e colaborativo.

## Obtendo Ajuda

Se você tiver dúvidas sobre contribuir:

- Abra uma [GitHub Discussion](https://github.com/ever-works/directory-web-template/discussions)
- Junte-se à [comunidade Discord](https://discord.gg/ever) para ajuda em tempo real
- Email [ever@ever.co](mailto:ever@ever.co) para consultas privadas
