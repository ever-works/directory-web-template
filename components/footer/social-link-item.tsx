import Link from "next/link";
import { memo } from "react";
import { useTranslations } from "next-intl";

/**
 * Enhanced Social links component
 */
type SocialLinkItemProps = {
    icon: React.ElementType;
    href: string;
    label: string;
    target?: string;
    rel?: string;
    isExternal?: boolean;
    isMailto?: boolean;
    animationDelay: string;
  };
  
   const SocialLinkItem = memo(
    ({
      icon: Icon,
      href,
      label,
      target,
      rel,
      isExternal,
      isMailto,
      animationDelay,
    }: SocialLinkItemProps) => {
      const linkProps = {
        href: href.trim(),
        className:
          "group relative p-3 rounded-2xl bg-linear-to-br from-white/50 to-white/30 dark:from-gray-800/50 dark:to-gray-900/30 backdrop-blur-lg border border-gray-200/30 dark:border-gray-700/40 hover:border-theme-primary-300/50 dark:hover:border-theme-primary-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-theme-primary-500/10 hover:scale-110 hover:-translate-y-1",
        "aria-label": label,
        style: { animationDelay },
      };
  
      const iconElement = (
        <>
          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400 transition-all duration-300 group-hover:scale-110" />
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-0 rounded-2xl bg-theme-primary-20 animate-ping" />
          </div>
        </>
      );
  
      if (isMailto) {
        return <a {...linkProps}>{iconElement}</a>;
      }
  
      if (isExternal) {
        return (
          <a
            {...linkProps}
            target={target?.trim() || "_blank"}
            rel={rel?.trim() || "noopener noreferrer"}
          >
            {iconElement}
          </a>
        );
      }
  
      return <Link {...linkProps}>{iconElement}</Link>;
    }
  );
  
  SocialLinkItem.displayName = "SocialLinkItem";




export function SocialLinks({
    socialLinks,
    t,
  }: {
    socialLinks: Array<Omit<SocialLinkItemProps, "animationDelay">>;
    t: ReturnType<typeof useTranslations>;
  }) {
    return (
      <div
        className="space-y-5 sm:space-y-6 animate-fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          {t("footer.CONNECT_WITH_US")}
        </h4>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {socialLinks.map((social, index) => (
            <SocialLinkItem
              key={index}
              {...social}
              animationDelay={`${0.3 + index * 0.1}s`}
            />
          ))}
        </div>
      </div>
    );
  }