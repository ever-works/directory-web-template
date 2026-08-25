import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeOpenAPISpecs, mergeRouteDetails } from './generate-openapi';

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

test('full spec merge refreshes annotations even when generated docs are not classified as detailed', () => {
	const merged = mergeOpenAPISpecs(
		{
			paths: {
				'/api/payment/public-config': {
					get: {
						description:
							'This deliberately longer stale description names STRIPE_SECRET_KEY and must not survive regeneration.'
					}
				}
			}
		},
		{
			paths: {
				'/api/payment/public-config': {
					get: {
						description: 'Current browser-safe route documentation.'
					}
				}
			}
		}
	);

	assert.equal(
		merged.paths['/api/payment/public-config'].get.description,
		'Current browser-safe route documentation.'
	);
});
