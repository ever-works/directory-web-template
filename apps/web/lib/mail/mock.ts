import { EmailMessage, EmailProvider } from ".";

export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string {
    return "mock";
  }
}
