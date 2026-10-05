/**
 * The one public URL of a survey.
 *
 * A survey is reachable on two routes: `/surveys/<slug>` serves any survey by
 * its slug, and `/items/<item>/surveys/<slug>` served it under ANY item string.
 * Each declared itself canonical, so one survey had an unbounded set of
 * self-canonical URLs. An item survey belongs to one item (`itemId` holds that
 * item's slug, see components/surveys/user-survey-section.tsx), so it is
 * published under that item; every other survey under `/surveys`.
 */

import { decodeSegment } from './route-segment';

/** The survey fields that decide where it is published. */
export interface SurveyLocation {
	slug: string;
	/** `'global'` or `'item'` (lib/types/survey.ts SurveyTypeEnum). */
	type: string;
	/** For an item survey, the slug of the item it belongs to. */
	itemId?: string | null;
}

function isItemSurvey(survey: SurveyLocation): survey is SurveyLocation & { itemId: string } {
	return survey.type === 'item' && typeof survey.itemId === 'string' && survey.itemId.length > 0;
}

/**
 * Locale-less path of survey `slug`: under item `itemId` when one is given,
 * otherwise under `/surveys`. The one place the two URL shapes are spelled
 * out (components/surveys/utils/survey-helpers.ts getPublicSurveyLink() builds
 * its copyable link from it too).
 */
export function surveyPath(slug: string, itemId?: string | null): string {
	const encodedSlug = encodeURIComponent(slug);
	if (typeof itemId === 'string' && itemId.length > 0) {
		return `/items/${encodeURIComponent(itemId)}/surveys/${encodedSlug}`;
	}
	return `/surveys/${encodedSlug}`;
}

/** Locale-less canonical path of a survey. */
export function surveyCanonicalPath(survey: SurveyLocation): string {
	return surveyPath(survey.slug, isItemSurvey(survey) ? survey.itemId : null);
}

/**
 * Whether `/items/<itemSlug>/surveys/<survey.slug>` is a real URL of the
 * survey: it must be an item survey that belongs to that very item.
 * `itemSlug` is the route segment, encoded or not.
 */
export function isSurveyOfItem(survey: SurveyLocation, itemSlug: string): boolean {
	if (!isItemSurvey(survey)) return false;
	return survey.itemId === itemSlug || survey.itemId === decodeSegment(itemSlug);
}
