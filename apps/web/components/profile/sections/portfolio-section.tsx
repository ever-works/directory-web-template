import Image from "next/image";
import { FiExternalLink, FiStar, FiTag } from "react-icons/fi";
import { Card, CardContent } from "@/components/ui/card";
import type { Profile } from "@/lib/types/profile";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-8">
      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <FiStar className="w-6 h-6 text-yellow-500" />
            Featured Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProjects.map((project) => (
              <PortfolioCard key={project.id} project={project} featured />
            ))}
          </div>
        </div>
      )}

      {/* All Projects section, excluding featured */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
          All Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profile.portfolio.filter(project => !project.isFeatured).map((project) => (
            <PortfolioCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      {profile.portfolio.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              <FiExternalLink className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No projects yet</p>
              <p className="text-sm">Projects will appear here once added.</p>
            </div>
          </CardContent>
        </Card>
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
    <Card className={cn(
      "group border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm transition-all duration-300 p-0",
      featured && "ring-2 ring-yellow-500/20"
    )}>
      <div className="relative overflow-hidden rounded-t-lg">
        <Image
          src={project.imageUrl}
          alt={project.title}
          width={400}
          height={300}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          priority={!!featured}
          loading={featured ? undefined : "lazy"}
        />
        {featured && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
              <FiStar className="w-3 h-3" />
              Featured
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      </div>
      
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400 transition-colors">
              {project.title}
            </h3>
            <a
              href={project.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors"
            >
              <FiExternalLink className="w-4 h-4" />
            </a>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            {project.description}
          </p>
          
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-sm text-xs font-medium"
                >
                  <FiTag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 