import { MDXRemote, MDXRemoteProps } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { Tag, TagList } from './mdx-components';
import { MarkdownTag, MarkdownTags, TagsSection } from './markdown-tags';

export function MDX(props: MDXRemoteProps) {
  return (
    <div className="
      prose prose-gray dark:prose-invert max-w-none
      prose-headings:font-semibold prose-headings:tracking-tight prose-headings:scroll-mt-24
      prose-h2:text-xl prose-h2:border-b prose-h2:border-gray-100 dark:prose-h2:border-white/8 prose-h2:pb-3
      prose-a:text-theme-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline
      prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-2
      prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-2
      prose-li:my-1
      prose-ul:marker:text-theme-primary
      prose-ol:marker:text-theme-primary
      prose-ul:prose-ul:list-circle prose-ul:prose-ul:pl-8
      prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-gray-100 dark:prose-code:bg-white/10 prose-code:text-sm
      prose-code:before:content-[''] prose-code:after:content-['']
      prose-pre:bg-gray-950 prose-pre:ring-1 prose-pre:ring-gray-800 prose-pre:rounded-xl
      prose-blockquote:border-l-4 prose-blockquote:not-italic prose-blockquote:rounded-r-lg
      prose-p:w-5/6
      prose-img:rounded-xl prose-img:shadow-md
      prose-table:block prose-table:w-full prose-table:overflow-x-auto
      prose-th:whitespace-nowrap prose-td:align-top
      prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-800
      prose-table:rounded-lg prose-table:shadow-sm
      prose-thead:bg-gray-50 dark:prose-thead:bg-gray-800/50
      prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold
      prose-td:px-4 prose-td:py-2 prose-td:border-t prose-td:border-gray-100 dark:prose-td:border-gray-800
    ">
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
