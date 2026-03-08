import { FiAward, FiTrendingUp, FiGrid, FiBarChart2 } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileTag } from "../profile-tag";
import type { Profile } from "@/lib/types/profile";

// Configurable skill categories for better reusability
const SKILL_CATEGORIES: Record<string, string[]> = {
  Frontend: ["React", "Vue.js", "Angular", "HTML", "CSS", "JavaScript", "TypeScript"],
  Backend: ["Node.js", "Python", "Java", "C#", "PHP", "Go", "Rust"],
  "Tools & Frameworks": ["Next.js", "Tailwind CSS", "Docker", "Git", "AWS", "Firebase"]
};

interface SkillsSectionProps {
  profile: Profile;
}

export function SkillsSection({ profile }: SkillsSectionProps) {
  const getSkillCategory = (skill: string) => {
    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      if (skills.includes(skill)) return category;
    }
    return "Other";
  };

  const categorizedSkills = profile.skills.reduce((acc: Record<string, { name: string; level: number }[]>, skill: { name: string; level: number }) => {
    const category = getSkillCategory(skill.name);
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, { name: string; level: number }[]>);

  return (
    <div className="space-y-8">
      {/* Skills Tag Summary */}
      <Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm p-6">
        <CardHeader className="p-0 mb-2">
          <CardTitle className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <FiAward className="w-5 h-5 text-theme-primary-500" />
            Skills & Expertise
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-wrap gap-2 mb-6">
            {profile.skills.map((skill) => (
              <ProfileTag key={skill.name} label={skill.name} />
            ))}
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Here are the technologies and tools I work with. Each skill represents my proficiency level based on experience and projects.
          </p>
          
          <div className="space-y-6">
            {Object.entries(categorizedSkills).map(([category, skills]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FiTrendingUp className="w-4 h-4 text-theme-primary-500" />
                  {category}
                </h3>
                
                <div className="space-y-3">
                  {skills.map((skill: { name: string; level: number }) => (
                    <div key={skill.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {skill.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {skill.level}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-theme-primary-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skills Summary */}
      <Card className="border border-gray-700/20 dark:border-gray-300/10 rounded-xl bg-card shadow-sm p-6">
        <CardHeader className="p-0 mb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FiTrendingUp className="w-5 h-5 text-theme-primary-500" />
            Skills Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Skills */}
            <div className="flex flex-col items-center justify-center text-center p-4 bg-card rounded-lg border border-theme-primary-100/40 dark:border-theme-primary-900/30 shadow-xs">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-theme-primary-100/60 dark:bg-theme-primary-900/40 mb-2 ring-2 ring-theme-primary-200/60 dark:ring-theme-primary-800/40">
                <FiAward className="w-6 h-6 text-theme-primary-600 dark:text-theme-primary-400" />
              </div>
              <div className="text-2xl font-bold text-theme-primary-600 dark:text-theme-primary-400">
                {profile.skills.length}
              </div>
              <div className="text-sm text-muted-foreground font-medium mt-1">Total Skills</div>
            </div>

            {/* Categories */}
            <div className="flex flex-col items-center justify-center text-center p-4 bg-card rounded-lg border border-theme-primary-100/40 dark:border-theme-primary-900/30 shadow-xs">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-theme-primary-100/60 dark:bg-theme-primary-900/40 mb-2 ring-2 ring-theme-primary-200/60 dark:ring-theme-primary-800/40">
                <FiGrid className="w-6 h-6 text-theme-primary-600 dark:text-theme-primary-400" />
              </div>
              <div className="text-2xl font-bold text-theme-primary-600 dark:text-theme-primary-400">
                {Object.keys(categorizedSkills).length}
              </div>
              <div className="text-sm text-muted-foreground font-medium mt-1">Categories</div>
            </div>

            {/* Avg. Proficiency */}
            <div className="flex flex-col items-center justify-center text-center p-4 bg-card rounded-lg border border-theme-primary-100/40 dark:border-theme-primary-900/30 shadow-xs">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-theme-primary-100/60 dark:bg-theme-primary-900/40 mb-2 ring-2 ring-theme-primary-200/60 dark:ring-theme-primary-800/40">
                <FiBarChart2 className="w-6 h-6 text-theme-primary-600 dark:text-theme-primary-400" />
              </div>
              <div className="text-2xl font-bold text-theme-primary-600 dark:text-theme-primary-400">
                {profile.skills && profile.skills.length > 0
                  ? Math.round(profile.skills.reduce((sum: number, skill: { name: string; level: number }) => sum + skill.level, 0) / profile.skills.length)
                  : 0}
              </div>
              <div className="text-sm text-muted-foreground font-medium mt-1">Avg. Proficiency</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            This summary gives you a quick overview of your skillset and proficiency distribution.
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 