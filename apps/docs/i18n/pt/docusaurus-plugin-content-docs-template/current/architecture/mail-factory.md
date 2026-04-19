---
id: mail-factory
title: Fábrica de correio
sidebar_label: Fábrica de correio
sidebar_position: 33
---

# Fábrica de correio

O modelo usa um padrão de fábrica para entrega de e-mail, suportando vários provedores (Reenviar, Novu) com um substituto automático para um provedor simulado durante o desenvolvimento ou quando faltam credenciais.

## Estrutura de arquivo

```
lib/mail/
  index.ts                    # EmailService class, exported helper functions
  factory.ts                  # EmailProviderFactory - provider selection logic
  mock.ts                     # MockEmailProvider - logs to console
  resend.ts                   # ResendProvider - Resend API integration
  novu.ts                     # NovuProvider - Novu notification integration
  templates/
    index.ts                  # Re-exports all templates
    account-created.ts        # Account creation email
    admin-notification.ts     # Admin notification emails
    email-verification.ts     # Email verification link
    newsletter-welcome.ts     # Newsletter welcome email
    newsletter-unsubscribe.ts # Newsletter unsubscribe confirmation
    newsletter-regular.ts     # Regular newsletter dispatch
    password-change-confirmation.ts  # Password change confirmation
    payment-success.ts        # Payment success notification
    payment-failed.ts         # Payment failure notification
    submission-decision.ts    # Item submission approval/rejection
    subscription-events.ts    # Subscription lifecycle events
    subscription-expired.ts   # Subscription expiration notice
    subscription-renewal-reminder.ts # Renewal reminder
```

## Interface do provedor

Todo provedor de e-mail implementa a interface `EmailProvider`:

```ts
export interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<any>;
  getName(): string;
}
```

## Padrão de fábrica (`factory.ts`)

O `EmailProviderFactory` seleciona o provedor apropriado com base na configuração. Se a chave de API do provedor especificado estiver ausente ou vazia, ela retornará ao provedor simulado:

```ts
export class EmailProviderFactory {
  static createProvider(config: EmailServiceConfig): EmailProvider {
    const provider = config.provider.toLowerCase();

    switch (provider) {
      case "resend":
        if (!config.apiKeys.resend || config.apiKeys.resend.trim() === '') {
          console.warn('Resend API key is missing. Using mock email provider.');
          return new MockEmailProvider();
        }
        return new ResendProvider(config.apiKeys.resend, config.defaultFrom);

      case "novu":
        if (!config.apiKeys.novu || config.apiKeys.novu.trim() === '') {
          console.warn('Novu API key is missing. Using mock email provider.');
          return new MockEmailProvider();
        }
        return new NovuProvider(config.apiKeys.novu, config.defaultFrom, config.novu);

      default:
        console.warn(`Unknown email provider. Using mock email provider.`);
        return new MockEmailProvider();
    }
  }
}
```

## Implementações de provedor

### Provedor de e-mail simulado

