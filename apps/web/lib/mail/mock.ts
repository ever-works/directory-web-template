import { EmailMessage, EmailProvider } from ".";

export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    const verificationLinkMatch = typeof message.html === 'string'
      ? message.html.match(/href="([^"]*new-verification[^"]*)"/)
      : null;
    const resetLinkMatch = typeof message.html === 'string'
      ? message.html.match(/href="([^"]*new-password[^"]*)"/)
      : null;

    const border = '─'.repeat(60);
    console.log(`\n┌${border}┐`);
    console.log(`│  📧 MOCK EMAIL (no provider configured)              │`);
    console.log(`├${border}┤`);
    console.log(`│  To:      ${String(message.to).padEnd(49)}│`);
    console.log(`│  Subject: ${message.subject.slice(0, 49).padEnd(49)}│`);
    if (verificationLinkMatch?.[1]) {
      console.log(`├${border}┤`);
      console.log(`│  ✅ Verification link (click to verify):             │`);
      console.log(`│  ${verificationLinkMatch[1].slice(0, 59).padEnd(59)}│`);
    }
    if (resetLinkMatch?.[1]) {
      console.log(`├${border}┤`);
      console.log(`│  🔑 Password reset link (click to reset):            │`);
      console.log(`│  ${resetLinkMatch[1].slice(0, 59).padEnd(59)}│`);
    }
    console.log(`└${border}┘\n`);

    return Promise.resolve();
  }

  getName(): string {
    return "mock";
  }
}
