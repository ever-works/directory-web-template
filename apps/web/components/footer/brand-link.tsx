import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/config/client";

/**
 * Enhanced Brand link component
 * Shows "Built with" attribution if configured
 */
export function BrandLink({ t }: { t: any }) {
    // Don't render if attribution URL is not set
    if (!siteConfig.attribution.url) {
      return null;
    }

    return (
      <div className="space-y-5 sm:space-y-6">
        <Link
          href={siteConfig.attribution.url}
          className="group inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-linear-to-r from-white/60 to-white/40 dark:from-[#0a0a0a]/60 dark:to-[#0a0a0a]/40 backdrop-blur-lg border border-gray-200 dark:border-white/4 hover:border-blue-300/50 dark:hover:border-blue-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02] w-fit"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
              {t("footer.BUILT_WITH")}
            </span>
            <div className="relative w-6 h-6">
              <Image className="object-cover" src="/logo-symbol.png" alt={siteConfig.attribution.name} width={24} height={24} style={{ width: '100%', height: '100%' }} />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
              {siteConfig.attribution.name}
            </span>
          </div>
        </Link>
      </div>
    );
  }
  