import Link from "next/link";

export function FooterLinkGroup({
  links,
  categoryLabel,
  animationDelay,
}: {
  links: Array<{
    label: string;
    href: string;
    target?: string;
    rel?: string;
    isExternal?: boolean;
  }>;
  categoryLabel: string;
  animationDelay: number;
}) {
  return (
    <div
      className="space-y-4 sm:space-y-6 animate-fade-in-up"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
        {categoryLabel}
      </h4>
      <ul className="space-y-2 sm:space-y-3">
        {links.map((link, _index) => (
          <li key={link.href}>
            <Link
              href={link.href}
              target={link.target}
              rel={link.rel || (link.isExternal ? "noopener noreferrer" : undefined)}
              className="group inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-all duration-300 hover:translate-x-2"
            >
              <span className="text-sm font-medium">{link.label}</span>
              <div className="w-0 h-px bg-linear-to-r from-theme-primary-500 to-theme-primary-600 group-hover:w-4 ml-0 group-hover:ml-2 transition-all duration-300" />
              {link.isExternal && (
                <svg
                  className="w-4 h-4 ml-1 opacity-70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
