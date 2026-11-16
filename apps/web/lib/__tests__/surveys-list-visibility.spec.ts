import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { SurveyStatusEnum, SurveyTypeEnum } from '@/lib/types/survey';

import { buildSurveyListFilters } from '../services/survey-list-filters';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `GET /api/surveys` needs no session and answers each survey with its full
 * `surveyJson` and response count. It used to pass the `status` query parameter
 * straight through, so `?status=draft` (or no status at all) listed draft and
 * closed surveys to anyone, while `GET /api/surveys/{surveyId}` answers 404 for
 * the same surveys unless the caller is an admin. Non-admins now always get
 * published surveys only, and unknown `type` / `status` values are dropped
 * instead of being cast and passed to the query.
 */
const params = (query: string) => new URLSearchParams(query);

describe('buildSurveyListFilters: status for non-admins', () => {
	it('turns status=draft into published for a non-admin', () => {
		assert.equal(buildSurveyListFilters(params('status=draft'), false).status, SurveyStatusEnum.PUBLISHED);
	});

	it('turns status=closed into published for a non-admin', () => {
		assert.equal(buildSurveyListFilters(params('status=closed'), false).status, SurveyStatusEnum.PUBLISHED);
	});

	it('uses published when a non-admin sends no status', () => {
		assert.equal(buildSurveyListFilters(params(''), false).status, SurveyStatusEnum.PUBLISHED);
		assert.equal(
			buildSurveyListFilters(params('type=item&itemId=item-a'), false).status,
			SurveyStatusEnum.PUBLISHED
		);
	});

	it('uses published when a non-admin sends an unknown status', () => {
		assert.equal(buildSurveyListFilters(params('status=archived'), false).status, SurveyStatusEnum.PUBLISHED);
	});

	it('keeps status=published for a non-admin', () => {
		assert.equal(buildSurveyListFilters(params('status=published'), false).status, SurveyStatusEnum.PUBLISHED);
	});
});

describe('buildSurveyListFilters: status for admins', () => {
	it('keeps status=draft for an admin', () => {
		assert.equal(buildSurveyListFilters(params('status=draft'), true).status, SurveyStatusEnum.DRAFT);
	});

	it('keeps status=closed for an admin', () => {
		assert.equal(buildSurveyListFilters(params('status=closed'), true).status, SurveyStatusEnum.CLOSED);
	});

	it('sets no status when an admin sends none (the admin list shows every status)', () => {
		assert.equal(buildSurveyListFilters(params('type=global'), true).status, undefined);
	});

	it('drops an unknown status for an admin', () => {
		assert.equal(buildSurveyListFilters(params('status=archived'), true).status, undefined);
	});
});

describe('buildSurveyListFilters: type', () => {
	it('keeps a known type', () => {
		assert.equal(buildSurveyListFilters(params('type=item'), false).type, SurveyTypeEnum.ITEM);
		assert.equal(buildSurveyListFilters(params('type=global'), true).type, SurveyTypeEnum.GLOBAL);
	});

	it('drops an unknown type', () => {
		assert.equal(buildSurveyListFilters(params('type=bogus'), false).type, undefined);
		assert.equal(buildSurveyListFilters(params('type=bogus'), true).type, undefined);
	});

	it('sets no type when none is sent', () => {
		assert.equal(buildSurveyListFilters(params(''), true).type, undefined);
	});
});

describe('buildSurveyListFilters: itemId, page and limit', () => {
	it('passes itemId through and leaves an empty one unset', () => {
		assert.equal(buildSurveyListFilters(params('itemId=item-a'), false).itemId, 'item-a');
		assert.equal(buildSurveyListFilters(params('itemId='), false).itemId, undefined);
	});

	it('parses page and clamps limit to 1-100 as before', () => {
		const filters = buildSurveyListFilters(params('page=3&limit=500'), false);
		assert.equal(filters.page, 3);
		assert.equal(filters.limit, 100);
		assert.equal(buildSurveyListFilters(params('limit=0'), false).limit, 1);
	});

	it('leaves an invalid page or limit unset', () => {
		const filters = buildSurveyListFilters(params('page=0&limit=abc'), false);
		assert.equal(filters.page, undefined);
		assert.equal(filters.limit, undefined);
	});
});

/**
 * The route handler imports Next.js and the auth stack and cannot be loaded
 * under `tsx --test`, so this check reads the source.
 */
describe('GET /api/surveys uses the helper', () => {
	const route = readFileSync(join(__dirname, '../../app/api/surveys/route.ts'), 'utf8').replace(/\s+/g, ' ');
	const start = route.indexOf('export async function GET(');
	const end = route.indexOf('export async function POST(');
	const get = route.slice(start, end);

	it('builds the filters with buildSurveyListFilters and the admin flag from the session', () => {
		assert.ok(start >= 0 && end > start, 'GET handler not found');
		assert.ok(
			get.includes('buildSurveyListFilters(searchParams, !!session?.user?.isAdmin)'),
			'GET does not call buildSurveyListFilters(searchParams, !!session?.user?.isAdmin)'
		);
	});

	it('no longer casts the raw query values', () => {
		assert.ok(!get.includes('as SurveyStatusEnum'), 'GET still casts the status query parameter');
		assert.ok(!get.includes('as SurveyTypeEnum'), 'GET still casts the type query parameter');
	});
});
