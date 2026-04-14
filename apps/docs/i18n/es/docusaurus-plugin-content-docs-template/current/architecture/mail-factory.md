---
id: mail-factory
title: Fábrica de correo
sidebar_label: Fábrica de correo
sidebar_position: 33
---

# Fábrica de correo

La plantilla utiliza un patrón de fábrica para la entrega de correo electrónico, admitiendo múltiples proveedores (Resend, Novu) con un respaldo automático a un proveedor simulado durante el desarrollo o cuando faltan credenciales.

## Estructura de archivos

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

## Interfaz del proveedor

Cada proveedor de correo electrónico implementa la interfaz `EmailProvider`:

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

## Patrón de fábrica (`factory.ts`)

El `EmailProviderFactory` selecciona el proveedor apropiado según la configuración. Si la clave API del proveedor especificado falta o está vacía, recurre al proveedor simulado:

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

## Implementaciones de proveedores

### Proveedor de correo electrónico simulado

Registra correos electrónicos en la consola. Se utiliza durante el desarrollo o cuando no se configuran claves API:

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string { return "mock"; }
}
```

### ReenviarProveedor

Envía correos electrónicos a través de la API de reenvío:

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

### NovuProveedor

Envía correos electrónicos a través de la infraestructura de notificación de Novu utilizando activadores de flujo de trabajo:

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

## Clase de servicio de correo electrónico

La clase `EmailService` envuelve el proveedor creado en fábrica y proporciona métodos de correo electrónico específicos del dominio. Incluye una verificación de disponibilidad para que la aplicación pueda degradarse correctamente cuando el correo electrónico no está configurado:

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

## Funciones auxiliares exportadas

El módulo exporta funciones de nivel superior que manejan la creación de servicios y la gestión de errores automáticamente. Estas son las formas recomendadas para enviar correos electrónicos a través de la aplicación:

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

El contenedor `tryEmailOperation` detecta errores de disponibilidad y devuelve un resultado estructurado en lugar de arrojar:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## Configuración

La configuración del servicio se ensambla a partir de la configuración de contenido y las variables de entorno de la aplicación:

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

Fuentes de configuración (en orden de prioridad):

1. **Configuración de contenido** (`config.mail.provider`, `config.mail.default_from`): desde el CMS basado en Git
2. **Variables de entorno** (`EMAIL_PROVIDER`, `EMAIL_FROM`) - desde el servicio de configuración
3. **Valores predeterminados de reserva** - Proveedor de reenvío, `info@ever.works`

## Plantillas de correo electrónico

Todas las plantillas se exportan desde `lib/mail/templates/index.ts`:

|Plantilla|Función|Propósito|
|----------|----------|---------|
|Cuenta creada|`getAccountCreatedTemplate`|Correo electrónico de bienvenida después del registro|
|Verificación de correo electrónico|`getEmailVerificationTemplate`|Correo electrónico con enlace de verificación|
|Cambio de contraseña|`getPasswordChangeConfirmationTemplate`|Confirma que se cambió la contraseña|
|Pago exitoso|`getPaymentSuccessTemplate`|recibo de pago|
|Pago fallido|`getPaymentFailedTemplate`|Notificación de error de pago|
|Eventos de suscripción|`getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate`|Ciclo de vida de la suscripción|
|Recordatorio de renovación|`getRenewalReminderTemplate`|Próximo aviso de renovación|
|Bienvenido al boletín|`getWelcomeEmailTemplate`|Confirmación de suscripción al boletín|
|Darse de baja del boletín|`getUnsubscribeEmailTemplate`|Confirmación de baja|
|Boletín periódico|`getRegularNewsletterTemplate`|Envío de contenidos del boletín|

## Variables de entorno

|variable|Requerido|Descripción|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|No|Nombre del proveedor: `resend` o `novu` (predeterminado: `resend`)|
|`EMAIL_FROM`|No|Dirección de remitente predeterminada|
|`RESEND_API_KEY`|Para reenviar|Reenviar clave API|
|`NOVU_API_KEY`|Para Novu|Clave API de Novu|
|`NOVU_TEMPLATE_ID`|No|ID de flujo de trabajo de Novu (predeterminado: `email-default`)|
|`NOVU_BACKEND_URL`|No|URL de backend personalizada de Novu|

## Archivos relacionados

- `lib/mail/factory.ts` - Fábrica de proveedores
- `lib/mail/index.ts` - EmailService y funciones exportadas
- `lib/mail/templates/` - Todos los generadores de plantillas de correo electrónico
- `lib/newsletter/` - Utilidades de correo electrónico específicas para boletines
