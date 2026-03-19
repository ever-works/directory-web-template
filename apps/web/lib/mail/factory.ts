import { EmailProvider, EmailServiceConfig } from ".";
import { MockEmailProvider } from "./mock";
import { NovuProvider } from "./novu";
import { ResendProvider } from "./resend";

export class EmailProviderFactory {
  static createProvider(config: EmailServiceConfig): EmailProvider {
    const provider = config.provider.toLowerCase();

    switch (provider) {
      case "resend":
        if (!config.apiKeys.resend || config.apiKeys.resend.trim() === '') {
          console.warn('⚠️  Resend API key is missing. Using mock email provider.');
          return new MockEmailProvider();
        }
        return new ResendProvider(config.apiKeys.resend, config.defaultFrom);

      case "novu":
        if (!config.apiKeys.novu || config.apiKeys.novu.trim() === '') {
          console.warn('⚠️  Novu API key is missing. Using mock email provider.');
          return new MockEmailProvider();
        }
        return new NovuProvider(
          config.apiKeys.novu,
          config.defaultFrom,
          config.novu
        );

      default:
        console.warn(`⚠️  Unknown email provider "${provider}". Using mock email provider.`);
        return new MockEmailProvider();
    }
  }
}
