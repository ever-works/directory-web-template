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
    }: SocialLinkItemProps) => {
      const linkProps = {
        href: href.trim(),
        className:
          "group relative p-3 rounded-2xl bg-linear-to-br from-white/50 to-white/30 dark:from-[#0a0a0a]/50 dark:to-[#0a0a0a]/30 backdrop-blur-lg border border-gray-200/30 dark:border-white/4 hover:border-theme-primary-300/50 dark:hover:border-theme-primary-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-theme-primary-500/10 hover:scale-105",
        "aria-label": label,
      };

      const iconElement = (
        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400 transition-colors duration-200" />
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
    socialLinks: Array<SocialLinkItemProps>;
    t: ReturnType<typeof useTranslations>;
  }) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          {t("footer.CONNECT_WITH_US")}
        </h4>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {socialLinks.map((social) => (
            <SocialLinkItem
              key={social.href}
              {...social}
            />
          ))}
        </div>
      </div>
    );
  }