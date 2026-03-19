import { MDXRemote, MDXRemoteProps } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { Tag, TagList } from './mdx-components';
import { MarkdownTag, MarkdownTags, TagsSection } from './markdown-tags';

export function MDX(props: MDXRemoteProps) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-table:block prose-table:w-full prose-table:overflow-x-auto prose-th:whitespace-nowrap prose-td:align-top">
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
