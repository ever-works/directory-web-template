import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { compileWithFallback } from '../mdx-fallback';

/**
 * Spec 061: content MDX rejects must not fail a cached page.
 * Run with: `npx tsx --test apps/web/lib/__tests__/mdx-fallback.spec.ts`
 */
const html = (node: ReactNode) => renderToStaticMarkup(createElement(Fragment, null, node));
// next-mdx-remote's compiler is ESM-only: load it with import(), not require().
const render = async (source: string) => {
	const { compileMDX } = await import('next-mdx-remote/rsc');
	return html(await compileWithFallback(compileMDX, { source }));
};

describe('compileWithFallback', () => {
	it('renders valid MDX as MDX', async () => {
		assert.match(await render('# Title\n\nSome **bold** text'), /<h1>Title<\/h1>[\s\S]*<strong>bold<\/strong>/);
	});

	it('renders text MDX rejects (a `<7`, a stray brace) as Markdown instead of throwing', async () => {
		const out = await render('## Results\n\nUp to <75% faster, with {no} setup.');
		assert.match(out, /<h2>Results<\/h2>/);
		assert.ok(out.includes('&lt;75% faster'), out);
		assert.ok(out.includes('{no}'), out);
	});

	it('falls back to the plain text when the compiler fails outright', async () => {
		const failing = async () => {
			throw new Error('boom');
		};
		assert.equal(
			html(await compileWithFallback(failing, { source: 'a <b' })),
			'<p class="whitespace-pre-wrap">a &lt;b</p>'
		);
	});
});