Registra e-mails no console. Usado durante o desenvolvimento ou quando nenhuma chave de API está configurada:

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string { return "mock"; }
}
```

### ReenviarProvedor

Envia e-mails por meio da API Reenviar:

```ts
export class ResendProvider implements EmailProvider {
  private resend: Resend;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.resend = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async sendEmail(message: EmailMessage): Promise<CreateEmailResponse> {
    return this.resend.emails.send({
      from: message.from || this.defaultFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
```

### NovuProvider

Envia e-mails através da infraestrutura de notificação do Novu usando gatilhos de fluxo de trabalho:

```ts
export class NovuProvider implements EmailProvider {
  private novu: Novu;
  private defaultFrom: string;
  private templateId: string;

  constructor(apiKey: string, defaultFrom: string, config?: EmailNovuConfig) {
    this.novu = new Novu({
      secretKey: apiKey,
      serverURL: config?.backendUrl,
    });
    this.defaultFrom = defaultFrom;
    this.templateId = config?.templateId || "email-default";
  }

  async sendEmail(message: EmailMessage) {
    const email = Array.isArray(message.to) ? message.to[0] : message.to;
    return this.novu.trigger({
      to: { subscriberId: email, email },
      workflowId: this.templateId,
      payload: {
        subject: message.subject,
        body: message.html,
        preheader: message.text,
        from: message.from || this.defaultFrom,
      },
    });
  }
}
```

## Classe EmailService

A classe `EmailService` envolve o provedor criado de fábrica e fornece métodos de e-mail específicos do domínio. Ele inclui uma verificação de disponibilidade para que o aplicativo possa ser degradado normalmente quando o email não estiver configurado:

```ts
export class EmailService {
  private provider: EmailProvider | null = null;
  private isAvailable: boolean = false;

  constructor(config: EmailServiceConfig) {
    const hasApiKey = Object.values(config.apiKeys).some(
      key => key && key.trim() !== ''
    );
    if (hasApiKey) {
      this.provider = EmailProviderFactory.createProvider(config);
      this.isAvailable = true;
    }
  }

  public isServiceAvailable(): boolean {
    return this.isAvailable && this.provider !== null;
  }

  // Domain-specific methods
  async sendVerificationEmail(email: string, token: string): Promise<any>
  async sendPasswordResetEmail(email: string, token: string): Promise<any>
  async sendTwoFactorTokenEmail(email: string, token: string): Promise<any>
  async sendPasswordChangeConfirmationEmail(email: string, ...): Promise<any>
  async sendAccountCreatedEmail(userName: string, email: string, ...): Promise<any>
  async sendNewsletterSubscriptionEmail(email: string): Promise<any>
  async sendNewsletterUnsubscriptionEmail(email: string): Promise<any>
  async sendCustomEmail(message: EmailMessage): Promise<any>
}
```

## Funções auxiliares exportadas

O módulo exporta funções de nível superior que tratam automaticamente da criação de serviços e do gerenciamento de erros. Estas são as formas recomendadas de enviar e-mails através do aplicativo:

```ts
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTwoFactorTokenEmail,
  sendPasswordChangeConfirmationEmail,
  sendAccountCreatedEmail,
  sendNewsletterSubscriptionEmail,
  sendNewsletterUnsubscriptionEmail,
} from '@/lib/mail';

// Each function handles service unavailability gracefully
const result = await sendVerificationEmail('user@example.com', verificationToken);

// Returns either the provider result or a skipped result
if ('skipped' in result) {
  console.log(result.reason); // "Email service not configured"
}
```

O wrapper `tryEmailOperation` captura erros de disponibilidade e retorna um resultado estruturado em vez de lançar:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## Configuração

A configuração do serviço é montada a partir da configuração de conteúdo e das variáveis de ambiente do aplicativo:

```ts
export interface EmailServiceConfig {
  provider: string;         // "resend" | "novu"
  defaultFrom: string;      // e.g., "info@ever.works"
  apiKeys: Record<string, string>;
  domain: string;           // App URL for link generation
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}
```

Fontes de configuração (em ordem de prioridade):

1. **Configuração de conteúdo** (`config.mail.provider`, `config.mail.default_from`) - do CMS baseado em Git
2. **Variáveis de ambiente** (`EMAIL_PROVIDER`, `EMAIL_FROM`) - do serviço de configuração
3. **Padrões de fallback** - Provedor de reenvio, `info@ever.works`

## Modelos de e-mail

Todos os modelos são exportados de `lib/mail/templates/index.ts`:

|Modelo|Função|Objetivo|
|----------|----------|---------|
|Conta criada|`getAccountCreatedTemplate`|E-mail de boas-vindas após o registro|
|Verificação de e-mail|`getEmailVerificationTemplate`|E-mail do link de verificação|
|Alteração de senha|`getPasswordChangeConfirmationTemplate`|Confirma que a senha foi alterada|
|Sucesso no pagamento|`getPaymentSuccessTemplate`|Recibo de pagamento|
|Falha no pagamento|`getPaymentFailedTemplate`|Notificação de falha de pagamento|
|Eventos de assinatura|`getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate`|Ciclo de vida da assinatura|
|Lembrete de renovação|`getRenewalReminderTemplate`|Próximo aviso de renovação|
|Boas-vindas ao boletim informativo|`getWelcomeEmailTemplate`|Confirmação de inscrição na newsletter|
|Cancelar assinatura do boletim informativo|`getUnsubscribeEmailTemplate`|Confirmação de cancelamento de inscrição|
|Boletim Informativo Regular|`getRegularNewsletterTemplate`|Envio de conteúdo de newsletter|

## Variáveis de ambiente

|Variável|Obrigatório|Descrição|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|Não|Nome do provedor: `resend` ou `novu` (padrão: `resend`)|
|`EMAIL_FROM`|Não|Endereço do remetente padrão|
|`RESEND_API_KEY`|Para reenviar|Reenviar chave de API|
|`NOVU_API_KEY`|Para Novu|Chave de API Novu|
|`NOVU_TEMPLATE_ID`|Não|ID do fluxo de trabalho Novu (padrão: `email-default`)|
|`NOVU_BACKEND_URL`|Não|URL de back-end personalizado do Novu|

## Arquivos relacionados

- `lib/mail/factory.ts` - Fábrica do provedor
- `lib/mail/index.ts` - EmailService e funções exportadas
- `lib/mail/templates/` - Todos os geradores de modelos de e-mail
- `lib/newsletter/` - Utilitários de e-mail específicos para boletins informativos
