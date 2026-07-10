import { EmailMessage, EmailProvider } from ".";

interface SmtpConfig {
	host: string;
	port: number;
	user: string;
	password: string;
	secure?: boolean;
}

export class SmtpProvider implements EmailProvider {
	private config: SmtpConfig;
	private defaultFrom: string;

	constructor(config: SmtpConfig, defaultFrom: string) {
		this.config = config;
		this.defaultFrom = defaultFrom;
	}

	async sendEmail(message: EmailMessage): Promise<any> {
		const nodemailer = await import("nodemailer");
		const transporter = nodemailer.createTransport({
			host: this.config.host,
			port: this.config.port,
			secure: this.config.secure ?? this.config.port === 465,
			auth: {
				user: this.config.user,
				pass: this.config.password,
			},
		});

		const info = await transporter.sendMail({
			from: message.from || this.defaultFrom,
			to: message.to,
			subject: message.subject,
			html: message.html,
			text: message.text,
		});

		// Print preview URL when using Ethereal test accounts
		const previewUrl = nodemailer.getTestMessageUrl(info);
		if (previewUrl) {
			const border = '─'.repeat(60);
			console.log(`\n┌${border}┐`);
			console.log(`│  📬 EMAIL SENT (Ethereal test — not delivered to inbox) │`);
			console.log(`├${border}┤`);
			console.log(`│  To:      ${String(message.to).padEnd(49)}│`);
			console.log(`│  Subject: ${message.subject.slice(0, 49).padEnd(49)}│`);
			console.log(`├${border}┤`);
			console.log(`│  👁  Preview URL (open in browser):                     │`);
			console.log(`│  ${String(previewUrl).slice(0, 59).padEnd(59)}│`);
			console.log(`└${border}┘\n`);
		}

		return info;
	}

	getName(): string {
		return "smtp";
	}
}

/**
 * Creates an Ethereal test SMTP provider on demand.
 * Ethereal is a fake SMTP service by nodemailer — emails are captured
 * (never delivered) and viewable at ethereal.email via a preview URL.
 * No account signup required; credentials are generated automatically.
 */
export async function createEtherealProvider(defaultFrom: string): Promise<SmtpProvider> {
	const nodemailer = await import("nodemailer");
	const account = await nodemailer.createTestAccount();
	console.log("[Email] Ethereal test account created:", account.user);
	return new SmtpProvider(
		{
			host: "smtp.ethereal.email",
			port: 587,
			user: account.user,
			password: account.pass,
		},
		defaultFrom || account.user,
	);
}
