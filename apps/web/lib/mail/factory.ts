import { EmailProvider, EmailServiceConfig } from ".";
import { MockEmailProvider } from "./mock";
import { NovuProvider } from "./novu";
import { ResendProvider } from "./resend";

/**
 * Resolves the active email provider from runtime config.
 *
 * **Silent-fallback footgun.** The factory never throws on a
 * misconfiguration — if the requested provider's API key is missing/
 * blank, or the provider name isn't recognized, it returns
 * {@link MockEmailProvider} instead, which accepts every send and
 * resolves successfully without actually delivering anything. A single
 * `console.warn` is the only signal at construction time; subsequent
 * `.send()` calls succeed silently.
 *
 * This is the right behaviour for local dev (you don't need an API key
 * to boot the app), but in production it means a deploy with a typo'd
 * env var (or a missing secret) ships with mailing silently disabled.
 * If you need a "fail loudly on missing provider" mode, fail upstream
 * at env validation rather than changing this factory.
 */
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
