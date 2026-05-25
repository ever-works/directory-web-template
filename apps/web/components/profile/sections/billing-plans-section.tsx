import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FiCreditCard, FiZap, FiArrowRight, FiStar, FiBriefcase, FiGlobe } from "react-icons/fi";

type Plan = "free" | "standard" | "premium";
type AccountType = "individual" | "business" | "enterprise";

interface BillingPlansSectionProps {
	plan: Plan;
	accountType: AccountType;
	currency: string;
}

const PLAN_CONFIG: Record<Plan, {
	icon: React.ReactNode;
	gradient: string;
	badge: string;
	badgeText: string;
}> = {
	free: {
		icon: <FiZap className="w-4 h-4" />,
		gradient: "bg-neutral-100 dark:bg-white/5",
		badge: "bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200 dark:bg-white/5 dark:text-neutral-400 dark:ring-white/10",
		badgeText: "free",
	},
	standard: {
		icon: <FiStar className="w-4 h-4" />,
		gradient: "bg-theme-primary-50 dark:bg-theme-primary-500/10",
		badge: "bg-theme-primary-50 text-theme-primary-700 ring-1 ring-theme-primary-200 dark:bg-theme-primary-500/10 dark:text-theme-primary-400 dark:ring-theme-primary-500/20",
		badgeText: "standard",
	},
	premium: {
		icon: <FiZap className="w-4 h-4" />,
		gradient: "bg-gradient-to-br from-violet-50 to-theme-primary-50 dark:from-violet-500/10 dark:to-theme-primary-500/10",
		badge: "bg-gradient-to-r from-violet-100 to-theme-primary-100 text-violet-700 ring-1 ring-violet-200 dark:from-violet-500/20 dark:to-theme-primary-500/20 dark:text-violet-400 dark:ring-violet-500/20",
		badgeText: "premium",
	},
};

const ACCOUNT_TYPE_ICON: Record<AccountType, React.ReactNode> = {
	individual: <FiStar className="w-3 h-3" />,
	business: <FiBriefcase className="w-3 h-3" />,
	enterprise: <FiGlobe className="w-3 h-3" />,
};

function MetaRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3 px-4 py-2.5">
			<span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
			<span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{value}</span>
		</div>
	);
}

export async function BillingPlansSection({ plan, accountType, currency }: BillingPlansSectionProps) {
	const t = await getTranslations("profile");
	const isPaid = plan !== "free";
	const config = PLAN_CONFIG[plan];

	const planLabel =
		plan === "premium" ? t("PLAN_PREMIUM")
		: plan === "standard" ? t("PLAN_STANDARD")
		: t("PLAN_FREE");

	const accountTypeLabel =
		accountType === "enterprise" ? t("ACCOUNT_TYPE_ENTERPRISE")
		: accountType === "business" ? t("ACCOUNT_TYPE_BUSINESS")
		: t("ACCOUNT_TYPE_INDIVIDUAL");

	return (
		<div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/8 rounded-2xl shadow-sm overflow-hidden">
			{/* Header */}
			<div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-neutral-100 dark:border-white/6">
				<span className="w-7 h-7 rounded-lg bg-theme-primary-50 dark:bg-theme-primary-500/10 flex items-center justify-center shrink-0">
					<FiCreditCard className="w-3.5 h-3.5 text-theme-primary-600 dark:text-theme-primary-400" aria-hidden="true" />
				</span>
				<h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
					{t("BILLING_PLANS_SECTION")}
				</h3>
			</div>

			{/* Current plan hero */}
			<div className="p-4">
				<div className={`rounded-xl p-4 ${config.gradient}`}>
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div>
								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
										{planLabel}
									</span>
									<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${config.badge}`}>
										{planLabel}
									</span>
								</div>
								<p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
									{t("CURRENT_PLAN")}
								</p>
							</div>
						</div>

						{!isPaid && (
							<Link
								href="/pricing"
								className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-black dark:bg-white dark:text-black text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
							>
								{t("BILLING_PLANS_UPGRADE")}
							</Link>
						)}
					</div>
				</div>
			</div>

			{/* Account meta */}
			<div className="divide-y divide-neutral-100 dark:divide-white/6 border-t border-neutral-100 dark:border-white/6">
				<div className="flex items-center justify-between gap-3 px-4 py-2.5">
					<span className="text-xs text-neutral-500 dark:text-neutral-400">{t("ACCOUNT_TYPE")}</span>
					<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
						{ACCOUNT_TYPE_ICON[accountType]}
						{accountTypeLabel}
					</span>
				</div>
				<MetaRow label={t("BILLING_CURRENCY")} value={currency} />
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-neutral-100 dark:border-white/6 bg-neutral-50/60 dark:bg-white/2">
				<Link
					href="/client/settings/profile/billing"
					className="inline-flex items-center gap-1.5 text-xs font-semibold text-theme-primary-600 dark:text-theme-primary-400 hover:text-theme-primary-700 dark:hover:text-theme-primary-300 transition-colors"
				>
					{t("MANAGE_BILLING")}
					<FiArrowRight className="w-3 h-3" aria-hidden="true" />
				</Link>
				<Link
					href="/pricing"
					className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
				>
					{t("BILLING_PLANS_VIEW_PLANS")}
				</Link>
			</div>
		</div>
	);
}
