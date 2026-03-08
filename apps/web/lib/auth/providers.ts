import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import FacebookProvider from 'next-auth/providers/facebook';
import TwitterProvider from 'next-auth/providers/twitter';
import { credentialsProvider } from './credentials';
import { AuthConfig } from './config';
import { authConfig } from '@/lib/config/config-service';

/**
 * Supported OAuth provider types
 */
export type OAuthProviderType = 'google' | 'github' | 'facebook' | 'twitter' | 'credentials';

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
	enabled: boolean;
	clientId?: string;
	clientSecret?: string;
	// Provider-specific options
	options?: Record<string, any>;
}

/**
 * OAuth providers configuration
 */
export interface OAuthProvidersConfig {
	google?: OAuthProviderConfig;
	github?: OAuthProviderConfig;
	facebook?: OAuthProviderConfig;
	twitter?: OAuthProviderConfig;
	credentials?: OAuthProviderConfig;
}

/**
 * Default OAuth providers configuration
 * Uses ConfigService for validated configuration
 */
export const defaultOAuthProvidersConfig: OAuthProvidersConfig = {
	google: {
		enabled: authConfig.google.enabled,
		clientId: authConfig.google.clientId,
		clientSecret: authConfig.google.clientSecret,
	},
	github: {
		enabled: authConfig.github.enabled,
		clientId: authConfig.github.clientId,
		clientSecret: authConfig.github.clientSecret,
	},
	facebook: {
		enabled: authConfig.facebook.enabled,
		clientId: authConfig.facebook.clientId,
		clientSecret: authConfig.facebook.clientSecret,
	},
	twitter: {
		enabled: authConfig.twitter.enabled,
		clientId: authConfig.twitter.clientId,
		clientSecret: authConfig.twitter.clientSecret,
	},
};

/**
 * Creates Next-Auth providers from configuration
 * @param config OAuth providers configuration
 * @returns Array of Next-Auth providers
 */
export function createNextAuthProviders(config: OAuthProvidersConfig = defaultOAuthProvidersConfig) {
	const providers = [];

	// Google
	if (config.google?.enabled && config.google.clientId && config.google.clientSecret) {
		providers.push(
			GoogleProvider({
				clientId: config.google.clientId,
				clientSecret: config.google.clientSecret,
				...config.google.options,
			})
		);
	}

	// GitHub
	if (config.github?.enabled && config.github.clientId && config.github.clientSecret) {
		providers.push(
			GitHubProvider({
				clientId: config.github.clientId,
				clientSecret: config.github.clientSecret,
				...config.github.options,
			})
		);
	}

	// Facebook
	if (config.facebook?.enabled && config.facebook.clientId && config.facebook.clientSecret) {
		providers.push(
			FacebookProvider({
				clientId: config.facebook.clientId,
				clientSecret: config.facebook.clientSecret,
				...config.facebook.options,
			})
		);
	}

	// Twitter
	if (config.twitter?.enabled && config.twitter.clientId && config.twitter.clientSecret) {
		providers.push(
			TwitterProvider({
				clientId: config.twitter.clientId,
				clientSecret: config.twitter.clientSecret,
				...config.twitter.options,
			})
		);
	}

	// Credentials
	if (config.credentials?.enabled) {
		providers.push(credentialsProvider);
	}

	return providers;
}

/**
 * Configures OAuth providers for authentication
 * @param localAuthConfig Authentication configuration
 * @param oauthConfig OAuth providers configuration
 */
export function configureOAuthProviders(
	localAuthConfig: AuthConfig,
	oauthConfig: OAuthProvidersConfig = defaultOAuthProvidersConfig
) {
	// Create a copy of the auth config to avoid modifying the original
	const config = { ...localAuthConfig };

	// Ensure nextAuth property exists
	if (!config.nextAuth) {
		config.nextAuth = {
			enableCredentials: true,
			enableOAuth: true,
			providers: [],
		};
	}

	// Create Next-Auth providers if Next-Auth is enabled
	if (config.provider === 'next-auth' || config.provider === 'both') {
		// Add OAuth providers to Next-Auth configuration
		config.nextAuth.providers = [...(config.nextAuth.providers || []), ...createNextAuthProviders(oauthConfig)];
	}

	return config;
}