import assert from 'node:assert/strict';
import Module from 'node:module';
import { after, beforeEach, describe, it } from 'node:test';

/**
 * T-2645 — the admin survey edit, preview and responses pages check the admin role on the server.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `/admin/surveys/{slug}/edit`, `/preview` and `/responses` are server components that read the
 * survey with `surveyService.getBySlug(slug)` (preview and responses in `generateMetadata` too) and
 * never called `auth()`. The admin layout's check runs in the browser after the payload is sent,
 * so the proxy's `isAdmin` token check was the only server-side gate: an admin whose session was
 * ended (T-2636 ends it in the jwt callback, which only runs when `auth()` is read) or whose role
 * was removed still received the survey definition. The pages now call `requireAdmin()` from
 * `lib/auth/guards.ts` (session, then the live role from `lib/db/roles.ts`) before the survey query.
 *
 * The pages are loaded for real, with `next/navigation`, the session (`@/lib/auth`), the role
 * lookup (`@/lib/db/roles`), the survey service and the client components replaced, so the real
 * `requireAdmin()` runs. The module graph is CommonJS under `tsx --test`, so intercepting
 * `Module._load` is enough (same approach as `lib/payment/__tests__/payment-account-auth.spec.ts`).
 */
type Session = { user?: { id?: string; isAdmin?: boolean } } | null;
type Params = Promise<{ locale: string; slug: string }>;
type Element = { type: unknown; props: Record<string, unknown> };
type Page = (props: { params: Params }) => Promise<Element>;
type Metadata = (props: { params: Params }) => Promise<{ title?: unknown }>;

const SURVEY = { id: 'survey_1', slug: 'customer-feedback', title: 'Customer feedback' };

const state: {
	session: Session;
	role: boolean | Error;
	roleLookups: string[];
	surveyQueries: string[];
} = { session: null, role: false, roleLookups: [], surveyQueries: [] };

/** Thrown by the `redirect()` stub, like Next's own NEXT_REDIRECT error. */
class RedirectSignal extends Error {
	constructor(readonly url: string) {
		super(`NEXT_REDIRECT ${url}`);
	}
}

/** Thrown by the `notFound()` stub. */
class NotFoundSignal extends Error {
	constructor() {
		super('NEXT_NOT_FOUND');
	}
}

const CreateEditSurveyClient = () => null;
const SurveyPreviewClient = () => null;
const SurveyResponsesClient = () => null;

const stubs: Record<string, unknown> = {
	'next/navigation': {
		redirect: (url: string) => {
			throw new RedirectSignal(url);
		},
		notFound: () => {
			throw new NotFoundSignal();
		}
	},
	'@/lib/auth': { auth: async () => state.session },
	'@/lib/db/roles': {
		isAdmin: async (userId: string) => {
			state.roleLookups.push(userId);
			if (state.role instanceof Error) throw state.role;
			return state.role;
		}
	},
	'@/lib/services/survey.service': {
		surveyService: {
			getBySlug: async (slug: string) => {
				state.surveyQueries.push(slug);
				return slug === SURVEY.slug ? SURVEY : null;
			}
		}
	},
	'@/lib/utils/settings': { getSurveysEnabled: () => true },
	'@/components/surveys/admin/create-edit-survey-client': { CreateEditSurveyClient },
	'@/components/surveys/preview/preview-client': { SurveyPreviewClient },
	'@/components/surveys/responses/survey-responses-client': { SurveyResponsesClient }
};

const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return originalLoad.call(this, request, ...rest);
};
const PAGES_DIR = '../../../app/[locale]/admin/surveys/[slug]';
const editModule = require(`${PAGES_DIR}/edit/page`) as { default: Page };
const previewModule = require(`${PAGES_DIR}/preview/page`) as { default: Page; generateMetadata: Metadata };
const responsesModule = require(`${PAGES_DIR}/responses/page`) as { default: Page; generateMetadata: Metadata };
loader._load = originalLoad;

const params = (slug = SURVEY.slug): Params => Promise.resolve({ locale: 'en', slug });

