import Link from "next/link";

export function FooterLinkGroup({
  links,
  categoryLabel,
}: {
  links: Array<{
    label: string;
    href: string;
    target?: string;
    rel?: string;
    isExternal?: boolean;
  }>;
  categoryLabel: string;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-500">
        {categoryLabel}
      </h4>
      <ul className="space-y-2">
        {links.map((link, _index) => (
          <li key={link.href}>
            <Link
              href={link.href}
              target={link.target}
              rel={link.rel || (link.isExternal ? "noopener noreferrer" : undefined)}
              className="group inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
            >
              <span className="text-xs">{link.label}</span>
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
