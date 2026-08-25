import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeRouteDetails } from './generate-openapi';

test('current route annotations replace longer stale generated descriptions', () => {
	const merged = mergeRouteDetails(
		{
			get: {
				description:
					'This deliberately longer stale description names STRIPE_SECRET_KEY and must not survive regeneration.'
			}
		},
		{
			get: {
				description: 'Current browser-safe route documentation.'
			}
		}
	);

	assert.equal(merged.get.description, 'Current browser-safe route documentation.');
});