const PAGES: Array<{ name: string; page: Page; component: unknown; generateMetadata?: Metadata }> = [
	{ name: 'edit', page: editModule.default, component: CreateEditSurveyClient },
	{
		name: 'preview',
		page: previewModule.default,
		component: SurveyPreviewClient,
		generateMetadata: previewModule.generateMetadata
	},
	{
		name: 'responses',
		page: responsesModule.default,
		component: SurveyResponsesClient,
		generateMetadata: responsesModule.generateMetadata
	}
];

/** Sessions that must not see the survey, and where each one is sent. */
const REFUSED: Array<{ who: string; session: Session; role: boolean | Error; to: string }> = [
	{ who: 'a signed-out visitor', session: null, role: false, to: '/admin/auth/signin' },
	{
		who: 'an ended session (auth() returns null, T-2636)',
		session: null,
		role: true,
		to: '/admin/auth/signin'
	},
	{ who: 'a session without a user id', session: { user: {} }, role: true, to: '/unauthorized' },
	{ who: 'a signed-in non-admin', session: { user: { id: 'user_1' } }, role: false, to: '/unauthorized' },
	{
		who: 'a removed admin whose token still says isAdmin: true',
		session: { user: { id: 'user_1', isAdmin: true } },
		role: false,
		to: '/unauthorized'
	},
	{
		who: 'an admin whose role lookup fails',
		session: { user: { id: 'admin_1', isAdmin: true } },
		role: new Error('database unavailable'),
		to: '/unauthorized'
	}
];

describe('admin survey pages check the admin role on the server (T-2645)', () => {
	const errorLog = console.error;
	beforeEach(() => {
		state.session = null;
		state.role = false;
		state.roleLookups = [];
		state.surveyQueries = [];
		// requireAdmin() logs a failed role lookup; keep the test output clean.
		console.error = () => {};
	});
	after(() => {
		loader._load = originalLoad;
		console.error = errorLog;
	});

	for (const { name, page, component, generateMetadata } of PAGES) {
		describe(`/admin/surveys/{slug}/${name}`, () => {
			for (const { who, session, role, to } of REFUSED) {
				it(`redirects ${who} to ${to} and does not read the survey`, async () => {
					state.session = session;
					state.role = role;
					await assert.rejects(page({ params: params() }), (error: unknown) => {
						assert.ok(error instanceof RedirectSignal, `expected a redirect, got ${String(error)}`);
						assert.equal(error.url, to);
						return true;
					});
					assert.deepEqual(state.surveyQueries, [], 'the page read the survey before the admin check');
				});

				if (generateMetadata) {
					it(`generateMetadata redirects ${who} and does not read the survey`, async () => {
						state.session = session;
						state.role = role;
						await assert.rejects(generateMetadata({ params: params() }), (error: unknown) => {
							assert.ok(error instanceof RedirectSignal, `expected a redirect, got ${String(error)}`);
							assert.equal(error.url, to);
							return true;
						});
						assert.deepEqual(
							state.surveyQueries,
							[],
							'generateMetadata read the survey before the admin check'
						);
					});
				}
			}

			it('checks the live role of the signed-in user', async () => {
				state.session = { user: { id: 'admin_1' } };
				state.role = true;
				await page({ params: params() });
				assert.deepEqual(state.roleLookups, ['admin_1']);
			});

			it('renders the survey for an admin', async () => {
				state.session = { user: { id: 'admin_1', isAdmin: true } };
				state.role = true;
				const element = await page({ params: params() });
				assert.equal(element.type, component);
				assert.equal(element.props.survey, SURVEY);
				assert.deepEqual(state.surveyQueries, [SURVEY.slug]);
			});

			it('still answers 404 to an admin for an unknown survey', async () => {
				state.session = { user: { id: 'admin_1' } };
				state.role = true;
				await assert.rejects(page({ params: params('missing') }), NotFoundSignal);
			});

			if (generateMetadata) {
				it('generateMetadata names the survey for an admin', async () => {
					state.session = { user: { id: 'admin_1' } };
					state.role = true;
					const metadata = await generateMetadata({ params: params() });
					assert.match(String(metadata.title), /Customer feedback/);
				});
			}
		});
	}
});
