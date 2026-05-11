"use client";

import { FiMapPin, FiBriefcase, FiGlobe, FiCalendar } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileTag } from "../profile-tag";
import { InlineEditField } from "../inline-edit-field";
import type { Profile } from "@/lib/types/profile";

interface AboutSectionProps {
  profile: Profile;
  isOwn?: boolean;
}

export function AboutSection({ profile, isOwn = false }: AboutSectionProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
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
            <InlineEditField
              field="bio"
              value={profile.bio}
              canEdit={isOwn}
              multiline
              maxLength={500}
              placeholder="Tell others about yourself"
              emptyLabel={isOwn ? "Add a bio" : "No bio yet"}
            />
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
            {(profile.location || isOwn) && (
              <div className="flex items-center gap-3">
                <FiMapPin className="w-5 h-5 text-theme-primary-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    <InlineEditField
                      field="location"
                      value={profile.location}
                      canEdit={isOwn}
                      maxLength={100}
                      placeholder="Where are you?"
                      emptyLabel="Add location"
                    />
                  </p>
                </div>
              </div>
            )}

            {(profile.company || isOwn) && (
              <div className="flex items-center gap-3">
                <FiBriefcase className="w-5 h-5 text-theme-primary-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Company</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    <InlineEditField
                      field="company"
                      value={profile.company}
                      canEdit={isOwn}
                      maxLength={100}
                      placeholder="Where do you work?"
                      emptyLabel="Add company"
                    />
                  </p>
                </div>
              </div>
            )}

            {(profile.jobTitle || isOwn) && (
              <div className="flex items-center gap-3">
                <FiBriefcase className="w-5 h-5 text-theme-primary-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Job Title</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    <InlineEditField
                      field="jobTitle"
                      value={profile.jobTitle}
                      canEdit={isOwn}
                      maxLength={100}
                      placeholder="Your role"
                      emptyLabel="Add a job title"
                    />
                  </p>
                </div>
              </div>
            )}

            {(profile.website || isOwn) && (
              <div className="flex items-center gap-3">
                <FiGlobe className="w-5 h-5 text-theme-primary-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Website</p>
                  {isOwn ? (
                    <p className="text-gray-900 dark:text-gray-100">
                      <InlineEditField
                        field="website"
                        value={profile.website}
                        canEdit
                        type="url"
                        maxLength={200}
                        placeholder="https://your.site"
                        emptyLabel="Add website"
                      />
                    </p>
                  ) : (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
                    >
                      {profile.website}
                    </a>
                  )}
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

      {/* Skills (preview) */}
      {profile.skills.length > 0 && (
        <Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Skills & Expertise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <ProfileTag key={skill.name} label={skill.name} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interests */}
      {(profile.interests.length > 0 || isOwn) && (
        <Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Interests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isOwn ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Comma-separated. Each item becomes a tag below.
                </p>
                <p className="text-gray-900 dark:text-gray-100">
                  <InlineEditField
                    field="interests"
                    value={profile.interests.join(", ")}
                    canEdit
                    maxLength={200}
                    placeholder="design, hiking, open source, ..."
                    emptyLabel="Add interests"
                  />
                </p>
                {profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {profile.interests.map((interest) => (
                      <ProfileTag key={interest} label={interest} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <ProfileTag key={interest} label={interest} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
