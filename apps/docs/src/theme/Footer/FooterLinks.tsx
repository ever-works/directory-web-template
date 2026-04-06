import React from "react";
import Link from "@docusaurus/Link";
import GitHubStarWidget from "./GitHubStarWidget";

interface FooterLinkItem {
  label: string;
  to?: string;
  href?: string;
  html?: string;
}

interface FooterLinkColumn {
  title: string;
  items: FooterLinkItem[];
}

interface FooterLinksProps {
  columns: FooterLinkColumn[];
}

export function FooterLinks({ columns }: FooterLinksProps): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-6 justify-center lg:justify-start max-w-[70%] grow">
      {columns.map((column, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 min-w-fit basis-36 grow w-fit"
        >
          <strong className="w-full font-bold text-sm leading-none text-primary dark:text-[#fcfdffef]">
            {column.title}
          </strong>
          <ul className="flex flex-col gap-2 items-start w-full leading-snug text-neutral-500 list-none pl-0 m-0">
            {column.items.map((item, itemIndex) => {
              if (item.html) {
                // If this is the GitHub star widget, render it as a live React component
                if (item.html.includes('class="widget"')) {
                  const repoMatch = item.html.match(
                    /github\.com\/([\w-]+\/[\w.-]+)/
                  );
                  const repo = repoMatch ? repoMatch[1] : "ever-works/ever-works";
                  return (
                    <li key={itemIndex} className="flex items-center">
                      <GitHubStarWidget repo={repo} />
                    </li>
                  );
                }
                return (
                  <li
                    key={itemIndex}
                    className="flex items-center"
                    dangerouslySetInnerHTML={{ __html: item.html }}
                  />
                );
              }

              const isExternal = item.href && !item.to;
              const rawUrl = item.to || item.href || "#";
              // Normalize incorrect getting-started link that points to /getting-started/getting-started
              let url = rawUrl;
              if (/^\/?getting-started\/getting-started\/?$/.test(rawUrl)) {
                url = "/getting-started";
              }
              // Normalize architecture overview links to the canonical /architecture
              if (/^\/?architecture(\/overview)?\/?$/.test(rawUrl)) {
                url = "/architecture";
              }

              return (
                <li key={itemIndex}>
                  <Link
                    to={url}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="hover:underline hover:underline-offset-2"
                  >
                    {(() => {
                      const labelText = (item.label || "").toString();
                      const displayLabel = labelText.trim().toLowerCase() === "twitter" ? "X" : labelText;
                      return (
                        <span className="inline-flex gap-x-2 items-center text-sm text-gray-600 capitalize group hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                          <span className="text-gray-600 dark:text-gray-500 hover:text-black dark:hover:text-white">
                            {displayLabel}
                          </span>
                          {isExternal && (
                            <svg
                              className="align-baseline transition-transform duration-300 ease-in-out size-3 opacity-50 group-hover:translate-x-0.5 group-hover:opacity-80"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 18 18"
                              fill="currentColor"
                            >
                              <polygon points="9 2 9 3 14.3 3 6.4 10.9 7.1 11.6 15 3.7 15 9 16 9 16 2 9 2" />
                              <polygon points="15 13 15 15 3 15 3 3 5 3 5 2 2 2 2 3 2 15 2 16 16 16 16 15 16 13 15 13" />
                            </svg>
                          )}
                        </span>
                      );
                    })()}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
