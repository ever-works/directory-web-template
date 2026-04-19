import { MDXRemote, MDXRemoteProps } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { Tag, TagList } from './mdx-components';
import { MarkdownTag, MarkdownTags, TagsSection } from './markdown-tags';

export function MDX(props: MDXRemoteProps) {
  return (
    <div className={[
      // Base
      'prose max-w-none dark:prose-invert',

      // ── Body text ────────────────────────────────────────────────────────
      'prose-p:text-[0.8438rem] prose-p:leading-[1.65]',
      'prose-p:text-gray-600 dark:prose-p:text-gray-400',
      'prose-p:my-3',

      // ── Headings ─────────────────────────────────────────────────────────
      'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:scroll-mt-24',
      'prose-headings:text-gray-900 dark:prose-headings:text-white',
      'prose-h1:text-xl   prose-h1:leading-snug prose-h1:mt-8  prose-h1:mb-3',
      'prose-h2:text-base prose-h2:leading-snug prose-h2:mt-6  prose-h2:mb-2',
      'prose-h2:border-b prose-h2:border-gray-100 dark:prose-h2:border-white/8 prose-h2:pb-2',
      'prose-h3:text-sm   prose-h3:leading-snug prose-h3:mt-5  prose-h3:mb-1.5',
      'prose-h4:text-sm   prose-h4:leading-snug prose-h4:mt-4  prose-h4:mb-1 prose-h4:font-medium',

      // ── Links ─────────────────────────────────────────────────────────────
      'prose-a:text-[0.8125rem] prose-a:font-medium',
      'prose-a:text-theme-primary prose-a:no-underline',
      'hover:prose-a:underline prose-a:underline-offset-2 prose-a:transition-colors',

      // ── Strong & em ──────────────────────────────────────────────────────
      'prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold',
      'prose-em:text-gray-700 dark:prose-em:text-gray-300 prose-em:not-italic',

      // ── Lists ─────────────────────────────────────────────────────────────
      'prose-ul:my-3 prose-ul:pl-4 prose-ul:list-disc',
      'prose-ol:my-3 prose-ol:pl-4 prose-ol:list-decimal',
      'prose-li:text-[0.8438rem] prose-li:leading-[1.65]',
      'prose-li:text-gray-600 dark:prose-li:text-gray-400',
      'prose-li:my-0.5',
      'prose-ul:marker:text-theme-primary prose-ol:marker:text-theme-primary',

      // ── Inline code ──────────────────────────────────────────────────────
      'prose-code:text-[0.78rem] prose-code:font-mono',
      'prose-code:bg-gray-100 dark:prose-code:bg-white/6',
      'prose-code:text-gray-800 dark:prose-code:text-gray-200',
      'prose-code:px-1.5 prose-code:py-px prose-code:rounded',
      "prose-code:before:content-[''] prose-code:after:content-['']",

      // ── Code blocks ──────────────────────────────────────────────────────
      'prose-pre:my-4 prose-pre:rounded-lg',
      'prose-pre:bg-gray-950 prose-pre:ring-1 prose-pre:ring-gray-800',
      'prose-pre:px-4 prose-pre:py-3 prose-pre:text-[0.78rem] prose-pre:leading-relaxed',
      'prose-pre:overflow-x-auto',

      // ── Blockquotes ──────────────────────────────────────────────────────
      'prose-blockquote:my-4 prose-blockquote:not-italic',
      'prose-blockquote:border-l-2 prose-blockquote:border-gray-200 dark:prose-blockquote:border-white/10',
      'prose-blockquote:pl-4 prose-blockquote:py-0.5 prose-blockquote:bg-transparent',
      'prose-blockquote:text-gray-500 dark:prose-blockquote:text-gray-400',

      // ── Horizontal rule ──────────────────────────────────────────────────
      'prose-hr:my-6 prose-hr:border-gray-100 dark:prose-hr:border-white/6',

      // ── Images ───────────────────────────────────────────────────────────
      'prose-img:my-6 prose-img:rounded-xl prose-img:shadow-sm',
      'prose-img:border prose-img:border-gray-200 dark:prose-img:border-white/8',

      // ── Figcaption ───────────────────────────────────────────────────────
      'prose-figcaption:text-center prose-figcaption:text-[0.75rem]',
      'prose-figcaption:text-gray-400 dark:prose-figcaption:text-gray-500',
      'prose-figcaption:mt-2 prose-figcaption:-mb-2',

      // ── Tables ───────────────────────────────────────────────────────────
      'prose-table:text-[0.8125rem] prose-table:w-full prose-table:overflow-x-auto prose-table:block',
      'prose-thead:border-b prose-thead:border-gray-200 dark:prose-thead:border-white/8',
      'prose-thead:bg-gray-50 dark:prose-thead:bg-gray-800/50',
      'prose-th:py-2 prose-th:px-3 prose-th:font-semibold prose-th:text-left prose-th:whitespace-nowrap',
      'prose-th:text-gray-700 dark:prose-th:text-gray-300',
      'prose-td:py-2 prose-td:px-3 prose-td:align-top',
      'prose-td:text-gray-600 dark:prose-td:text-gray-400',
      'prose-td:border-t prose-td:border-gray-100 dark:prose-td:border-gray-800',
    ].join(' ')}>
      <MDXRemote
        {...props}
        options={{
          ...props.options,
          mdxOptions: {
            ...(props.options?.mdxOptions || {}),
            remarkPlugins: [...(props.options?.mdxOptions?.remarkPlugins || []), remarkGfm],
          },
        }}
        components={{
          TagList,
          Tag,
          MarkdownTag,
          MarkdownTags,
          TagsSection,
          Tags: MarkdownTags,
          ...(props.components || {}),
        }}
      />
    </div>
  );
}
