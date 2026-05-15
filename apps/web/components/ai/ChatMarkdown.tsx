'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Components } from 'react-markdown';

const schema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		a: [...(defaultSchema.attributes?.a ?? []), ['target'], ['rel']]
	}
};

const components: Components = {
	a: ({ href, children, ...rest }) => (
		<a
			{...rest}
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="underline underline-offset-2 hover:opacity-80"
		>
			{children}
		</a>
	),
	code: ({ className, children, ...rest }) => {
		const isBlock = /language-/.test(className ?? '');
		if (isBlock) {
			return (
				<code {...rest} className={className}>
					{children}
				</code>
			);
		}
		return (
			<code {...rest} className="rounded bg-default-200/60 px-1 py-0.5 text-[0.78em] dark:bg-default-100/40">
				{children}
			</code>
		);
	},
	pre: ({ children, ...rest }) => (
		<pre
			{...rest}
			className="mt-2 overflow-x-auto rounded-lg bg-default-200/60 px-3 py-2 text-[0.78em] leading-relaxed dark:bg-default-100/40"
		>
			{children}
		</pre>
	),
	ul: ({ children, ...rest }) => (
		<ul {...rest} className="my-1 list-disc pl-5">
			{children}
		</ul>
	),
	ol: ({ children, ...rest }) => (
		<ol {...rest} className="my-1 list-decimal pl-5">
			{children}
		</ol>
	),
	p: ({ children, ...rest }) => (
		<p {...rest} className="whitespace-pre-wrap break-words">
			{children}
		</p>
	)
};

export interface ChatMarkdownProps {
	text: string;
}

export function ChatMarkdown({ text }: ChatMarkdownProps) {
	return (
		<div className="chat-markdown space-y-1 text-sm leading-relaxed">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[[rehypeSanitize, schema]]}
				components={components}
			>
				{text}
			</ReactMarkdown>
		</div>
	);
}
