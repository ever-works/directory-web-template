/**
 * Currency Service
 *
 * Manages user currency preferences and provides currency formatting utilities
 */

import { getClientProfileByUserId, updateClientProfile } from '@/lib/db/queries/client.queries';
import { detectUserCurrency } from './currency-detection.service';

/**
 * Get user's currency preference
 * Returns currency from profile or detects it automatically
 *
 * **Behaviour worth knowing — this is not a pure getter:**
 *
 *   - **Side-effecting "get".** On cache miss (no `profile.currency`),
 *     this triggers `detectUserCurrency` AND writes the detected
 *     currency + country back to the user's profile. Callers that
 *     expect a `get` to be a cheap read get an extra DB write + one
 *     network hop's worth of latency on the first call per user.
 *   - **USD-detected users never persist.** The "only update if
 *     different from USD" branch means a US user re-runs
 *     `detectUserCurrency` on every request, since their profile
 *     stays `currency = null`. Detect-then-store unconditionally
 *     if you care about avoiding the repeat detection cost.
 *   - **Write failures are silently logged.** If
 *     `updateClientProfile` throws, the outer try/catch swallows it
 *     and returns `'USD'` — the caller sees the fallback currency,
 *     not the actually-detected one. Watch logs for
 *     `[CurrencyService] Error getting user currency` to spot
 *     persistent persistence failures.
 *   - **Anonymous users always get `'USD'`.** No IP-based detection
 *     for guests; localisation only kicks in once they're signed in.
 */
export async function getUserCurrency(userId: string | null | undefined, request?: Request | Headers): Promise<string> {
	if (!userId) {
		return 'USD'; // Default for anonymous users
	}

	try {
		const profile = await getClientProfileByUserId(userId);

		// If profile has currency set, use it
		if (profile?.currency) {
			return profile.currency.toUpperCase();
		}

		// Otherwise, detect currency and country based on available data
		const headers = request instanceof Request ? request.headers : request;
		const { currency: detectedCurrency, country: detectedCountry } = await detectUserCurrency({
			profileCountry: profile?.country || null,
			profileLocation: profile?.location || null,
			headers
		});

		// Save detected currency and country to profile for future use
		if (profile) {
			const updates: { currency?: string; country?: string } = {};

			// Update currency if detected and different from USD
			if (detectedCurrency !== 'USD') {
				updates.currency = detectedCurrency;
			}

			// Update country if detected and not already set
			if (detectedCountry && !profile.country) {
				updates.country = detectedCountry;
			}

			// Only update if there are changes
			if (Object.keys(updates).length > 0) {
				await updateClientProfile(profile.id, updates);
			}
		}

		return detectedCurrency;
	} catch (error) {
		console.error('[CurrencyService] Error getting user currency:', error);
		return 'USD'; // Fallback
	}
}

/**
 * Update user's currency preference
 */
export async function updateUserCurrency(
	userId: string | null | undefined,
	currency?: string,
	country?: string
): Promise<boolean> {
	if (!userId) {
		return false;
	}

	try {
		const profile = await getClientProfileByUserId(userId);
		if (!profile) {
			return false;
		}

		const updates: { currency?: string; country?: string } = {};

		if (currency) {
			updates.currency = currency.toUpperCase();
		}

		if (country) {
			updates.country = country.toUpperCase();
		}

		if (Object.keys(updates).length > 0) {
			await updateClientProfile(profile.id, updates);
		}

		return true;
	} catch (error) {
		console.error('[CurrencyService] Error updating user currency:', error);
		return false;
	}
}

/**
 * Update user's country (which may trigger currency update)
 */
export async function updateUserCountry(userId: string, country: string): Promise<boolean> {
	try {
		const profile = await getClientProfileByUserId(userId);
		if (!profile) {
			return false;
		}

		const { getCurrencyFromCountry } = await import('./currency-detection.service');
		const currency = getCurrencyFromCountry(country);

		await updateClientProfile(profile.id, {
			country: country.toUpperCase(),
			currency: currency
		});

		return true;
	} catch (error) {
		console.error('[CurrencyService] Error updating user country:', error);
		return false;
	}
}
