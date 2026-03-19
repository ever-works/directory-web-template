import { ItemTagsSection } from "@/components/item-tags";

interface RelatedTagsProps {
  tags: string[];
}

export function RelatedTags({ tags }: RelatedTagsProps) {
  if (tags.length === 0) return null;

  return (
    <div className="bg-dark--theme-50 dark:bg-dark--theme-800 rounded-xl p-6 sm:p-8 border border-dark--theme-100 dark:border-dark--theme-700 transition-all duration-300 hover:shadow-md hover:border-primary-100 dark:hover:border-primary-900/50 backdrop-blur-xs dark:pulse-on-hover dark:transition-smooth dark:depth-effect dark:fade-up">
      <h3 className="text-lg font-semibold text-dark--theme-900 dark:text-dark--theme-200 mb-4 flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 mr-2 text-primary-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        Related Tags
      </h3>
      <ItemTagsSection title="" tags={tags} />
    </div>
  );
}
