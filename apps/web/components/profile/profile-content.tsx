"use client";

import { useState } from "react";
import { ProfileNavigation } from "./profile-navigation";
import { AboutSection } from "./sections/about-section";
import { PortfolioSection } from "./sections/portfolio-section";
import { SkillsSection } from "./sections/skills-section";
import { SubmissionsSection } from "./sections/submissions-section";
import type { Profile } from "@/lib/types/profile";

interface ProfileContentProps {
  profile: Profile;
}

// Reusable section header component
function ProfileSectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}

export function ProfileContent({ profile }: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState("about");

  const renderSection = () => {
    switch (activeTab) {
      case "about":
        return (
          <section className="space-y-8">
            <ProfileSectionHeader title="About" />
            <AboutSection profile={profile} />
          </section>
        );
      case "portfolio":
        return (
          <section className="space-y-8">
            <ProfileSectionHeader title="Portfolio" />
            <PortfolioSection profile={profile} />
          </section>
        );
      case "skills":
        return (
          <section className="space-y-8">
            <ProfileSectionHeader title="Skills & Expertise" />
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
            <ProfileSectionHeader title="About" />
            <AboutSection profile={profile} />
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