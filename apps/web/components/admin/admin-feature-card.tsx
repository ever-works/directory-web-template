import { ArrowRight } from 'lucide-react';
import { AdminFeature } from './types';

interface AdminFeatureCardProps {
    feature: AdminFeature;
}

export function AdminFeatureCard({ feature }: AdminFeatureCardProps) {
    const { icon: Icon, title, description, href } = feature;

    return (
        <a
            href={href}
            className={[
                'group flex flex-col gap-4 rounded-xl border p-5',
                'border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3',
                'shadow-sm transition-all duration-200',
                'hover:border-neutral-300 hover:shadow-md',
                'dark:hover:border-white/[0.12] dark:hover:bg-white/5',
            ].join(' ')}
        >
            {/* Icon tile */}
            <div
                className={[
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    'bg-neutral-100 text-neutral-500 dark:bg-white/8 dark:text-white/50',
                    'transition-colors group-hover:bg-theme-primary/10 group-hover:text-theme-primary',
                    'dark:group-hover:bg-theme-primary/15 dark:group-hover:text-theme-primary',
                ].join(' ')}
            >
                <Icon className="h-4 w-4" aria-hidden="true" />
            </div>

            {/* Text */}
            <div className="flex-1 space-y-1">
                <h3
                    className={[
                        'text-sm font-semibold text-neutral-900 dark:text-white',
                        'transition-colors group-hover:text-theme-primary',
                    ].join(' ')}
                >
                    {title}
                </h3>
                <p className="text-xs leading-relaxed text-neutral-500 dark:text-white/40">
                    {description}
                </p>
            </div>

            {/* Arrow row */}
            <div
                className={[
                    'flex items-center gap-1 text-xs font-medium',
                    'text-neutral-400 dark:text-white/30',
                    'transition-colors group-hover:text-theme-primary',
                ].join(' ')}
            >
                <span>Open</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
        </a>
    );
}
