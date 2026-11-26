/**
 * Strict parsing for the `near_lat`, `near_lng` and `radius` query parameters of
 * `GET /api/location/search`.
 *
 * `parseFloat` reads `"Infinity"` and `"1e999"` as an infinite number and `"95abc"` as 95, and
 * nothing checked the range. An out-of-range or infinite centre produced a NaN bounding box and a
 * meaningless distance filter instead of a 400. Here a coordinate must be a plain finite number
 * inside the valid latitude / longitude range, and the radius must be a positive finite number
 * (capped at `MAX_RADIUS_KM`, past which every point is already in range).
 */

/**
 * Largest radius in km: the full Earth circumference (about 40,075 km) rounded up. The bounding
 * box in `LocationService.calculateBoundingBox` uses the spherical bounds (it wraps at the date
 * line and spans every longitude once the circle reaches a pole), so any radius past half the
 * circumference (about 20,015 km) already covers the whole world from any centre; the cap keeps
 * the value the route has accepted since T-2826. A radius above it adds nothing, so it is capped
 * instead of rejected.
 */
export const MAX_RADIUS_KM = 40_100;

/** Radius used when the request does not send one (unchanged from the route's previous default). */
export const DEFAULT_RADIUS_KM = 50;

export type RadiusSearchParams =
	| { ok: true; latitude: number; longitude: number; radiusKm: number }
	| { ok: false; error: 'Invalid coordinates' | 'Invalid radius' };

// Optional sign, digits with an optional fraction, optional exponent (`Number#toString` writes
// very small values such as 1e-7 that way, and the client builds these params with it).
// The fraction is one optional group (`(?:\.\d*)?`), not `\.?\d*`: with an optional dot the two
// digit runs overlap, so a long digit string that ends in junk backtracks in quadratic time
// (16,000 digits took about 1 s), and the query string is attacker-controlled.
const PLAIN_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function parsePlainNumber(raw: string): number | undefined {
	const trimmed = raw.trim();
	if (!PLAIN_NUMBER.test(trimmed)) return undefined;
	const value = Number(trimmed);
	return Number.isFinite(value) ? value : undefined;
}

export function parseRadiusSearchParams(
	nearLat: string,
	nearLng: string,
	radius: string | null | undefined
): RadiusSearchParams {
	const latitude = parsePlainNumber(nearLat);
	const longitude = parsePlainNumber(nearLng);
	if (
		latitude === undefined ||
		longitude === undefined ||
		latitude < -90 ||
		latitude > 90 ||
		longitude < -180 ||
		longitude > 180
	) {
		return { ok: false, error: 'Invalid coordinates' };
	}

	let radiusKm = DEFAULT_RADIUS_KM;
	if (radius) {
		const parsed = parsePlainNumber(radius);
		if (parsed === undefined || parsed <= 0) return { ok: false, error: 'Invalid radius' };
		radiusKm = Math.min(parsed, MAX_RADIUS_KM);
	}

	return { ok: true, latitude, longitude, radiusKm };
}
