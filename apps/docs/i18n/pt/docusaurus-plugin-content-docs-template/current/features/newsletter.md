---
id: newsletter
title: Sistema de newsletter
sidebar_label: Boletim informativo
sidebar_position: 5
---

# Sistema de boletim informativo

O modelo Ever Works inclui um sistema de assinatura de boletim informativo com integração de e-mail, múltiplas fontes de assinatura e estatísticas administrativas.

## Configuração

Localizado em `lib/newsletter/config.ts` , o sistema de newsletter oferece configuração centralizada:

```typescript
const NEWSLETTER_CONFIG = {
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",

  SOURCES: {
    FOOTER: "footer",       // Footer subscription form
    POPUP: "popup",         // Popup/modal subscription
    SIGNUP: "signup",       // Account registration
  },
};
```

### Configuração do provedor de e-mail

A newsletter utiliza o mesmo provedor de e-mail que o sistema de notificação:

```typescript
interface EmailConfig {
  provider: string;        // "resend" or "novu"
  defaultFrom: string;     // Sender email address
  domain: string;          // App domain
  apiKeys: {
    resend: string;        // RESEND_API_KEY
    novu: string;          // NOVU_API_KEY
  };
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}
```

A configuração é resolvida a partir da configuração do site com substitutos para variáveis ​​de ambiente:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## Gerenciamento de assinaturas

### Validação

Os endereços de e-mail são validados e normalizados usando esquemas Zod:

```typescript
import { emailSchema, newsletterSubscriptionSchema } from '@/lib/newsletter/config';

// Simple email validation
const result = emailSchema.parse({ email: "user@example.com" });

// Full subscription validation (includes source)
const subscription = newsletterSubscriptionSchema.parse({
  email: "user@example.com",
  source: "footer",
});
```

Os e-mails são automaticamente diminuídos e cortados durante a validação.

### Fontes de assinatura

Cada assinatura registra onde o usuário se inscreveu:

| Fonte | Localização | Descrição |
|--------|----------|------------|
| `footer` | Rodapé do site | Formulário de inscrição sempre visível |
| `popup` | Modal/pop-up | Solicitação de assinatura acionada |
| `signup` | Cadastro | Ativar durante a criação da conta |

### Estatísticas

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## Terminais de API

| Método | Ponto final | Descrição |
|--------|----------|------------|
| POSTAR | `/api/newsletter` | Assine a newsletter |
| EXCLUIR | `/api/newsletter` | Cancelar assinatura da newsletter |
| OBTER | `/api/newsletter/stats` | Obtenha estatísticas de assinatura (admin) |

## Mensagens de erro

O sistema fornece mensagens de erro consistentes e fáceis de usar:

| Código | Mensagem |
|------|---------|
| `INVALID_EMAIL` | Por favor insira um endereço de e-mail válido |
| `ALREADY_SUBSCRIBED` | Email já está inscrito na newsletter |
| `NOT_SUBSCRIBED` | O e-mail não está inscrito na newsletter |
| `SUBSCRIPTION_FAILED` | Falha ao criar assinatura. Por favor, tente novamente. |

## Funções utilitárias

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
