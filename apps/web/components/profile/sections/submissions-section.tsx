"use client";

import { useTranslations } from "next-intl";
import { FiExternalLink, FiEye, FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/lib/types/profile";

interface SubmissionItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string;
  updatedAt: string;
  url: string;
  imageUrl?: string;
}

interface SubmissionsSectionProps {
  profile: Profile;
}

export function SubmissionsSection({ profile }: SubmissionsSectionProps) {
  const t = useTranslations("profile");

  const getStatusIcon = (status: SubmissionItem['status']) => {
    switch (status) {
      case "approved": return <FiCheckCircle className="w-4 h-4 text-green-500" />;
      case "pending":  return <FiClock className="w-4 h-4 text-yellow-500" />;
      case "rejected": return <FiXCircle className="w-4 h-4 text-red-500" />;
      default:         return <FiClock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: SubmissionItem['status']) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:         return "bg-gray-100 text-gray-800 dark:bg-[#0a0a0a]/30 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: SubmissionItem['status']) => {
    switch (status) {
      case "approved": return t("STATUS_APPROVED");
      case "pending":  return t("STATUS_PENDING");
      case "rejected": return t("STATUS_REJECTED");
      default:         return status;
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });

  return (
    <div className="space-y-6">
      {/* Submissions Overview */}
      <Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm p-6">
        <CardHeader className="p-0 mb-2">
          <CardTitle className="text-lg font-bold text-gray-100">{t("MY_SUBMISSIONS")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t("SUBMISSIONS_OVERVIEW_DESC")}
          </p>

          {profile.submissions.length > 0 ? (
            <div className="space-y-4">
              {profile.submissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  getStatusIcon={getStatusIcon}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  formatDate={formatDate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                <FiExternalLink className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{t("NO_SUBMISSIONS_TITLE")}</p>
                <p className="text-sm">{t("NO_SUBMISSIONS_DESC")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Stats */}
      {profile.submissions.length > 0 && (
        <Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm p-6">
          <CardHeader className="p-0 mb-2">
            <CardTitle className="text-lg font-bold text-gray-100">{t("SUBMISSION_STATS_TITLE")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="region" aria-label={t("SUBMISSION_STATS_TITLE")}>
              <div className="text-center p-4 bg-theme-primary-50 dark:bg-theme-primary-900/20 rounded-lg" role="stat">
                <div className="text-2xl font-bold text-theme-primary-600 dark:text-theme-primary-400">
                  {profile.submissions.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t("TOTAL_SUBMISSIONS")}</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg" role="stat">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {profile.submissions.filter(s => s.status === "approved").length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t("STATUS_APPROVED")}</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg" role="stat">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {profile.submissions.filter(s => s.status === "pending").length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t("STATUS_PENDING")}</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg" role="stat">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {profile.submissions.filter(s => s.status === "rejected").length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t("STATUS_REJECTED")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SubmissionCardProps {
  submission: SubmissionItem;
  getStatusIcon: (status: SubmissionItem['status']) => React.ReactElement;
  getStatusColor: (status: SubmissionItem['status']) => string;
  getStatusLabel: (status: SubmissionItem['status']) => string;
  formatDate: (dateString: string) => string;
}

function SubmissionCard({ submission, getStatusIcon, getStatusColor, getStatusLabel, formatDate }: SubmissionCardProps) {
  const t = useTranslations("profile");

  return (
    <Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm hover:shadow-md transition-shadow duration-200 p-0">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg truncate">
                {submission.title}
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                {getStatusIcon(submission.status)}
                {getStatusLabel(submission.status)}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
              {submission.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>{t("SUBMISSION_CATEGORY", { category: submission.category })}</span>
              <span>{t("SUBMISSION_DATE", { date: formatDate(submission.submittedAt) })}</span>
              {submission.updatedAt && submission.submittedAt && submission.updatedAt !== submission.submittedAt && (
                <span>{t("SUBMISSION_UPDATED_DATE", { date: formatDate(submission.updatedAt) })}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <a
              href={submission.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors"
              title={t("VIEW_SUBMISSION")}
            >
              <FiEye className="w-4 h-4" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
