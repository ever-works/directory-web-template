---
id: newsletter-endpoints
title: Server Actions do Boletim Informativo
sidebar_label: Boletim informativo
sidebar_position: 26
---

# Server Actions do Boletim Informativo

O sistema de boletim informativo usa Next.js Server Actions em vez de manipuladores de rotas de API tradicionais. Essas ações gerenciam assinaturas de e-mail, incluindo assinar, cancelar assinatura e recuperar estatísticas. Notificações por e-mail são enviadas tanto para eventos de assinatura quanto de cancelamento usando provedores de e-mail configuráveis.

## Visão geral

| Ação | Autenticação | Descrição |
|---|---|---|
| `subscribeToNewsletter` | Público | Assinar um e-mail no boletim informativo |
| `unsubscribeFromNewsletter` | Público | Cancelar assinatura de um e-mail no boletim informativo |
| `getNewsletterStatistics` | Nenhuma | Obter estatísticas de assinatura |

Esses são Server Actions definidos com `'use server'` e invocados de componentes React via envios de formulário ou chamadas diretas, não via endpoints HTTP.

## Server Actions

### Assinar no Boletim Informativo

```typescript
subscribeToNewsletter(data: { email: string })
```

Assina um endereço de e-mail no boletim informativo. Valida o e-mail usando Zod, verifica assinaturas ativas duplicadas, cria o registro no banco de dados e envia um e-mail de boas-vindas. O e-mail é automaticamente normalizado para minúsculas e sem espaços.

**Validação de entrada (Zod):**

| Campo | Tipo | Obrigatório | Restrições |
|---|---|---|---|
| `email` | string | Sim | Deve ser um formato de e-mail válido |

**Resposta de sucesso:**

```json
{
  "success": true
}
```

**Respostas de erro:**

```json
{
  "error": "Email is already subscribed to the newsletter",
  "email": "user@example.com"
}
```

| Erro | Condição |
|---|---|
| `"Please enter a valid email address"` | Formato de e-mail inválido (validação Zod) |
| `"Email is already subscribed to the newsletter"` | Assinatura ativa já existe |
| `"Failed to create subscription. Please try again."` | Falha na inserção no banco de dados |
| `"Failed to subscribe to newsletter. Please try again."` | Erro inesperado |

**Etapas de processamento:**

1. Validar e normalizar o e-mail (minúsculas, sem espaços)
2. Verificar assinatura ativa existente via `getNewsletterSubscriptionByEmail`
3. Criar registro de assinatura com fonte `"footer"` via `createNewsletterSubscription`
4. Enviar e-mail de boas-vindas usando o provedor de e-mail configurado (Resend ou Novu)

Falhas no envio de e-mail são capturadas silenciosamente e não impedem a assinatura de ser concluída.

**Origem:** `template/app/[locale]/newsletter/actions.ts`

### Cancelar Assinatura do Boletim Informativo

```typescript
unsubscribeFromNewsletter(data: { email: string })
```

Cancela a assinatura de um e-mail no boletim informativo definindo `isActive` como `false`. Envia um e-mail de confirmação de cancelamento.

**Resposta de sucesso:**

```json
{
  "success": true
}
```

**Respostas de erro:**

| Erro | Condição |
|---|---|
| `"Email is not subscribed to the newsletter"` | Nenhuma assinatura ativa encontrada |
| `"Failed to unsubscribe. Please try again."` | Falha na atualização no banco de dados |

**Origem:** `template/app/[locale]/newsletter/actions.ts`

### Obter Estatísticas do Boletim Informativo

```typescript
getNewsletterStatistics()
```

Retorna estatísticas agregadas do boletim informativo. Nenhum parâmetro de entrada necessário.

**Resposta de sucesso:**

```json
{
  "success": true,
  "data": {
    "totalActive": 1250,
    "recentSubscriptions": 45
  }
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `totalActive` | integer | Número de assinaturas ativas atualmente |
| `recentSubscriptions` | integer | Assinaturas criadas nos últimos 30 dias |

Retorna zero para ambos os campos se a consulta falhar, garantindo degradação elegante.

**Origem:** `template/app/[locale]/newsletter/actions.ts`

## Consultas ao Banco de Dados

Os dados de assinatura do boletim informativo são gerenciados por funções de consulta dedicadas em `lib/db/queries/newsletter.queries.ts`.

### Operações de Assinatura

| Função | Descrição |
|---|---|
| `createNewsletterSubscription(email, source)` | Cria um novo registro de assinatura |
| `getNewsletterSubscriptionByEmail(email)` | Busca uma assinatura por e-mail |
| `updateNewsletterSubscription(email, updates)` | Atualiza campos da assinatura |
| `unsubscribeFromNewsletter(email)` | Define `isActive: false` e registra `unsubscribedAt` |
| `resubscribeToNewsletter(email)` | Define `isActive: true` e limpa `unsubscribedAt` |
| `getNewsletterStats()` | Retorna contagem ativa e contagem de assinaturas dos últimos 30 dias |

Todas as buscas por e-mail normalizam a entrada para minúsculas e removem espaços antes de consultar.

**Origem:** `template/lib/db/queries/newsletter.queries.ts`

## Configuração

As constantes de configuração do boletim informativo são definidas em `lib/newsletter/config.ts`:

```
NEWSLETTER_CONFIG.DEFAULT_PROVIDER = "resend"
NEWSLETTER_CONFIG.DEFAULT_FROM = "onboarding@resend.dev"
NEWSLETTER_CONFIG.DEFAULT_COMPANY_NAME = "Ever Works"
```

### Fontes de Assinatura

| Fonte | Descrição |
|---|---|
| `footer` | Assinatura pelo formulário no rodapé do site |
| `popup` | Assinatura por diálogo popup |
| `signup` | Assinatura durante o registro do usuário |

### Schemas de Validação

Dois schemas Zod são exportados para validação:

- **`emailSchema`** — valida e normaliza um único campo de e-mail
- **`newsletterSubscriptionSchema`** — valida e-mail e fonte (padrão: `"footer"`)

### Provedores de E-mail

O sistema suporta dois provedores de e-mail configurados via `config.yml` e variáveis de ambiente:

| Provedor | Variável de Ambiente | Descrição |
|---|---|---|
| Resend | `RESEND_API_KEY` | Provedor de e-mail padrão |
| Novu | `NOVU_API_KEY` | Provedor alternativo com suporte a templates |

O provedor é selecionado com base no campo `mail.provider` em `config.yml`. A configuração de e-mail é construída dinamicamente a partir da configuração do app usando `createEmailConfig()`.

**Origem:** `template/lib/newsletter/config.ts`

## Detalhes de Implementação

- **Server Actions:** Esses não são endpoints REST. Eles usam o wrapper `validatedAction` de `lib/auth/middleware`, que fornece validação de schema Zod antes da ação ser executada.
- **Normalização de E-mail:** Todos os e-mails são normalizados para minúsculas e sem espaços tanto na ação quanto na consulta ao banco de dados para buscas consistentes.
- **Falhas de E-mail Tolerantes:** E-mails de boas-vindas e confirmação de cancelamento são enviados via `sendEmailSafely()`, que captura erros silenciosamente. Uma falha no envio de e-mail não impede a operação de assinatura de ser concluída.
- **Prevenção de Duplicatas:** Antes de criar uma assinatura, o sistema verifica a existência de uma assinatura ativa usando `validateExistingSubscription()`.
- **Cancelamento Suave:** O cancelamento define `isActive: false` em vez de excluir o registro, preservando o histórico de assinaturas.
