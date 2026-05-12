import { FiAward, FiTrendingUp } from "react-icons/fi";
import { ProfileTag } from "../profile-tag";
import type { Profile, ProfileSkill } from "@/lib/types/profile";

interface SkillsSectionProps {
  profile: Profile;
}

/** Maps a 0–100 proficiency to a readable level label. */
function proficiencyLabel(p: number) {
  if (p >= 90) return "Expert";
  if (p >= 70) return "Advanced";
  if (p >= 50) return "Intermediate";
  if (p >= 30) return "Beginner";
  return "Learning";
}

/** Maps proficiency to a tailwind color class for the bar fill. */
function proficiencyColor(p: number) {
  if (p >= 80) return "from-theme-primary-600 to-theme-primary-400";
  if (p >= 60) return "from-theme-primary-500 to-theme-primary-300";
  return "from-theme-primary-400 to-theme-primary-200";
}

export function SkillsSection({ profile }: SkillsSectionProps) {
  const categorizedSkills = profile.skills.reduce((acc, skill) => {
    const cat = skill.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {} as Record<string, ProfileSkill[]>);

  if (profile.skills.length === 0) {
    return (
      <div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm p-12 text-center">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 dark:bg-white/8 text-neutral-400 mb-4">
          <FiAward className="w-6 h-6" />
        </span>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No skills listed yet</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Use the Manage button above to add skills with categories and proficiency.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-white/6">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-theme-primary-50 dark:bg-theme-primary-500/12 rounded-lg text-theme-primary-600 dark:text-theme-primary-400">
            <FiAward className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Skills & Expertise</h3>
        </div>
        <span className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
          {profile.skills.length} skill{profile.skills.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tag cloud */}
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-white/6">
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.map((skill) => (
            <ProfileTag key={skill.name} label={skill.name} />
          ))}
        </div>
      </div>

      {/* Categorized proficiency */}
      <div className="divide-y divide-neutral-100 dark:divide-white/6">
        {Object.entries(categorizedSkills).map(([category, skills]) => (
          <div key={category} className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-3">
              <FiTrendingUp className="w-3.5 h-3.5 text-theme-primary-500 dark:text-theme-primary-400 shrink-0" />
              <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                {category}
              </h4>
            </div>
            <div className="space-y-3">
              {skills.map((skill) => (
                <div key={skill.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {skill.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        {proficiencyLabel(skill.proficiency)}
                      </span>
                      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 tabular-nums w-8 text-right">
                        {skill.proficiency}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 dark:bg-white/8 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-linear-to-r ${proficiencyColor(skill.proficiency)} transition-all duration-500`}
                      style={{ width: `${skill.proficiency}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
