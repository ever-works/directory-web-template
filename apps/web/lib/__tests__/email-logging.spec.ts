import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { maskEmail } from '../utils';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * These files logged the address a visitor typed or a customer paid with: every failed sign-in
 * (`getUserByEmail`), every OAuth profile, sign-up, newsletter and payment email, the renewal
 * reminder job, the geocode audit log, and the password-change email (with the IP address and user
 * agent too). The payment success log also passed the whole `PaymentEmailData`: name, email,
 * amount, transaction id and receipt URL. Anyone with log access could read them, and deleting the
 * account does not remove them. The files load the database, NextAuth or Next.js, so these guards
 * read the source (same approach as `lib/auth/__tests__/signin-logging.spec.ts`).
 *
 * A log may name an id, a count or the email's purpose, a `!!` presence check, or a hint made by
 * a `mask*()` call such as `maskEmail()` from `lib/utils.ts`.
 */
const FILES = [
	'lib/db/queries/user.queries.ts',
	'lib/auth/index.ts',
	'lib/newsletter/utils.ts',
	'app/[locale]/newsletter/actions.ts',
	'app/[locale]/auth/actions.ts',
	'lib/payment/services/payment-email.service.ts',
	'lib/mail/index.ts',
	'lib/mail/mock.ts',
	'lib/mail/smtp.ts',
	'lib/mail/templates/example-usage.ts',
	'lib/services/subscription-jobs.ts',
	'app/api/geocode/route.ts',
	'app/api/auth/change-password/route.ts',
	'lib/payment/lib/providers/stripe-provider.ts',
	'lib/payment/lib/providers/polar-provider.ts',
	'lib/payment/lib/providers/lemonsqueezy-provider.ts',
	'lib/payment/lib/providers/solidgate-provider.ts'
];

/**
 * Objects that carry an address (and, for payments, the amount and receipt) when logged whole. A
 * mail provider's send `result` does too: Nodemailer's holds the recipient in `accepted` and
 * `envelope.to`.
 */
const WHOLE_OBJECTS = [
	'data',
	'templateData',
	'emailData',
	'logData',
	'emailMessage',
	'customerData',
	'result',
	'emailResult'
];

const webRoot = join(__dirname, '..', '..');
const read = (relative: string) => readFileSync(join(webRoot, relative), 'utf8');

/**
 * The source with comments and string or template text replaced by spaces, so positions still line
 * up with the original but only code is left. Template `${...}` expressions are kept, because an
 * interpolated `${email}` is logged as much as a plain argument is.
 */
