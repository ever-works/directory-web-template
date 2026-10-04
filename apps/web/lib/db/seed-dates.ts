import type { Faker } from '@faker-js/faker';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const YEAR_MS = 365 * DAY_MS;

/**
 * A random date between one second and `horizonMs` from now.
 *
 * faker v10 throws "`from` date must be before `to` date" from `date.future()` / `date.soon()`
 * when `years` / `days` is fractional (e.g. `future({ years: 0.1 })`). The demo seed used such
 * short horizons for session, verification and reset-token expiries and for a notification
 * message, so seeding a fresh database crashed the instrumentation hook: every E2E web server
 * on `stage`/`main` failed to start, and so would a demo instance booting on an empty database.
 */
export function futureWithin(faker: Pick<Faker, 'date'>, horizonMs: number): Date {
	if (!(horizonMs > 1000)) {
		throw new Error(`futureWithin needs a horizon longer than one second, got ${horizonMs} ms`);
	}
	const now = Date.now();
	return faker.date.between({ from: now + 1000, to: now + horizonMs });
}
