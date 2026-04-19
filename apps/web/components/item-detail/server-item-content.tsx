import { MDX } from "@/components/mdx";

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
    <div>
      {normalizedContent ? (
        <div
          className={[
            // Base reset
            'prose max-w-none dark:prose-invert',

            // ── Body text ──────────────────────────────────────────────────
            // Compact, readable 13.5 px / 20 px line-height
            'prose-p:text-[0.8438rem] prose-p:leading-[1.65] prose-p:text-gray-600 dark:prose-p:text-gray-400',
            'prose-p:my-3',

            // ── Headings – tightly scaled, never oversized ──────────────────
            'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-white',
            'prose-h1:text-xl   prose-h1:leading-snug  prose-h1:mt-8  prose-h1:mb-3',
            'prose-h2:text-base prose-h2:leading-snug  prose-h2:mt-6  prose-h2:mb-2',
            'prose-h3:text-sm   prose-h3:leading-snug  prose-h3:mt-5  prose-h3:mb-1.5',
            'prose-h4:text-sm   prose-h4:leading-snug  prose-h4:mt-4  prose-h4:mb-1 prose-h4:font-medium',

            // ── Links ───────────────────────────────────────────────────────
            'prose-a:text-[0.8125rem] prose-a:font-medium',
            'prose-a:text-gray-700 dark:prose-a:text-gray-300',
            'prose-a:underline prose-a:decoration-gray-300 dark:prose-a:decoration-gray-600',
            'prose-a:underline-offset-2 hover:prose-a:decoration-gray-600 dark:hover:prose-a:decoration-gray-400',
            'prose-a:transition-colors',

            // ── Strong & em ─────────────────────────────────────────────────
            'prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold',
            'prose-em:text-gray-700 dark:prose-em:text-gray-300',

            // ── Lists ───────────────────────────────────────────────────────
            'prose-ul:my-3 prose-ul:pl-4 prose-ul:list-disc',
            'prose-ol:my-3 prose-ol:pl-4 prose-ol:list-decimal',
            'prose-li:text-[0.8438rem] prose-li:leading-[1.65]',
            'prose-li:text-gray-600 dark:prose-li:text-gray-400',
            'prose-li:my-0.5 prose-li:marker:text-gray-400 dark:prose-li:marker:text-gray-600',

            // ── Inline code ─────────────────────────────────────────────────
            'prose-code:text-[0.78rem] prose-code:font-mono',
            'prose-code:bg-gray-100 dark:prose-code:bg-white/6',
            'prose-code:text-gray-800 dark:prose-code:text-gray-200',
            'prose-code:px-1.5 prose-code:py-px prose-code:rounded',
            'prose-code:before:content-none prose-code:after:content-none',

            // ── Code blocks ─────────────────────────────────────────────────
            'prose-pre:my-4 prose-pre:rounded-lg',
            'prose-pre:bg-gray-50 dark:prose-pre:bg-[#0f1117]',
            'prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-white/6',
            'prose-pre:px-4 prose-pre:py-3 prose-pre:text-[0.78rem] prose-pre:leading-relaxed',
            'prose-pre:overflow-x-auto',

            // ── Blockquotes ─────────────────────────────────────────────────
            'prose-blockquote:my-4 prose-blockquote:not-italic',
            'prose-blockquote:border-l-2 prose-blockquote:border-gray-200 dark:prose-blockquote:border-white/10',
            'prose-blockquote:pl-4 prose-blockquote:py-0.5',
            'prose-blockquote:text-gray-500 dark:prose-blockquote:text-gray-400',
            'prose-blockquote:bg-transparent',

            // ── Horizontal rule ─────────────────────────────────────────────
            'prose-hr:my-6 prose-hr:border-gray-100 dark:prose-hr:border-white/6',

            // ── Tables ──────────────────────────────────────────────────────
            'prose-table:text-[0.8125rem] prose-table:w-full',
            'prose-thead:border-b prose-thead:border-gray-200 dark:prose-thead:border-white/8',
            'prose-th:py-2 prose-th:px-3 prose-th:font-semibold prose-th:text-left',
            'prose-th:text-gray-700 dark:prose-th:text-gray-300',
            'prose-td:py-2 prose-td:px-3',
            'prose-td:text-gray-600 dark:prose-td:text-gray-400',
            'prose-td:border-b prose-td:border-gray-100 dark:prose-td:border-white/5',

            // ── Images ──────────────────────────────────────────────────────
            'prose-img:my-6 prose-img:rounded-xl',
            'prose-img:border prose-img:border-gray-200 dark:prose-img:border-white/8',
            'prose-img:shadow-sm',

            // ── Figcaption ──────────────────────────────────────────────────
            'prose-figcaption:text-center prose-figcaption:text-[0.75rem]',
            'prose-figcaption:text-gray-400 dark:prose-figcaption:text-gray-500',
            'prose-figcaption:mt-2 prose-figcaption:-mb-2',
          ].join(' ')}
        >
          <MDX source={normalizedContent as string} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 border border-gray-200 dark:border-white/8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-gray-400 dark:text-gray-600"
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
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {noContentMessage}
          </p>
        </div>
      )}
    </div>
  );
}
