import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
	FiShield,
	FiCheckCircle,
	FiAlertCircle,
	FiLock,
	FiUnlock,
	FiClock,
	FiArrowRight,
} from "react-icons/fi";

type AccountStatus = "active" | "inactive" | "suspended" | "banned" | "trial";

interface SecurityStatusSectionProps {
	emailVerified: boolean;
	twoFactorEnabled: boolean;
	status: AccountStatus;
	memberSince: string;
}

type Tone = "good" | "warning" | "danger" | "neutral";

const BADGE: Record<Tone, string> = {
	good: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
	warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
	danger: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
	neutral: "bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200 dark:bg-white/5 dark:text-neutral-400 dark:ring-white/10",
};

const ICON_BG = "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400";

function StatusRow({
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
		<div className="flex items-center justify-between gap-3 px-4 py-3">
			<div className="flex items-center gap-3 min-w-0">
				<span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${ICON_BG}`}>
					{icon}
				</span>
				<span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{label}</span>
			</div>
			<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${BADGE[tone]}`}>
				{value}
			</span>
		</div>
	);
}

export async function SecurityStatusSection({
	emailVerified,
	twoFactorEnabled,
	status,
	memberSince,
}: SecurityStatusSectionProps) {
	const t = await getTranslations("profile");
	const locale = await getLocale();

	const statusTone: Tone =
		status === "active" ? "good"
		: status === "trial" ? "neutral"
		: status === "suspended" ? "warning"
		: status === "banned" ? "danger"
		: "neutral";

	const statusLabel =
		status === "active" ? t("STATUS_ACTIVE")
		: status === "inactive" ? t("STATUS_INACTIVE")
		: status === "suspended" ? t("STATUS_SUSPENDED")
		: status === "banned" ? t("STATUS_BANNED")
		: t("STATUS_TRIAL");

	const memberSinceLabel = (() => {
		const date = new Date(memberSince);
		if (Number.isNaN(date.getTime())) return memberSince;
		return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
	})();

	return (
		<div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/8 rounded-2xl shadow-sm overflow-hidden">
			{/* Header */}
			<div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-neutral-100 dark:border-white/6">
				<span className="w-7 h-7 rounded-lg bg-theme-primary-50 dark:bg-theme-primary-500/10 flex items-center justify-center shrink-0">
					<FiShield className="w-3.5 h-3.5 text-theme-primary-600 dark:text-theme-primary-400" aria-hidden="true" />
				</span>
				<h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
					{t("SECURITY_STATUS_SECTION")}
				</h3>
			</div>

			{/* Rows */}
			<div className="divide-y divide-neutral-100 dark:divide-white/6">
				<StatusRow
					icon={emailVerified
						? <FiCheckCircle className="w-3.5 h-3.5" />
						: <FiAlertCircle className="w-3.5 h-3.5" />
					}
					label={t("EMAIL_VERIFICATION")}
					value={emailVerified ? t("EMAIL_VERIFIED") : t("EMAIL_UNVERIFIED")}
					tone={emailVerified ? "good" : "warning"}
				/>
				<StatusRow
					icon={twoFactorEnabled
						? <FiLock className="w-3.5 h-3.5" />
						: <FiUnlock className="w-3.5 h-3.5" />
					}
					label={t("TWO_FACTOR")}
					value={twoFactorEnabled ? t("TWO_FACTOR_ON") : t("TWO_FACTOR_OFF")}
					tone={twoFactorEnabled ? "good" : "warning"}
				/>
				<StatusRow
					icon={<FiShield className="w-3.5 h-3.5" />}
					label={t("ACCOUNT_STATUS")}
					value={statusLabel}
					tone={statusTone}
				/>
				<StatusRow
					icon={<FiClock className="w-3.5 h-3.5" />}
					label={t("MEMBER_SINCE")}
					value={memberSinceLabel}
					tone="neutral"
				/>
			</div>

			{/* Footer */}
			<div className="px-4 py-3 border-t border-neutral-100 dark:border-white/6 bg-neutral-50/60 dark:bg-white/[0.02]">
				<Link
					href="/client/settings/security"
					className="inline-flex items-center gap-1.5 text-xs font-semibold text-theme-primary-600 dark:text-theme-primary-400 hover:text-theme-primary-700 dark:hover:text-theme-primary-300 transition-colors"
				>
					{t("MANAGE_SECURITY")}
					<FiArrowRight className="w-3 h-3" aria-hidden="true" />
				</Link>
			</div>
		</div>
	);
}
