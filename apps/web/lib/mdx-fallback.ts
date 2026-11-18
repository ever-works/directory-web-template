import { createElement, type ReactNode } from 'react';
import type { MDXRemoteProps, CompileMDXResult } from 'next-mdx-remote/rsc';

type Compile = (props: MDXRemoteProps) => Promise<CompileMDXResult>;

/**
 * Compiles `props.source` as MDX, and when MDX rejects it, as plain Markdown, and when that
 * fails too, shows the text as it is.
 *
 * Item, page and blog text comes from the content repository and is not validated as MDX: a
 * `<75%` or a stray `{` makes MDX fail to compile. On a cached (ISR) page a render error fails
 * the whole page with a 500 and caches nothing (Spec 061), where the per-request render used
 * to stream a 200 with the error inside it. Markdown mode (`format: 'md'`) has no JSX or
 * expressions, so such text renders as written; custom MDX components are not available there.
 */
export async function compileWithFallback(compile: Compile, props: MDXRemoteProps): Promise<ReactNode> {
	try {
		return (await compile(props)).content;
	} catch (error) {
		console.warn(`[MDX] Rendering content as Markdown, it is not valid MDX: ${firstLine(error)}`);
	}
	try {
		const options = props.options ?? {};
		return (
			await compile({ ...props, options: { ...options, mdxOptions: { ...options.mdxOptions, format: 'md' } } })
		).content;
	} catch (error) {
		console.warn(`[MDX] Rendering content as plain text, it is not valid Markdown either: ${firstLine(error)}`);
		const text = typeof props.source === 'string' ? props.source : String(props.source);
		return createElement('p', { className: 'whitespace-pre-wrap' }, text);
	}
}

function firstLine(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return message.split('\n').find((line) => line.trim() && !line.includes('error compiling MDX')) ?? message;
}
