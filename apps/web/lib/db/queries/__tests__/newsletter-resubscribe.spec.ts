import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Unsubscribing keeps the `newsletterSubscriptions` row (the email column is unique), so a
 * visitor who unsubscribed and later subscribes again must have that row re-activated. A new
 * insert hits the unique constraint, `createNewsletterSubscription` returns null and the footer
 * form answers "Failed to create subscription" forever. The server actions import Next.js /
 * the database and cannot be loaded under `tsx --test`, so these guards read the source.
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

const actions = source('../../../../app/[locale]/newsletter/actions.ts');

/** The text of one exported action, up to the next top-level export. */
const actionBody = (signature: string) => {
	const start = actions.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const next = actions.indexOf(' export ', start + signature.length);
	return actions.slice(start, next < 0 ? undefined : next);
};

describe('newsletter resubscribe', () => {
	const subscribe = actionBody('export const subscribeToNewsletter =');
	const unsubscribe = actionBody('export const unsubscribeFromNewsletter =');

	it('imports resubscribeToNewsletter from the newsletter queries', () => {
		const imports = actions.slice(0, actions.indexOf("from '@/lib/db/queries'"));
		assert.ok(/\bresubscribeToNewsletter\b/.test(imports), 'actions.ts does not import resubscribeToNewsletter');
	});

	it('subscribe re-activates an existing inactive row instead of inserting a new one', () => {
		const resubscribe = subscribe.indexOf('resubscribeToNewsletter(email)');
		const create = subscribe.indexOf("createNewsletterSubscription(email, 'footer')");
		assert.ok(resubscribe > 0, 'subscribeToNewsletter never calls resubscribeToNewsletter(email)');
		assert.ok(create > 0, 'subscribeToNewsletter no longer creates a row for a new email');
		// The two calls must sit on the two sides of one existing-row check, not run one
		// after the other: an inactive row is updated, only a missing row is inserted.
		const pick = subscribe.slice(Math.min(resubscribe, create) - 80, Math.max(resubscribe, create));
		assert.ok(
			/existingSubscription\s*\?/.test(pick) || /if\s*\(\s*!?\s*existingSubscription\b/.test(pick),
			'subscribeToNewsletter does not choose between resubscribe and create on the existing row'
		);
	});

	it('subscribe still refuses an email whose subscription is active', () => {
		const check = subscribe.indexOf('validateExistingSubscription(email, false)');
		assert.ok(check > 0, 'subscribeToNewsletter no longer checks for an active subscription');
		assert.ok(
			check < subscribe.indexOf('resubscribeToNewsletter(email)'),
			'the active-subscription check must run before the row is re-activated'
		);
	});

	it('subscribe sends the welcome email after both the resubscribe and the create path', () => {
		const welcome = subscribe.indexOf('getWelcomeEmailTemplate(email, companyName)');
		const resubscribe = subscribe.indexOf('resubscribeToNewsletter(email)');
		const create = subscribe.indexOf("createNewsletterSubscription(email, 'footer')");
		assert.ok(welcome > 0, 'subscribeToNewsletter does not send the welcome email');
		assert.ok(resubscribe > 0 && welcome > resubscribe, 'no welcome email after a resubscribe');
		assert.ok(create > 0 && welcome > create, 'no welcome email after a create');
		const between = subscribe.slice(Math.min(resubscribe, create), welcome);
		assert.ok(!/return \{ success: true \}/.test(between), 'one of the two paths returns before the welcome email');
	});

	it('subscribe no longer logs the subscriber email', () => {
		assert.ok(!/console\.log\(\s*['"]email['"]/.test(actions), 'actions.ts still logs every subscriber email');
		assert.ok(!/console\.log\([^)]*\bemail\b/.test(subscribe), 'subscribeToNewsletter still logs the email');
	});

	it('unsubscribe uses the query that also records unsubscribedAt', () => {
		assert.ok(
			/unsubscribeFromNewsletter as \w+/.test(actions),
			'actions.ts does not import the unsubscribeFromNewsletter query under an alias'
		);
		const alias = /unsubscribeFromNewsletter as (\w+)/.exec(actions)?.[1] ?? '';
		assert.ok(
			unsubscribe.includes(`${alias}(email)`),
			'the unsubscribe action does not call the unsubscribe query'
		);
		assert.ok(
			!/updateNewsletterSubscription\(email, \{ isActive: false \}\)/.test(unsubscribe),
			'the unsubscribe action still only flips isActive and leaves unsubscribedAt null'
		);
	});
});
