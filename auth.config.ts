import { NextAuthConfig } from 'next-auth';
import { createNextAuthProviders } from './lib/auth/providers';
import { configureOAuthProviders, logError } from './lib/auth/error-handler';
import { ErrorType, createAppError } from './lib/utils/error-handler';
import { authConfig } from '@/lib/config/config-service';

const configureProviders = () => {
	try {
		const oauthProviders = configureOAuthProviders();
		return createNextAuthProviders({
			google: oauthProviders.find((p) => p.id === 'google')
				? {
						enabled: true,
						clientId: authConfig.google.clientId || '',
						clientSecret: authConfig.google.clientSecret || '',
						options: {
							allowDangerousEmailAccountLinking: false,
						},
					}
				: { enabled: false },
			github: oauthProviders.find((p) => p.id === 'github')
				? {
						enabled: true,
						clientId: authConfig.github.clientId || '',
						clientSecret: authConfig.github.clientSecret || '',
					}
				: { enabled: false },
			facebook: oauthProviders.find((p) => p.id === 'facebook')
				? {
						enabled: true,
						clientId: authConfig.facebook.clientId || '',
						clientSecret: authConfig.facebook.clientSecret || '',
					}
				: { enabled: false },
			twitter: oauthProviders.find((p) => p.id === 'twitter')
				? {
						enabled: true,
						clientId: authConfig.twitter.clientId || '',
						clientSecret: authConfig.twitter.clientSecret || '',
					}
				: { enabled: false },
			credentials: {
				enabled: true,
			},
		});
	} catch (error) {
		// Log the error but continue with only credentials provider
		const appError = createAppError(
			'Failed to configure OAuth providers. Falling back to credentials only.',
			ErrorType.CONFIG,
			'OAUTH_CONFIG_FAILED',
			error
		);
		logError(appError, 'Auth Config');

		// Fallback to credentials only
		return createNextAuthProviders({
			credentials: { enabled: true },
			google: { enabled: false },
			github: { enabled: false },
			facebook: { enabled: false },
			twitter: { enabled: false },
		});
	}
};

// Notice this is only an object, not a full Auth.js instance
export default {
	trustHost: true,
	providers: configureProviders(),
} satisfies NextAuthConfig;
