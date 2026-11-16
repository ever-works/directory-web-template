import { SurveyStatusEnum, SurveyTypeEnum, type SurveyFilters } from '@/lib/types/survey';

/**
 * Query parsing for `GET /api/surveys`.
 *
 * The list needs no session and answers each survey with its full `surveyJson`
 * and response count, so a non-admin always gets published surveys only,
 * whatever `status` the query asks for. This matches `GET /api/surveys/{surveyId}`,
 * which answers 404 to a non-admin for a draft or closed survey. Admins keep the
 * requested status, or every status when none is sent (the admin survey list).
 *
 * `type` and `status` must be one of the enum values; anything else is dropped
 * instead of being passed to the query.
 *
 * It lives outside the route file because a Next.js `route.ts` may only export
 * route handlers and route config.
 */

const SURVEY_TYPES: readonly string[] = Object.values(SurveyTypeEnum);
const SURVEY_STATUSES: readonly string[] = Object.values(SurveyStatusEnum);

function parseSurveyType(value: string | null): SurveyTypeEnum | undefined {
	return value !== null && SURVEY_TYPES.includes(value) ? (value as SurveyTypeEnum) : undefined;
}

function parseSurveyStatus(value: string | null): SurveyStatusEnum | undefined {
	return value !== null && SURVEY_STATUSES.includes(value) ? (value as SurveyStatusEnum) : undefined;
}

export function buildSurveyListFilters(searchParams: URLSearchParams, isAdmin: boolean): SurveyFilters {
	const pageParam = searchParams.get('page');
	const limitParam = searchParams.get('limit');

	const pageParsed = pageParam ? parseInt(pageParam, 10) : undefined;
	const limitParsed = limitParam ? parseInt(limitParam, 10) : undefined;
	const page = pageParsed !== undefined && Number.isInteger(pageParsed) && pageParsed >= 1 ? pageParsed : undefined;
	const limit =
		limitParsed !== undefined && Number.isInteger(limitParsed)
			? Math.min(100, Math.max(1, limitParsed))
			: undefined;

	return {
		type: parseSurveyType(searchParams.get('type')),
		itemId: searchParams.get('itemId') || undefined,
		status: isAdmin ? parseSurveyStatus(searchParams.get('status')) : SurveyStatusEnum.PUBLISHED,
		page,
		limit
	};
}
