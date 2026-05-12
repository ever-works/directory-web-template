import { FiAward, FiTrendingUp, FiGrid, FiBarChart2 } from "react-icons/fi";
import { ProfileTag } from "../profile-tag";
import type { Profile, ProfileSkill } from "@/lib/types/profile";

const CARD = "bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm p-6";
const SECTION_TITLE = "text-sm font-semibold text-neutral-900 dark:text-neutral-100";

interface SkillsSectionProps {
  profile: Profile;
}

export function SkillsSection({ profile }: SkillsSectionProps) {
  const categorizedSkills = profile.skills.reduce((acc, skill) => {
    const category = skill.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, ProfileSkill[]>);

  if (profile.skills.length === 0) {
    return (
      <div className={`${CARD} text-center py-12`}>
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

  const avgProficiency =
    profile.skills.length > 0
      ? Math.round(profile.skills.reduce((sum, s) => sum + s.proficiency, 0) / profile.skills.length)
      : 0;

  return (
    <div className="space-y-4">
      {/* Skills tag cloud */}
      <div className={CARD}>
        <div className="flex items-center gap-2 mb-4">
          <span className="p-1.5 bg-neutral-100 dark:bg-white/8 rounded-lg text-theme-primary-600 dark:text-theme-primary-400">
            <FiAward className="w-3.5 h-3.5" />
          </span>
          <h3 className={SECTION_TITLE}>Skills & Expertise</h3>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {profile.skills.map((skill) => (
            <ProfileTag key={skill.name} label={skill.name} />
          ))}
        </div>

        {/* Categorized proficiency bars */}
        <div className="space-y-6">
          {Object.entries(categorizedSkills).map(([category, skills]) => (
            <div key={category}>
              <div className="flex items-center gap-1.5 mb-3">
                <FiTrendingUp className="w-3.5 h-3.5 text-theme-primary-500 dark:text-theme-primary-400 shrink-0" />
                <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
                  {category}
                </h4>
              </div>
              <div className="space-y-2.5">
                {skills.map((skill) => (
                  <div key={skill.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-neutral-700 dark:text-neutral-200">
                        {skill.name}
                      </span>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 tabular-nums">
                        {skill.proficiency}%
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-white/8 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-theme-primary-500 to-theme-primary-400 transition-all duration-300"
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

      {/* Skills summary stats */}
      <div className={CARD}>
        <div className="flex items-center gap-2 mb-4">
          <span className="p-1.5 bg-neutral-100 dark:bg-white/8 rounded-lg text-theme-primary-600 dark:text-theme-primary-400">
            <FiBarChart2 className="w-3.5 h-3.5" />
          </span>
          <h3 className={SECTION_TITLE}>Skills Summary</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <SummaryStat
            icon={<FiAward className="w-4 h-4" />}
            value={profile.skills.length}
            label="Total Skills"
          />
          <SummaryStat
            icon={<FiGrid className="w-4 h-4" />}
            value={Object.keys(categorizedSkills).length}
            label="Categories"
          />
          <SummaryStat
            icon={<FiBarChart2 className="w-4 h-4" />}
            value={`${avgProficiency}%`}
            label="Avg. Level"
          />
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-4 bg-neutral-50 dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-theme-primary-50 dark:bg-theme-primary-500/15 text-theme-primary-600 dark:text-theme-primary-400 mb-2">
        {icon}
      </span>
      <p className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight leading-none">
        {value}
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{label}</p>
    </div>
  );
}
