"use client";

import { ProfileTag } from "../profile-tag";
import { InlineEditField } from "../inline-edit-field";
import type { Profile } from "@/lib/types/profile";

const CARD = "bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm p-5";
const SECTION_TITLE = "text-sm font-semibold text-neutral-900 dark:text-neutral-100";

interface AboutSectionProps {
  profile: Profile;
  isOwn?: boolean;
}

export function AboutSection({ profile, isOwn = false }: AboutSectionProps) {
  return (
    <div className="space-y-4">
      {/* Interests */}
      {(profile.interests.length > 0 || isOwn) && (
        <div className={CARD}>
          <h3 className={`${SECTION_TITLE} mb-3`}>Interests</h3>
          {isOwn ? (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Comma-separated — each item becomes a tag.
              </p>
              <p className="text-sm text-neutral-900 dark:text-neutral-100">
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
