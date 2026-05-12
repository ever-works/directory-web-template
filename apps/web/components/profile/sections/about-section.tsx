"use client";

import { FiMapPin, FiBriefcase, FiGlobe, FiCalendar } from "react-icons/fi";
import { ProfileTag } from "../profile-tag";
import { InlineEditField } from "../inline-edit-field";
import type { Profile } from "@/lib/types/profile";

const CARD = "bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm p-6";
const LABEL = "text-sm text-neutral-500 dark:text-neutral-400";
const VALUE = "text-neutral-900 dark:text-neutral-100 mt-0.5";
const SECTION_TITLE = "text-sm font-semibold text-neutral-900 dark:text-neutral-100";

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
    <div className="space-y-4">
      {/* About Me */}
      <div className={CARD}>
        <h3 className={`${SECTION_TITLE} mb-3`}>About Me</h3>
        <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-sm">
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
      </div>

      {/* Personal Information */}
      <div className={CARD}>
        <h3 className={`${SECTION_TITLE} mb-4`}>Personal Information</h3>
        <div className="space-y-4">
          {(profile.location || isOwn) && (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 p-1.5 rounded-lg bg-neutral-100 dark:bg-white/8 text-neutral-500 dark:text-neutral-400 shrink-0">
                <FiMapPin className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <p className={LABEL}>Location</p>
                <p className={VALUE}>
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
            <div className="flex items-start gap-3">
              <span className="mt-0.5 p-1.5 rounded-lg bg-neutral-100 dark:bg-white/8 text-neutral-500 dark:text-neutral-400 shrink-0">
                <FiBriefcase className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <p className={LABEL}>Company</p>
                <p className={VALUE}>
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
            <div className="flex items-start gap-3">
              <span className="mt-0.5 p-1.5 rounded-lg bg-neutral-100 dark:bg-white/8 text-neutral-500 dark:text-neutral-400 shrink-0">
                <FiBriefcase className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <p className={LABEL}>Job Title</p>
                <p className={VALUE}>
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
            <div className="flex items-start gap-3">
              <span className="mt-0.5 p-1.5 rounded-lg bg-neutral-100 dark:bg-white/8 text-neutral-500 dark:text-neutral-400 shrink-0">
                <FiGlobe className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <p className={LABEL}>Website</p>
                {isOwn ? (
                  <p className={VALUE}>
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
                    className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline text-sm mt-0.5 block truncate"
                  >
                    {profile.website?.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <span className="mt-0.5 p-1.5 rounded-lg bg-neutral-100 dark:bg-white/8 text-neutral-500 dark:text-neutral-400 shrink-0">
              <FiCalendar className="w-3.5 h-3.5" />
            </span>
            <div>
              <p className={LABEL}>Member Since</p>
              <p className={VALUE + " text-sm"}>{formatDate(profile.memberSince)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Skills preview */}
      {profile.skills.length > 0 && (
        <div className={CARD}>
          <h3 className={`${SECTION_TITLE} mb-3`}>Skills & Expertise</h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <ProfileTag key={skill.name} label={skill.name} />
            ))}
          </div>
        </div>
      )}

      {/* Interests */}
      {(profile.interests.length > 0 || isOwn) && (
        <div className={CARD}>
          <h3 className={`${SECTION_TITLE} mb-3`}>Interests</h3>
          {isOwn ? (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Comma-separated — each item becomes a tag.
              </p>
              <p className="text-neutral-900 dark:text-neutral-100 text-sm">
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
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.interests.map((interest) => (
                    <ProfileTag key={interest} label={interest} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((interest) => (
                <ProfileTag key={interest} label={interest} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
