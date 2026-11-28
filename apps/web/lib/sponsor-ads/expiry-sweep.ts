/**
 * Run the daily sponsor-ad expiry sweep (`expireEndedSponsorAds`) inside another daily job,
 * without letting it break that job.
 *
 * The sweep runs in the subscription-expiration job (`app/api/cron/subscription-expiration/route.ts`
 * on Vercel, `lib/background-jobs/initialize-jobs.ts` with the local or Trigger.dev scheduler).
 * A failure here is logged and returned, never thrown, so the subscription processing of the
 * same run is not affected.
 *
 * Pure: the caller passes the sweep, so this module imports no database code and can be unit
 * tested on its own.
 */
export interface SponsorAdExpirySweepResult {
	/** How many `active` ads were set to `expired`. */
	expired: number;
	/** Why the sweep failed, when it did. */
	error?: string;
}

type SweepLogger = Pick<Console, 'log' | 'error'>;

export async function runSponsorAdExpirySweep(
	expire: () => Promise<readonly unknown[]>,
	logger: SweepLogger = console
): Promise<SponsorAdExpirySweepResult> {
	try {
		const expired = (await expire()).length;
		logger.log(`[SponsorAdExpiry] ${expired} ended sponsor ads set to expired`);
		return { expired };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const failure = `Failed to expire ended sponsor ads: ${message}`;
		logger.error(`[SponsorAdExpiry] ${failure}`);
		return { expired: 0, error: failure };
	}
}
