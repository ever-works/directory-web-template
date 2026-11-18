import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `lib/auth/index.ts` calls NextAuth and the database when it loads, and `credentials.ts` loads the
 * credentials provider and the queries, so these guards read the source instead (same approach as
 * `lib/payment/__tests__/payment-account-auth.spec.ts`).
 *
 * The signIn callback receives the `user` returned by `authorize` (the admin branch used to spread
 * the whole `users` row, `passwordHash` included), the OAuth `account` (access, refresh and id
 * tokens) and the provider `profile`. Logging any of them, or the email, sends bcrypt hashes, live
 * tokens and personal data to production logs.
 */
const read = (relative: string) => readFileSync(join(__dirname, relative), 'utf8');

/**
 * The source with comments and string or template text replaced by spaces, so positions still line
 * up with the original but only code is left. Template `${...}` expressions are kept, because an
 * interpolated `${user.email}` is logged as much as a plain argument is.
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
				while (j < src.length && src[j] !== ch) j += src[j] === '\\' ? 2 : 1;
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

/** The top-level comma-separated entries between the brackets at `open` and its match. */
function entries(code: string, open: number): string[] {
	const end = closing(code, open);
	const parts: string[] = [];
	let depth = 0;
	let from = open + 1;
	for (let i = open + 1; i < end; i++) {
		if ('([{'.includes(code[i])) depth++;
		else if (')]}'.includes(code[i])) depth--;
		else if (code[i] === ',' && depth === 0) {
			parts.push(code.slice(from, i));
			from = i + 1;
		}
	}
	parts.push(code.slice(from, end));
	return parts.map((part) => part.trim()).filter(Boolean);
}

type ConsoleCall = { start: number; args: string; text: string };

/** Every `console.*(...)` call in `code`, with its code-only arguments and its original text. */
function consoleCalls(code: string, source: string): ConsoleCall[] {
	const calls: ConsoleCall[] = [];
	for (const match of code.matchAll(/\bconsole\s*\.\s*\w+\s*\(/g)) {
		const paren = match.index + match[0].length - 1;
		const end = closing(code, paren);
		calls.push({
			start: match.index,
			args: code.slice(paren + 1, end),
			text: source.slice(match.index, end + 1).replace(/\s+/g, ' ')
		});
	}
	return calls;
}

const index = read('../index.ts');
const indexCode = codeOnly(index);
const credentials = read('../credentials.ts');
const credentialsCode = codeOnly(credentials);

/** The signIn callback's body, `{ ... }`, as [start, end] positions in index.ts. */
function signInRange(): [number, number] {
	const start = indexCode.search(/\bsignIn\s*:\s*async\s*\(/);
	assert.ok(start >= 0, 'signIn callback not found in lib/auth/index.ts');
	const arrow = indexCode.indexOf('=>', start);
	const open = indexCode.indexOf('{', arrow);
	return [open, closing(indexCode, open)];
}

const [signInStart, signInEnd] = signInRange();
const signInCode = indexCode.slice(signInStart, signInEnd + 1);
const signInSource = index.slice(signInStart, signInEnd + 1);
const signInLogs = consoleCalls(signInCode, signInSource);

describe('signIn callback logging (lib/auth/index.ts)', () => {
	it('logs something, so the checks below have calls to look at', () => {
		assert.ok(signInLogs.length > 0);
	});

	it('never logs the user, account or profile objects', () => {
		for (const call of signInLogs) {
			// A spread passes the whole object too.
			const args = call.args.replace(/\.\.\./g, ' ');
			// A bare identifier is the whole object; `user?.id` or `account.provider` reads one field.
			const whole = args.match(/(?<![\w$.])(user|account|profile)\b(?!\s*\??\.)/);
			assert.equal(whole, null, `${call.text} logs the whole \`${whole?.[1]}\``);
		}
	});

	it('never logs an email address', () => {
		for (const call of signInLogs) {
			for (const match of call.args.matchAll(/(!!\s*)?\b(user|account|profile)\s*\??\.\s*email\b/g)) {
				assert.ok(match[1], `${call.text} logs \`${match[0].trim()}\``);
			}
		}
	});

	it('reads no user, account or profile field except the provider and `!!` presence checks', () => {
		// `account.access_token`, `refresh_token` and `id_token` are live OAuth tokens, and a bracket
		// read such as `user?.['email']` hides its field name once string text is blanked out.
		for (const call of signInLogs) {
			const reads = call.args.matchAll(/(!!\s*)?(?<![\w$.])(user|account|profile)\s*(?:\?\.|\.)\s*(\[|[\w$]+)/g);
			for (const [read, presence, , field] of reads) {
				const allowed = field === 'provider' || (presence !== undefined && field !== '[');
				assert.ok(allowed, `${call.text} reads \`${read.trim()}\``);
			}
		}
	});

	it('destructures its argument, so the checks above see every name it can log', () => {
		const param = /\bsignIn\s*:\s*async\s*\(\s*(\S)/.exec(indexCode);
		assert.equal(param?.[1], '{', 'the signIn callback does not destructure its argument');
	});

	it('logs the sign-in attempt only in development, with the provider and two booleans', () => {
		const guard = /if\s*\(\s*coreConfig\.NODE_ENV\s*===\s*'development'\s*\)\s*\{/.exec(signInSource);
		assert.ok(guard, 'the signIn callback has no development-only block');
		const open = guard.index + guard[0].length - 1;
		const close = closing(signInCode, open);
		const guarded = signInLogs.filter((call) => call.start > open && call.start < close);
		assert.ok(guarded.length > 0, 'the development-only block logs nothing');

		for (const call of guarded) {
			const objectAt = call.args.indexOf('{');
			assert.ok(objectAt >= 0, `${call.text} logs no fields object`);
			const keys = entries(call.args, objectAt).map((entry) => entry.split(':')[0].trim());
			for (const key of keys) {
				assert.ok(
					['provider', 'hasUserId', 'hasEmail'].includes(key),
					`the development log includes \`${key}\``
				);
			}
		}
	});
});

describe('credentials authorize (lib/auth/credentials.ts)', () => {
	it('does not spread the users row into the signed-in user', () => {
		assert.ok(!credentials.includes('...foundUser'), 'credentials.ts still spreads foundUser');
	});

	it('returns only the allowed fields for an admin', () => {
		const branch = credentialsCode.search(/if\s*\(\s*isAdmin\s*&&\s*foundUser\b/);
		assert.ok(branch >= 0, 'admin branch not found in credentials.ts');
		const ret = /return\s*\{/.exec(credentialsCode.slice(branch));
		assert.ok(ret, 'admin branch returns no object');
		const open = branch + ret.index + ret[0].length - 1;
		assert.ok(
			open < credentialsCode.indexOf('throw new Error(AuthErrorCode.INVALID_PASSWORD)', branch),
			'the admin return is not inside the admin branch'
		);

		const fields = entries(credentialsCode, open);
		// `passwordVersion` is users.password_changed_at as the session's password version (see
		// lib/auth/password-change.ts), not the hash.
		const allowed = ['id', 'email', 'name', 'image', 'tenantId', 'isClient', 'isAdmin', 'passwordVersion'];
		for (const field of fields) {
			assert.ok(!field.startsWith('...'), `the admin user spreads \`${field}\``);
			const key = field.split(':')[0].trim();
			assert.ok(allowed.includes(key), `the admin user includes \`${key}\``);
		}
		assert.ok(!credentials.slice(open, closing(credentialsCode, open)).includes('passwordHash'));
	});
});
