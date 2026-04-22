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
