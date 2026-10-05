import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSurveyOfItem, surveyCanonicalPath, surveyPath } from '../survey-urls';

/**
 * Survey URL helpers (lib/seo/survey-urls.ts).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * /items/<anything>/surveys/<slug> used to answer 200, indexable, with a self
 * canonical for ANY item string, and the same survey was also self-canonical
 * at /surveys/<slug>.
 */

const itemSurvey = { slug: 'onboarding', type: 'item', itemId: 'item-a' };
const globalSurvey = { slug: 'site-feedback', type: 'global', itemId: null };

describe('surveyPath', () => {
	it('puts a survey with an item under that item', () => {
		assert.equal(surveyPath('onboarding', 'item-a'), '/items/item-a/surveys/onboarding');
	});

	it('puts a survey without an item under /surveys', () => {
		assert.equal(surveyPath('site-feedback'), '/surveys/site-feedback');
		assert.equal(surveyPath('site-feedback', null), '/surveys/site-feedback');
		assert.equal(surveyPath('site-feedback', ''), '/surveys/site-feedback');
	});

	it('encodes the path segments', () => {
		assert.equal(surveyPath('a b', 'x/y'), '/items/x%2Fy/surveys/a%20b');
	});
});

describe('surveyCanonicalPath', () => {
	it('publishes an item survey under its own item', () => {
		assert.equal(surveyCanonicalPath(itemSurvey), '/items/item-a/surveys/onboarding');
	});

	it('publishes a global survey under /surveys', () => {
		assert.equal(surveyCanonicalPath(globalSurvey), '/surveys/site-feedback');
	});

	it('publishes a global survey under /surveys even when it carries an item', () => {
		assert.equal(surveyCanonicalPath({ slug: 's', type: 'global', itemId: 'item-a' }), '/surveys/s');
	});

	it('falls back to /surveys for an item survey with no item', () => {
		assert.equal(surveyCanonicalPath({ slug: 'orphan', type: 'item', itemId: '' }), '/surveys/orphan');
		assert.equal(surveyCanonicalPath({ slug: 'orphan', type: 'item' }), '/surveys/orphan');
	});

	it('encodes the path segments', () => {
		assert.equal(surveyCanonicalPath({ slug: 'a b', type: 'item', itemId: 'x/y' }), '/items/x%2Fy/surveys/a%20b');
	});
});

describe('isSurveyOfItem', () => {
	it('accepts the owning item only', () => {
		assert.equal(isSurveyOfItem(itemSurvey, 'item-a'), true);
		assert.equal(isSurveyOfItem(itemSurvey, 'item-b'), false);
		assert.equal(isSurveyOfItem(itemSurvey, 'anything'), false);
	});

	it('accepts an encoded segment of the owning item', () => {
		assert.equal(isSurveyOfItem({ slug: 's', type: 'item', itemId: 'my tool' }, 'my%20tool'), true);
	});

	it('never serves a global survey under an item', () => {
		assert.equal(isSurveyOfItem(globalSurvey, 'item-a'), false);
		assert.equal(isSurveyOfItem({ slug: 's', type: 'global', itemId: 'item-a' }, 'item-a'), false);
	});

	it('survives a malformed segment', () => {
		assert.equal(isSurveyOfItem(itemSurvey, '%E0%A4%A'), false);
	});
});
