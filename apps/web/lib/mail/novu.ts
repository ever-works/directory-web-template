import { Novu } from "@novu/api";
import { EmailMessage, EmailNovuConfig, EmailProvider } from ".";

export class NovuProvider implements EmailProvider {
  private novu: Novu;
  private defaultFrom: string;
  private templateId: string;

  constructor(apiKey: string, defaultFrom: string, config?: EmailNovuConfig) {
    this.novu = new Novu({
      secretKey:apiKey,
      serverURL: config?.backendUrl,
    });
    this.defaultFrom = defaultFrom;
    this.templateId = config?.templateId || "email-default";
  }

  async sendEmail(message: EmailMessage) {
    const email = Array.isArray(message.to) ? message.to[0] : message.to;
    return this.novu.trigger({
      to: {
        subscriberId: email,
        email: email,
      },
      workflowId:this.templateId,
      payload: {
        subject: message.subject,
        body: message.html,
        preheader: message.text,
        from: message.from || this.defaultFrom,
      },
    });
  }

  getName(): string {
    return "novu";
  }
}
