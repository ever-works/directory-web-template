import { Card, CardContent } from "@/components/ui/card";
import { AdminFeature } from "./types";

interface AdminFeatureCardProps {
  feature: AdminFeature;
}

export function AdminFeatureCard({ feature }: AdminFeatureCardProps) {
  const { icon: Icon, title, description, href, emoji } = feature;
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
      <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <span className="text-3xl block mb-2" role="img" aria-label={title}>
            {emoji}
          </span>
          <div className="absolute -bottom-1 -right-1 p-1 bg-theme-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Icon className="h-3 w-3 text-theme-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-theme-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>
        
        <a 
          href={href}
          className="text-theme-primary font-medium hover:text-theme-primary/80 transition-colors hover:underline"
          onClick={(e) => e.preventDefault()} // Remove when actual links are ready
        >
          Go to {title.includes(' ') ? title.split(' ').slice(1).join(' ') : title}
        </a>
      </CardContent>
    </Card>
  );
} 