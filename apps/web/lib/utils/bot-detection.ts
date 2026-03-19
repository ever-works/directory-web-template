/**
 * Bot Detection Utility
 *
 * Simple User-Agent based bot detection for filtering out
 * crawlers, bots, and automated tools from view tracking.
 */

const BOT_PATTERNS: RegExp[] = [
	// Generic bot identifiers
	/bot/i,
	/crawl/i,
	/spider/i,
	/slurp/i,

	// Major search engine bots
	/googlebot/i,
	/bingbot/i,
	/yandex/i,
	/baidu/i,
	/duckduckbot/i,

	// Social media crawlers
	/facebookexternalhit/i,
	/twitterbot/i,
	/linkedinbot/i,
	/whatsapp/i,
	/telegrambot/i,

	// Performance/monitoring tools
	/lighthouse/i,
	/pagespeed/i,
	/gtmetrix/i,
	/pingdom/i,

	// Automation/testing tools
	/headless/i,
	/phantom/i,
	/selenium/i,
	/puppeteer/i,
	/playwright/i,

	// HTTP clients
	/curl/i,
	/wget/i,
	/python-requests/i,
	/axios/i,
	/node-fetch/i,
	/go-http-client/i
];

/**
 * Checks if the given User-Agent string belongs to a bot
 * @param userAgent - The User-Agent header value
 * @returns true if the User-Agent appears to be a bot, false otherwise
 */
export function isBot(userAgent: string): boolean {
	if (!userAgent) {
		return true; // Treat empty/missing UA as bot
	}
	return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}
