import { MDX } from "@/components/mdx";

interface ItemContentProps {
  content?: string | null;
  noContentMessage: string;
}

export function ItemContent({ content, noContentMessage }: ItemContentProps) {
  return (
    <div className="dark:bg-dark--theme-950 bg-white rounded-lg p-6 animate-delay-100">
      <div>
        {content ? (
          <MDX source={content} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-default-100 dark:bg-dark--theme-700 flex items-center justify-center shadow-md dark:shadow-dark--theme-950/50 border border-default-200 dark:border-dark--theme-600 transition-all duration-300 hover:scale-105 dark:hover-glow dark:border-glow">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 text-default-400 dark:text-default-500 transition-colors duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-default-800 dark:text-default-200 mb-2 transition-colors duration-300">
              No Content Available
            </h3>
            <p className="text-default-600 dark:text-default-400 max-w-md transition-colors duration-300">
              {noContentMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
