/**
 * Analytics Event Names
 * Using an enum ensures consistency across the application and prevents typos.
 */
export enum AnalyticsEvent {
	// System / Automatic (Internal PostHog)
	PAGE_VIEW = '$pageview',
	PAGE_LEAVE = '$pageleave',

	// User Authentication
	USER_SIGNED_UP = 'user_signed_up',
	USER_LOGGED_IN = 'user_logged_in',
	USER_LOGGED_OUT = 'user_logged_out',
	USER_PROFILE_UPDATED = 'user_profile_updated',

	// Navigation & UI
	SIDEBAR_TOGGLED = 'sidebar_toggled',
	MODAL_OPENED = 'modal_opened',
	SEARCH_PERFORMED = 'search_performed',
	THEME_CHANGED = 'theme_changed',

	// Business & Conversion
	PRICING_VIEWED = 'pricing_viewed',
	PLAN_SELECTED = 'plan_selected',
	CHECKOUT_STARTED = 'checkout_started',
	PURCHASE_COMPLETED = 'purchase_completed',
	PURCHASE_FAILED = 'purchase_failed',

	// Content & Interaction
	RESOURCE_DOWNLOADED = 'resource_downloaded',
	NEWSLETTER_SUBSCRIBED = 'newsletter_subscribed',
	FEEDBACK_SUBMITTED = 'feedback_submitted',

	// Errors & Debugging
	API_ERROR = 'api_error',
	FORM_VALIDATION_ERROR = 'form_validation_error',
	FEATURE_FLAG_CHECKED = 'feature_flag_checked',

	// AI Chat (Spec 023)
	AI_CHAT_OPENED = 'ai_chat_opened',
	AI_CHAT_CLOSED = 'ai_chat_closed',
	AI_CHAT_MESSAGE_SENT = 'ai_chat_message_sent',
	AI_CHAT_TOOL_CALLED = 'ai_chat_tool_called',
	AI_CHAT_SCENARIO_BLOCKED = 'ai_chat_scenario_blocked'
}

/**
 * Common Property Keys
 * Standardizing property names makes it easier to create insights in PostHog.
 */
export enum AnalyticsProperty {
	SOURCE = 'source',
	PATH = 'path',
	PLAN_ID = 'plan_id',
	CURRENCY = 'currency',
	AMOUNT = 'amount',
	ERROR_CODE = 'error_code',
	COMPONENT_NAME = 'component_name',
	FEATURE_FLAG = 'feature_flag',
	STATUS = 'status'
}
