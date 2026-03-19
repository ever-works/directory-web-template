import { FiMapPin, FiBriefcase, FiGlobe, FiCalendar } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileTag } from "../profile-tag";
import type { Profile } from "@/lib/types/profile";

interface AboutSectionProps {
  profile: Profile;
}

export function AboutSection({ profile }: AboutSectionProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* About Me */}
      <Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm p-6">
        <CardHeader className="p-0 mb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">About Me</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">
            {profile.bio}
          </p>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm p-6">
        <CardHeader className="p-0 mb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4">
            {profile.location && (
              <div className="flex items-center gap-3">
                <FiMapPin className="w-5 h-5 text-theme-primary-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                  <p className="text-gray-900 dark:text-gray-100">{profile.location}</p>
                </div>
              </div>
            )}

            {profile.company && (
              <div className="flex items-center gap-3">
                <FiBriefcase className="w-5 h-5 text-theme-primary-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Company</p>
                  <p className="text-gray-900 dark:text-gray-100">{profile.company}</p>
                </div>
              </div>
            )}

            {profile.jobTitle && (
              <div className="flex items-center gap-3">
                <FiBriefcase className="w-5 h-5 text-theme-primary-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Job Title</p>
                  <p className="text-gray-900 dark:text-gray-100">{profile.jobTitle}</p>
                </div>
              </div>
            )}

            {profile.website && (
              <div className="flex items-center gap-3">
                <FiGlobe className="w-5 h-5 text-theme-primary-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Website</p>
                  <a 
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <FiCalendar className="w-5 h-5 text-theme-primary-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(profile.memberSince)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      {profile.skills.length > 0 && (
        <Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Skills & Expertise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill: { name: string; level: number }) => (
                <ProfileTag key={skill.name} label={skill.name} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interests */}
      {profile.interests.length > 0 && (
        <Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Interests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest: string) => (
                <ProfileTag key={interest} label={interest} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
} 