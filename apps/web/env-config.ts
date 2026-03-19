type Env = Record<string, string | undefined>;

const NEXT_PUBLIC_ENVS: { value: Env } = { value: {} };

type OptionObject<T> = {
	default?: string;
	map?: (value: string | undefined) => T;
};
type Options<T> = string | OptionObject<T>;

type InferValue<T> = T extends { map: (value: any) => infer U } ? U : string | undefined;

type ReturnedType<T> = {
	readonly value: T extends string ? string : InferValue<T>;
};

/**
 * This function only loads environment variables starting with NEXT_PUBLIC_*
 *
 * Useful for getting the latest value of the variable at runtime rather than at build time
 *
 * @param name
 * @param options
 * @returns
 */
export function getNextPublicEnv<O extends Options<unknown>>(name: string, options?: O): ReturnedType<O> {
	return {
		get value() {
			const defaultValue = typeof options === 'string' ? options : options?.default;

			// Ensure NEXT_PUBLIC_ENVS.value exists before accessing it
			const envs = NEXT_PUBLIC_ENVS?.value || {};
			let value = envs[name] || defaultValue;
			if (typeof options === 'object' && options.map) {
				value = options.map(value) as any;
			}

			return value as any;
		}
	};
}

/**
 * @deprecated serverRuntimeConfig is removed in Next.js 16. Use environment variables directly.
 * Migration: Access process.env.GAUZY_API_SERVER_URL directly in server components/API routes.
 */
export function getServerRuntimeConfig() {
	// serverRuntimeConfig was removed in Next.js 16
	// Return environment variable directly
	return {
		GAUZY_API_SERVER_URL: process.env.GAUZY_API_SERVER_URL
	};
}

export function setNextPublicEnv(envs: Env) {
	if (envs) {
		// Ensure NEXT_PUBLIC_ENVS.value is initialized
		if (!NEXT_PUBLIC_ENVS.value) {
			NEXT_PUBLIC_ENVS.value = {};
		}
		NEXT_PUBLIC_ENVS.value = {
			...NEXT_PUBLIC_ENVS.value,
			...envs
		};
	}
}

export function loadNextPublicEnvs() {
	// Ensure process.env exists (for SSR safety)
	if (typeof process === 'undefined' || !process.env) {
		return {};
	}
	
	return Object.keys(process.env)
		.filter((key) => key.startsWith('NEXT_PUBLIC'))
		.reduce((acc, value) => {
			acc[value] = process.env[value];
			return acc;
		}, {} as Env);
}

// Preload Some variables
try {
	const envs = loadNextPublicEnvs();
	setNextPublicEnv(envs);
} catch (error) {
	console.warn('Failed to load environment variables:', error);
	// Initialize with empty object as fallback
	setNextPublicEnv({});
}
