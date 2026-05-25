import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiLock,
  FiUnlock,
  FiClock,
  FiChevronRight,
} from "react-icons/fi";

const CARD =
  "bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm overflow-hidden";

type AccountStatus = "active" | "inactive" | "suspended" | "banned" | "trial";

interface SecurityStatusSectionProps {
  /** Whether the account's email address has been verified. */
  emailVerified: boolean;
  /** Whether two-factor authentication is enabled on the account. */
  twoFactorEnabled: boolean;
  /** Account lifecycle status from the client profile. */
  status: AccountStatus;
  /** ISO date string (e.g. `2024-01-01`) for when the account was created. */
  memberSince: string;
}

/** Tone → tailwind classes for the value badge on each row. */
const TONE = {
  good: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  neutral: "text-neutral-500 dark:text-neutral-400",
} as const;

type Tone = keyof typeof TONE;

function Row({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`shrink-0 ${TONE[tone]}`}>{icon}</span>
        <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{label}</span>
      </div>
      <span className={`text-xs font-semibold shrink-0 ${TONE[tone]}`}>{value}</span>
    </div>
  );
}

/**
 * Own-profile-only block summarising account security posture and lifecycle
 * status. Data comes straight from the client profile row — no extra queries.
 */
export async function SecurityStatusSection({
  emailVerified,
  twoFactorEnabled,
  status,
  memberSince,
}: SecurityStatusSectionProps) {
  const t = await getTranslations("profile");
  const locale = await getLocale();

  const statusTone: Tone =
    status === "active"
      ? "good"
      : status === "trial"
        ? "neutral"
        : status === "suspended"
          ? "warning"
          : status === "banned"
            ? "danger"
            : "neutral";

  const statusLabel =
    status === "active"
      ? t("STATUS_ACTIVE")
      : status === "inactive"
        ? t("STATUS_INACTIVE")
        : status === "suspended"
          ? t("STATUS_SUSPENDED")
          : status === "banned"
            ? t("STATUS_BANNED")
            : t("STATUS_TRIAL");

  const memberSinceLabel = (() => {
    const date = new Date(memberSince);
    if (Number.isNaN(date.getTime())) return memberSince;
    return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  })();

  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-100 dark:border-white/6">
        <FiShield className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {t("SECURITY_STATUS_SECTION")}
        </h3>
      </div>

      <div className="divide-y divide-neutral-100 dark:divide-white/6">
        <Row
          icon={emailVerified ? <FiCheckCircle className="w-4 h-4" /> : <FiAlertCircle className="w-4 h-4" />}
          label={t("EMAIL_VERIFICATION")}
          value={emailVerified ? t("EMAIL_VERIFIED") : t("EMAIL_UNVERIFIED")}
          tone={emailVerified ? "good" : "warning"}
        />
        <Row
          icon={twoFactorEnabled ? <FiLock className="w-4 h-4" /> : <FiUnlock className="w-4 h-4" />}
          label={t("TWO_FACTOR")}
          value={twoFactorEnabled ? t("TWO_FACTOR_ON") : t("TWO_FACTOR_OFF")}
          tone={twoFactorEnabled ? "good" : "warning"}
        />
        <Row
          icon={<FiShield className="w-4 h-4" />}
          label={t("ACCOUNT_STATUS")}
          value={statusLabel}
          tone={statusTone}
        />
        <Row
          icon={<FiClock className="w-4 h-4" />}
          label={t("MEMBER_SINCE")}
          value={memberSinceLabel}
          tone="neutral"
        />
      </div>

      <div className="px-5 py-3 border-t border-neutral-100 dark:border-white/6">
        <Link
          href="/client/settings/security"
          className="inline-flex items-center gap-1 text-sm font-medium text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
        >
          {t("MANAGE_SECURITY")}
          <FiChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
