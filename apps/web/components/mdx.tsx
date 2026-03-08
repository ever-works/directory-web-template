import { MDXRemote, MDXRemoteProps } from "next-mdx-remote/rsc";
import { Tag, TagList } from "./mdx-components";
import { MarkdownTag, MarkdownTags, TagsSection } from "./markdown-tags";

export function MDX(props: MDXRemoteProps) {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <MDXRemote
        {...props}
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