function codeOnly(src: string): string {
	const out = src.split('');
	const blank = (from: number, to: number) => {
		for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
	};

	function code(start: number, untilBrace: boolean): number {
		let i = start;
		let depth = 0;
		while (i < src.length) {
			const ch = src[i];
			if (ch === '/' && src[i + 1] === '/') {
				const end = src.indexOf('\n', i);
				const stop = end === -1 ? src.length : end;
				blank(i, stop);
				i = stop;
			} else if (ch === '/' && src[i + 1] === '*') {
				const end = src.indexOf('*/', i + 2);
				const stop = end === -1 ? src.length : end + 2;
				blank(i, stop);
				i = stop;
			} else if (ch === "'" || ch === '"') {
				let j = i + 1;
				while (j < src.length && src[j] !== ch && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
				blank(i + 1, j);
				i = j + 1;
			} else if (ch === '`') {
				i = template(i + 1);
			} else {
				if (ch === '{') depth++;
				if (ch === '}') {
					if (untilBrace && depth === 0) return i;
					depth--;
				}
				i++;
			}
		}
		return i;
	}

	function template(start: number): number {
		let i = start;
		let textStart = start;
		while (i < src.length) {
			if (src[i] === '\\') {
				i += 2;
			} else if (src[i] === '`') {
				blank(textStart, i);
				return i + 1;
			} else if (src[i] === '$' && src[i + 1] === '{') {
				blank(textStart, i);
				i = code(i + 2, true) + 1;
				textStart = i;
			} else {
				i++;
			}
		}
		blank(textStart, i);
		return i;
	}

	code(0, false);
	return out.join('');
}

/** Index of the bracket that closes the one at `open`, in code-only text. */
function closing(code: string, open: number): number {
	let depth = 0;
	for (let i = open; i < code.length; i++) {
		if ('([{'.includes(code[i])) depth++;
		else if (')]}'.includes(code[i]) && --depth === 0) return i;
	}
	assert.fail(`no closing bracket for position ${open}`);
}

type ConsoleCall = { line: number; args: string; text: string };

/**
 * Every `console.*(...)` and `logger.*(...)` call in a file, with its code-only arguments and its
 * original text. The payment providers' `this.logger.debug()` is a plain `console.log`, so it
 * prints in production too.
 */
function consoleCalls(file: string): ConsoleCall[] {
	const source = read(file);
	const code = codeOnly(source);
	const calls: ConsoleCall[] = [];
	for (const match of code.matchAll(/\b(?:console|logger)\s*\.\s*\w+\s*\(/g)) {
		const paren = match.index + match[0].length - 1;
		const end = closing(code, paren);
		calls.push({
			line: source.slice(0, match.index).split('\n').length,
			args: code.slice(paren + 1, end),
			text: source.slice(match.index, end + 1).replace(/\s+/g, ' ')
		});
	}
	return calls;
}

/** `email`, `userEmail`, `data.customerEmail`; not `hasEmail`, `isEmail` or the `maskEmail` function itself. */
const EMAIL_NAME = /^(?!has|is|mask)[\w$]*[eE]mail$/;

const before = (text: string, at: number) => text.slice(0, at).trimEnd();
const after = (text: string, at: number) => text.slice(at).trimStart();

/**
 * The names read in `args` that match `name`, skipping object keys (`{ hasEmail: ... }`), `!!`
 * presence checks (`!!user?.email`) and the argument of a `mask*()` call (`maskEmail(email)`).
 */
function reads(args: string, name: RegExp): string[] {
	const found: string[] = [];
	for (const match of args.matchAll(/(?<![\w$])[\w$]+(?![\w$])/g)) {
		if (!name.test(match[0])) continue;
		const end = match.index + match[0].length;
		// The start of the member chain the name belongs to, e.g. `session.user.email`.
		let start = match.index;
		while (start > 0 && /[\w$.?]/.test(args[start - 1])) start--;
		const head = before(args, start);
		const tail = after(args, end);
		const isKey = start === match.index && /[{,]$/.test(head) && /^:(?!:)/.test(tail);
		const isPresence = head.endsWith('!!');
		const isMasked = /\bmask\w*\s*\($/.test(head);
		if (!isKey && !isPresence && !isMasked) found.push(args.slice(start, end));
	}
	return found;
}

/**
 * Where `args` passes the object `name` whole: as a bare argument or a spread (`...data`). A member
 * read (`data.id`, `result.data`), a `!` check (`!!result`) or an object key (`{ result: 1 }`) does not.
 */
function wholeReads(args: string, name: string): string[] {
	const found: string[] = [];
	for (const match of args.matchAll(new RegExp(`(?<![\\w$])${name}(?![\\w$])`, 'g'))) {
		const head = before(args, match.index);
		const tail = after(args, match.index + name.length);
		const isSpread = head.endsWith('...');
		const isMember = !isSpread && head.endsWith('.');
		const readsField = /^(\?\.|\.|\[|!\.)/.test(tail);
		const isNegated = head.endsWith('!');
		const isKey = /[{,]$/.test(head) && /^:(?!:)/.test(tail);
		if (!isMember && !readsField && !isNegated && !isKey) found.push(isSpread ? `...${name}` : name);
	}
	return found;
}

describe('the log checks themselves', () => {
	it('count a spread or a bare object as logging it whole, and a field read or a check as not', () => {
		const args = (call: string) => codeOnly(call).slice(call.indexOf('(') + 1, call.lastIndexOf(')'));
		assert.deepEqual(wholeReads(args("console.log('x', { ...data })"), 'data'), ['...data']);
		assert.deepEqual(wholeReads(args("console.log('x', data)"), 'data'), ['data']);
		assert.deepEqual(wholeReads(args("console.log('x', { data })"), 'data'), ['data']);
		assert.deepEqual(wholeReads(args("console.log('x', data.id, result.data, data?.id)"), 'data'), []);
		assert.deepEqual(wholeReads(args("console.log('x', { result: 1, hasResult: !!result })"), 'result'), []);
	});

	it('count an address as logged unless it is masked, checked with !! or only a key', () => {
		const args = (call: string) => codeOnly(call).slice(call.indexOf('(') + 1, call.lastIndexOf(')'));
		assert.deepEqual(reads(args('console.log(`to ${user.email}`)'), EMAIL_NAME), ['user.email']);
		assert.deepEqual(reads(args("console.log('x', { email })"), EMAIL_NAME), ['email']);
		assert.deepEqual(reads(args("console.log('x', { email: maskEmail(email), ok: !!email })"), EMAIL_NAME), []);
	});
});

describe('maskEmail (used by the mock and Ethereal `To:` lines)', () => {
	it('hides part of every address, short names included', () => {
		assert.equal(maskEmail('jonathan@example.com'), 'jo***@example.com');
		assert.equal(maskEmail('abc@example.com'), 'ab*@example.com');
		assert.equal(maskEmail('ab@example.com'), 'a*@example.com');
		assert.equal(maskEmail('a@example.com'), '*@example.com');
		assert.equal(maskEmail('"a@b"@example.com'), '"a***@example.com');
		assert.equal(maskEmail(''), '');
	});
});

const calls = new Map(FILES.map((file) => [file, consoleCalls(file)]));

describe('server logs carry no email address or payment details', () => {
	it('finds console calls in every guarded file, so the checks below have calls to look at', () => {
		for (const [file, list] of calls) assert.ok(list.length > 0, `${file} has no console calls`);
	});

	/** `file:line` and the logged names of every call in `file` for which `found` returns names. */
	const offenders = (file: string, found: (call: ConsoleCall) => string[]) =>
		calls
			.get(file)!
			.map((call) => ({ call, names: found(call) }))
			.filter(({ names }) => names.length > 0)
			.map(({ call, names }) => `${file}:${call.line} logs ${names.join(', ')}: ${call.text}`);

	for (const file of FILES) {
		describe(file, () => {
			it('does not log an email address', () => {
				// `email`, `userEmail`, `data.customerEmail`, `session.user.email`; not `hasEmail` or `emailResult`.
				assert.deepEqual(
					offenders(file, (call) => reads(call.args, EMAIL_NAME)),
					[]
				);
			});

			it('does not log the recipient (`to`)', () => {
				assert.deepEqual(
					offenders(file, (call) => reads(call.args, /^to$/)),
					[]
				);
			});

			it('does not log an email or payment data object whole', () => {
				// A bare name or a spread passes the whole object; `data.id` reads one field.
				assert.deepEqual(
					offenders(file, (call) => WHOLE_OBJECTS.flatMap((name) => wholeReads(call.args, name))),
					[]
				);
			});
		});
	}
});
