import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The admin item form re-rendered without end (T-2815). Each step reports its validity from an effect
 * that depends on its `onValidationChange` prop. The form passed a new inline callback on every render
 * and stored a new validation object and a new completed-steps Set on every report, so each report
 * re-rendered the form and ran the effect again ("Maximum update depth exceeded" in `next dev`, a busy
 * CPU in a production build). The form is a client component that cannot load under `tsx --test`, so
 * this guard reads the source; the browser flow is covered by
 * `apps/web-e2e/tests/admin/items-form-render-loop.spec.ts`.
 */
const read = (p: string) => readFileSync(join(__dirname, p), 'utf8').replace(/\s+/g, ' ');
const form = read('../../../components/admin/items/multi-step-item-form.tsx');
const hook = read('../../../hooks/use-multi-step-form.ts');

const VALIDATION_HANDLERS = [
	'handleBasicInfoValidation',
	'handleMediaLinksValidation',
	'handleClassificationValidation',
	'handleLocationValidation',
	'handleReviewValidation'
];
const CHANGE_HANDLERS = [
	'updateBasicInfo',
	'updateMediaLinks',
	'updateClassification',
	'updateLocation',
	'updateReview'
];

describe('admin item form render loop wiring', () => {
	it('gives every step an onValidationChange and onChange that keep their identity', () => {
		const inline = form.match(/on(?:ValidationChange|Change)=\{\s*\(/g) ?? [];
		assert.equal(inline.length, 0, 'a step still gets an inline callback, which is new on every render');
		assert.ok(form.includes('const handleStepValidation = useCallback('), 'handleStepValidation is not memoized');
		for (const name of [...VALIDATION_HANDLERS, ...CHANGE_HANDLERS]) {
			assert.ok(form.includes(`const ${name} = useCallback(`), `${name} is not memoized`);
		}
		for (const name of VALIDATION_HANDLERS) {
			assert.ok(form.includes(`onValidationChange={${name}}`), `no step gets ${name}`);
		}
		for (const name of CHANGE_HANDLERS) {
			assert.ok(form.includes(`onChange={${name}}`), `no step gets ${name}`);
		}
	});

	it('keeps the previous validation state when a step reports the same validity', () => {
		assert.ok(
			form.includes('setStepValidation(prev => (prev[step] === isValid ? prev : { ...prev, [step]: isValid }));'),
			'handleStepValidation stores a new object for an unchanged report'
		);
	});

	it('keeps the previous completed-steps Set when nothing changes', () => {
		assert.ok(
			hook.includes('setCompletedSteps(prev => (prev.has(step) ? prev : new Set(prev).add(step)));'),
			'markStepAsCompleted makes a new Set for a step already completed'
		);
		assert.ok(
			hook.includes('setCompletedSteps(prev => { if (!prev.has(step)) { return prev; }'),
			'markStepAsIncomplete makes a new Set for a step not completed'
		);
	});
});
