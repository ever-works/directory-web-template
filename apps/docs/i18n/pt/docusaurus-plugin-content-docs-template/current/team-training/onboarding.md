---
id: onboarding
title: Guia de Integração
sidebar_label: Integração
sidebar_position: 2
---

# Guia de Integração

Bem-vindo ao Ever Works! Este guia irá ajudá-lo a configurar seu ambiente de desenvolvimento e fazer sua primeira contribuição.

## 🎯 Objetivos

Ao final deste módulo:

- ✅ Você terá um ambiente de desenvolvimento totalmente configurado
- ✅ Você entenderá a estrutura do projeto
- ✅ Você conseguirá executar o aplicativo localmente
- ✅ Você terá feito sua primeira alteração no código
- ✅ Você entenderá o fluxo de desenvolvimento

**Tempo estimado**: 1–2 dias

---

## Passo 1: Configuração do Ambiente

### 1.1 Instalar ferramentas necessárias

Siga o [Guia de Instalação](/getting-started/installation) detalhado para instalar:

- Node.js 20.19.0+
- pnpm ([instalação](https://pnpm.io/installation))
- PostgreSQL 14+
- Git
- VS Code (recomendado)

### 1.2 Clonar o Repositório

```bash
git clone https://github.com/ever-co/ever-works.git
cd ever-works
pnpm install
```

### 1.3 Configurar Variáveis de Ambiente

**Lista de verificação rápida**:

- [ ] Conexão com banco de dados configurada
- [ ] Segredos de autenticação definidos
- [ ] Chaves do provedor de pagamento adicionadas (opcional para desenvolvimento)

---

## Passo 2: Configuração do Banco de Dados

### 2.1 Iniciar o PostgreSQL

```bash
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14
```

### 2.2 Executar Migrações

```bash
cd apps/web
pnpm exec drizzle-kit push
pnpm run db:seed
```

---

## Passo 3: Iniciar o Servidor de Desenvolvimento

```bash
pnpm run dev
```

Verifique no navegador:

- [ ] A página inicial carrega em `http://localhost:3000`
- [ ] Você consegue criar uma conta
- [ ] Você consegue fazer login/logout
- [ ] A documentação API está acessível em `http://localhost:3000/api/reference`

---

## Passo 4: Entender a Estrutura do Projeto

```
directory-web-template/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   └── messages/
│   └── web-e2e/
├── packages/
└── turbo.json
```

---

## Passo 5: Fluxo de Desenvolvimento

### 5.1 Criar uma branch de funcionalidade

```bash
git checkout main
git pull origin main
git checkout -b feature/nome-da-funcionalidade
```

### 5.2 Fazer commit e push

```bash
git add .
git commit -m "feat: adicionar sistema de notificações do usuário"
git push origin feature/nome-da-funcionalidade
```

---

## ✅ Checklist de Integração

- [ ] Ambiente de desenvolvimento totalmente configurado
- [ ] Aplicativo rodando localmente
- [ ] Banco de dados conectado e populado
- [ ] Estrutura do projeto compreendida
- [ ] Primeira branch criada
- [ ] Primeiro commit realizado

---

## Próximos Passos

1. [Documentação API](/team-training/api-documentation) – Aprenda o sistema de documentação
2. [Melhores Práticas](/team-training/best-practices) – Aprenda os padrões de codificação
3. [Exercícios](/team-training/exercises) – Pratique com tarefas reais

Precisa de ajuda? Pergunte ao seu mentor ou verifique o canal Slack da equipe! 🚀
