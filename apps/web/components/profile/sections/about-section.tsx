"use client";

import { useTranslations } from "next-intl";
import { ProfileTag } from "../profile-tag";
import { InlineEditField } from "../inline-edit-field";
import type { Profile } from "@/lib/types/profile";

const CARD = "bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm overflow-hidden";

interface AboutSectionProps {
  profile: Profile;
  isOwn?: boolean;
}

export function AboutSection({ profile, isOwn = false }: AboutSectionProps) {
  const t = useTranslations("profile");
  const hasBio = !!profile.bio || isOwn;
  const hasInterests = profile.interests.length > 0 || isOwn;

  if (!hasBio && !hasInterests) return null;

  return (
    <div className="space-y-4">
      {/* Bio */}
      {hasBio && (
        <div className={CARD}>
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-white/6">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t("ABOUT_SECTION")}</h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <InlineEditField
                field="bio"
                value={profile.bio}
                canEdit={!!isOwn}
                multiline
                maxLength={500}
                placeholder={t("BIO_EDIT_PLACEHOLDER")}
                emptyLabel={isOwn ? t("BIO_ADD_LABEL") : t("BIO_EMPTY")}
              />
            </p>
          </div>
        </div>
      )}

      {/* Interests */}
      {hasInterests && (
        <div className={CARD}>
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-white/6">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t("INTERESTS")}</h3>
          </div>
          <div className="px-5 py-4">
            {isOwn ? (
              <div className="space-y-3">
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {t("INTERESTS_HINT")}
                </p>
                <p className="text-sm text-neutral-900 dark:text-neutral-100">
                  <InlineEditField
                    field="interests"
                    value={profile.interests.join(", ")}
                    canEdit
                    maxLength={200}
                    placeholder={t("INTERESTS_EDIT_PLACEHOLDER")}
                    emptyLabel={t("INTERESTS_ADD_LABEL")}
                  />
                </p>
                {profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profile.interests.map((i) => (
                      <ProfileTag key={i} label={i} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((i) => (
                  <ProfileTag key={i} label={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
