import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeOpenAPISpecs, mergeResponseContent, mergeRouteDetails } from './generate-openapi';

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

test("an annotation's examples replace the file's, so a stale example never survives next to them", () => {
	const merged = mergeResponseContent(
		{
			'application/json': {
				example: { success: false, error: 'Email already exists, with a much longer stale message' },
				examples: { duplicate_username: { value: { error: 'Username already exists' } } }
			}
		},
		{
			'application/json': {
				schema: { type: 'object' },
				examples: { weak_password: { value: { error: 'Password must be at least 8 characters' } } }
			}
		}
	);

	assert.deepEqual(merged['application/json'], {
		schema: { type: 'object' },
		examples: { weak_password: { value: { error: 'Password must be at least 8 characters' } } }
	});
});

test('without an annotated example the file keeps its own', () => {
	const merged = mergeResponseContent(
		{ 'application/json': { example: { error: 'Kept' } } },
		{ 'application/json': { schema: { type: 'object' } } }
	);

	assert.deepEqual(merged['application/json'], { schema: { type: 'object' }, example: { error: 'Kept' } });
});
