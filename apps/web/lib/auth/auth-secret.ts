/**
 * Resolution for the auth/cookie-signing secret.
 *
 * Two env vars are honoured, in order:
 *  1. `AUTH_SECRET` — the canonical name; new deployments should set this.
 *  2. `COOKIE_SECRET` — legacy name kept as a fallback so older
 *     deployments don't need a synchronised rename to upgrade.
 *
 * Whitespace-only values are treated as unset (both vars are trimmed
 * before the truthiness check) so a `.env` line like `AUTH_SECRET= `
 * doesn't silently activate an empty signing key.
 *
 * **Migration trap**: if both are set to *different* values,
 * `AUTH_SECRET` wins. An operator who rotates only `AUTH_SECRET`
 * without updating `COOKIE_SECRET` will invalidate every previously
 * issued session/cookie — the fallback path never fires. To rotate
 * safely: set both env vars to the new value at the same time, then
 * remove `COOKIE_SECRET` once the deploy has rolled out.
 */
function normalizeSecret(value: string | undefined): string | undefined {
	const secret = value?.trim();
	return secret ? secret : undefined;
}

export function getRuntimeAuthSecret(): string | undefined {
	return normalizeSecret(process.env.AUTH_SECRET) ?? normalizeSecret(process.env.COOKIE_SECRET);
}

export function getRuntimeAuthSecretSource(): 'AUTH_SECRET' | 'COOKIE_SECRET' | null {
	if (normalizeSecret(process.env.AUTH_SECRET)) {
		return 'AUTH_SECRET';
	}

	if (normalizeSecret(process.env.COOKIE_SECRET)) {
		return 'COOKIE_SECRET';
	}

	return null;
}
