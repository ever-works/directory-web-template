/**
 * Capability provider interfaces.
 *
 * Each capability has a corresponding interface that a plugin can
 * implement. The runtime registry stores providers keyed by capability,
 * and consumers in `apps/web` look them up via `registry.get('capability')`
 * or `registry.list('capability')`.
 *
 * Interfaces here are intentionally minimal in v1 and grow per spec.
 */

export interface AuthProvider {
	id: string;
	displayName: string;
	signIn?: () => Promise<void> | void;
	signOut?: () => Promise<void> | void;
}

export interface PaymentProvider {
	id: 'stripe' | 'lemonsqueezy' | 'polar' | (string & {});
	createCheckoutSession(input: {
		userId: string;
		priceId: string;
		successUrl: string;
		cancelUrl: string;
		metadata?: Record<string, string>;
	}): Promise<{ url: string; sessionId: string }>;
	verifyWebhook(req: Request): Promise<{ type: string; payload: unknown }>;
}

export interface AnalyticsProvider {
	id: string;
	forward(name: string, payload: Record<string, unknown>, context?: Record<string, unknown>): void | Promise<void>;
}

export interface SearchProvider {
	id: string;
	search(query: string, opts?: { limit?: number; filters?: Record<string, unknown> }): Promise<unknown[]>;
}

export interface ContentSource {
	id: string;
	bootstrap?(): Promise<void> | void;
	listItems(filter?: Record<string, unknown>): Promise<unknown[]>;
	getItem(slug: string): Promise<unknown | undefined>;
}

export interface MapsProvider {
	id: string;
	loadScript(): Promise<void>;
}

export interface NewsletterProvider {
	id: string;
	subscribe(email: string, source?: string): Promise<{ ok: boolean; reason?: string }>;
	unsubscribe(email: string): Promise<{ ok: boolean; reason?: string }>;
}

export interface NotificationsProvider {
	id: string;
	send(input: {
		userId: string;
		kind: string;
		payload: Record<string, unknown>;
	}): Promise<void>;
	list(userId: string, opts?: { limit?: number; cursor?: string }): Promise<unknown[]>;
	markRead(userId: string, ids: string[]): Promise<void>;
	unreadCount(userId: string): Promise<number>;
}

export interface AIProvider {
	id: string;
	complete(input: { prompt: string; system?: string; max_tokens?: number }): Promise<{ text: string }>;
}

export interface CapabilityProviderMap {
	auth: AuthProvider;
	payment: PaymentProvider;
	analytics: AnalyticsProvider;
	search: SearchProvider;
	'content-source': ContentSource;
	maps: MapsProvider;
	newsletter: NewsletterProvider;
	notifications: NotificationsProvider;
	ai: AIProvider;
	/** UI-only slot plugin; no programmatic provider. */
	'ui-slot': never;
}
