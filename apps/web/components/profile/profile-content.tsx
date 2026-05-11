"use client";

import { useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { ProfileNavigation } from "./profile-navigation";
import { AboutSection } from "./sections/about-section";
import { PortfolioSection } from "./sections/portfolio-section";
import { SkillsSection } from "./sections/skills-section";
import { SubmissionsSection } from "./sections/submissions-section";
import type { Profile } from "@/lib/types/profile";

interface ProfileContentProps {
  profile: Profile;
  isOwn?: boolean;
}

function ProfileSectionHeader({
  title,
  manageHref,
}: {
  title: string;
  manageHref?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/6 pb-2 mb-2">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      {manageHref && (
        <Link
          href={manageHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <FiEdit2 className="w-4 h-4" />
          Manage
        </Link>
      )}
    </div>
  );
}

export function ProfileContent({ profile, isOwn = false }: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState("about");

  const renderSection = () => {
    switch (activeTab) {
      case "about":
        return (
          <section className="space-y-8">
            <ProfileSectionHeader
              title="About"
              manageHref={isOwn ? "/client/settings/profile/basic-info" : undefined}
            />
            <AboutSection profile={profile} isOwn={isOwn} />
          </section>
        );
      case "portfolio":
        return (
          <section className="space-y-8">
            <ProfileSectionHeader
              title="Portfolio"
              manageHref={isOwn ? "/client/settings/profile/portfolio" : undefined}
            />
            <PortfolioSection profile={profile} />
          </section>
        );
      case "skills":
        return (
          <section className="space-y-8">
            <ProfileSectionHeader
              title="Skills & Expertise"
              manageHref={isOwn ? "/client/settings/profile/basic-info" : undefined}
            />
            <SkillsSection profile={profile} />
          </section>
        );
      case "submissions":
        return (
          <section className="space-y-8">
            <ProfileSectionHeader title="Submissions" />
            <SubmissionsSection profile={profile} />
          </section>
        );
      default:
        return (
          <section className="space-y-8">
            <ProfileSectionHeader
              title="About"
              manageHref={isOwn ? "/client/settings/profile/basic-info" : undefined}
            />
            <AboutSection profile={profile} isOwn={isOwn} />
          </section>
        );
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto px-2 sm:px-0">
      <ProfileNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="pt-2">{renderSection()}</div>
    </div>
  );
}
