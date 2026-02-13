import { MDX } from "@/components/mdx";
import { useContainerWidth } from '@/components/ui/container';

interface ServerItemContentProps {
  content?: string | null;
  noContentMessage: string;
}

export function ServerItemContent({ content, noContentMessage }: ServerItemContentProps) {
  // Preprocess content: support custom code-fence marker `...` or `...lang`
  // Convert lines that are exactly `...` or `...lang` into Markdown code fences ``` or ```lang
  const normalizedContent = content
    ? content.replace(/^\s*\.\.\.(\w+)?\s*$/gim, (_match, lang) => {
        return lang ? '\n```' + lang : '\n```';
      })
    : content;

  return (
    <div className="bg-white dark:bg-dark--theme-950 rounded-xl border border-gray-200 dark:border-gray-800 px-8 pb-8 shadow-sm">
      {normalizedContent ? (
        <div className="prose prose-sm prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:text-sm prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-800 prose-img:rounded-xl prose-img:shadow-lg prose-img:border prose-img:border-gray-200 dark:prose-img:border-gray-700 prose-figure:my-8 prose-figcaption:text-center prose-figcaption:text-sm prose-figcaption:text-gray-600 dark:prose-figcaption:text-gray-400 prose-figcaption:mt-3 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold prose-ul:list-disc prose-ol:list-decimal prose-li:my-0 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/10 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-hr:border-gray-200 dark:prose-hr:border-gray-800 prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-800 prose-thead:bg-gray-50 dark:prose-thead:bg-gray-900 prose-th:border prose-th:border-gray-200 dark:prose-th:border-gray-800 prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-800">
          <MDX source={normalizedContent as string} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Content Available
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
            {noContentMessage}
          </p>
        </div>
      )}
    </div>
  );
}
