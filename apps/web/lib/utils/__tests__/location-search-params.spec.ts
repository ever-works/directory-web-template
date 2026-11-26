import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, parseRadiusSearchParams } from '../location-search-params';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * GET /api/location/search read the centre with `parseFloat` and only checked for NaN, so
 * `near_lat=Infinity`, `near_lat=1e999` and `near_lat=95` reached the bounding-box query as an
 * infinite or out-of-range centre, and `95abc` was read as 95. The helper accepts only a plain
 * finite number inside the latitude / longitude range and caps the radius.
 */
describe('parseRadiusSearchParams', () => {
	it('keeps the result for ordinary requests', () => {
		assert.deepEqual(parseRadiusSearchParams('48.8566', '2.3522', '25'), {
			ok: true,
			latitude: 48.8566,
			longitude: 2.3522,
			radiusKm: 25
		});
		assert.deepEqual(parseRadiusSearchParams('-33.87', '151.21', '1'), {
			ok: true,
			latitude: -33.87,
			longitude: 151.21,
			radiusKm: 1
		});
	});

	it('uses the default radius when none is sent', () => {
		for (const radius of [null, undefined, '']) {
			const result = parseRadiusSearchParams('10', '20', radius);
			assert.deepEqual(result, { ok: true, latitude: 10, longitude: 20, radiusKm: DEFAULT_RADIUS_KM });
		}
		assert.equal(DEFAULT_RADIUS_KM, 50);
	});

	it('accepts the exact range limits and zero coordinates', () => {
		assert.equal(parseRadiusSearchParams('90', '180', '5').ok, true);
		assert.equal(parseRadiusSearchParams('-90', '-180', '5').ok, true);
		assert.deepEqual(parseRadiusSearchParams('0', '0', '5'), { ok: true, latitude: 0, longitude: 0, radiusKm: 5 });
	});

	it('accepts exponent notation, which Number#toString writes for tiny values', () => {
		const result = parseRadiusSearchParams('1e-7', '-2.5e-7', '10');
		assert.deepEqual(result, { ok: true, latitude: 1e-7, longitude: -2.5e-7, radiusKm: 10 });
	});

	it('rejects coordinates outside the valid range', () => {
		for (const [lat, lng] of [
			['90.0001', '0'],
			['-91', '0'],
			['95', '10'],
			['0', '180.5'],
			['0', '-181'],
			['1e3', '0']
		]) {
			assert.deepEqual(
				parseRadiusSearchParams(lat, lng, '10'),
				{ ok: false, error: 'Invalid coordinates' },
				`${lat},${lng} should be invalid`
			);
		}
	});

	it('rejects infinite, non-numeric and partly numeric coordinates', () => {
		for (const raw of ['Infinity', '-Infinity', '1e999', 'NaN', 'abc', '95abc', '0x10', '1,5', ' ', '.', '--5']) {
			assert.deepEqual(
				parseRadiusSearchParams(raw, '10', '10'),
				{ ok: false, error: 'Invalid coordinates' },
				`near_lat "${raw}" should be invalid`
			);
			assert.deepEqual(
				parseRadiusSearchParams('10', raw, '10'),
				{ ok: false, error: 'Invalid coordinates' },
				`near_lng "${raw}" should be invalid`
			);
		}
	});

	it('rejects a zero, negative, infinite or non-numeric radius', () => {
		for (const radius of ['0', '-5', 'abc', '10km', 'Infinity', '1e999', 'NaN']) {
			assert.deepEqual(
				parseRadiusSearchParams('10', '20', radius),
				{ ok: false, error: 'Invalid radius' },
				`radius "${radius}" should be invalid`
			);
		}
	});

	it('caps a very large radius instead of rejecting it', () => {
		assert.equal(MAX_RADIUS_KM, 20_040);
		for (const radius of ['20040', '20041', '1000000', '1e12']) {
			const result = parseRadiusSearchParams('10', '20', radius);
			assert.deepEqual(result, { ok: true, latitude: 10, longitude: 20, radiusKm: MAX_RADIUS_KM });
		}
	});
});
