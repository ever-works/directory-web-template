import React, { useEffect, useState } from "react";

interface Props {
  repo: string; // "owner/repo"
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export default function GitHubStarWidget({ repo }: Props): React.ReactElement {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data && typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {
        /* silently fall back to — */
      });
  }, [repo]);

  const repoUrl = `https://github.com/${repo}`;
  const stargazersUrl = `${repoUrl}/stargazers`;
  const displayCount = stars !== null ? formatCount(stars) : "—";

  return (
    <div className="widget">
      <a
        className="btn"
        href={repoUrl}
        rel="noopener noreferrer"
        target="_blank"
        aria-label="Star this project on GitHub"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          className="octicon octicon-star"
          aria-hidden="true"
          fill="currentColor"
        >
          <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z" />
        </svg>
        <span>Star</span>
      </a>
      <a
        className="social-count"
        href={stargazersUrl}
        rel="noopener noreferrer"
        target="_blank"
        aria-label={`${displayCount} stargazers on GitHub`}
      >
        {displayCount}
      </a>
    </div>
  );
}
