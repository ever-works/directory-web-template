import Image from "next/image";
import { FiExternalLink, FiStar, FiTag } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types/profile";

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  externalUrl: string;
  tags: string[];
  isFeatured: boolean;
}

interface PortfolioSectionProps {
  profile: Profile;
}

export function PortfolioSection({ profile }: PortfolioSectionProps) {
  const featuredProjects = profile.portfolio.filter(item => item.isFeatured);
  const otherProjects = profile.portfolio.filter(item => !item.isFeatured);

  if (profile.portfolio.length === 0) {
    return (
      <div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm p-12 text-center">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 dark:bg-white/8 text-neutral-400 mb-4">
          <FiExternalLink className="w-6 h-6" />
        </span>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No projects yet</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Projects will appear here once added.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {featuredProjects.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-4">
            <span className="p-1 bg-yellow-50 dark:bg-yellow-500/10 rounded-md">
              <FiStar className="w-3.5 h-3.5 text-yellow-500" />
            </span>
            Featured Projects
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProjects.map((project) => (
              <PortfolioCard key={project.id} project={project} featured />
            ))}
          </div>
        </div>
      )}

      {otherProjects.length > 0 && (
        <div>
          {featuredProjects.length > 0 && (
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              All Projects
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherProjects.map((project) => (
              <PortfolioCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PortfolioCardProps {
  project: PortfolioItem;
  featured?: boolean;
}

function PortfolioCard({ project, featured = false }: PortfolioCardProps) {
  return (
    <div
      className={cn(
        "group flex flex-col bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl overflow-hidden shadow-sm transition-all duration-150 hover:shadow-md hover:border-neutral-300 dark:hover:border-white/15",
        featured && "ring-1 ring-yellow-400/30 dark:ring-yellow-500/20"
      )}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-neutral-100 dark:bg-white/5 aspect-video">
        <Image
          src={project.imageUrl}
          alt={project.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          priority={!!featured}
          loading={featured ? undefined : "lazy"}
          unoptimized
        />
        {featured && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full shadow-sm">
              <FiStar className="w-3 h-3" />
              Featured
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-150" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm leading-snug group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400 transition-colors duration-150">
            {project.title}
          </h4>
          <a
            href={project.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1 rounded-md text-neutral-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 hover:bg-neutral-100 dark:hover:bg-white/8 transition-all duration-150"
            aria-label={`Open ${project.title}`}
          >
            <FiExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <p className="text-neutral-600 dark:text-neutral-300 text-xs leading-relaxed line-clamp-3 flex-1">
          {project.description}
        </p>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-white/8 text-neutral-600 dark:text-neutral-300 rounded-md text-xs"
              >
                <FiTag className="w-2.5 h-2.5 opacity-50" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
