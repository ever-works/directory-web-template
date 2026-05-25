import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FiCreditCard, FiZap, FiChevronRight } from "react-icons/fi";

const CARD =
  "bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm overflow-hidden";

type Plan = "free" | "standard" | "premium";
type AccountType = "individual" | "business" | "enterprise";

interface BillingPlansSectionProps {
  /** Current subscription plan from the client profile. */
  plan: Plan;
  /** Account type from the client profile. */
  accountType: AccountType;
  /** ISO 4217 currency code (e.g. `USD`). */
  currency: string;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{value}</span>
    </div>
  );
}

/**
 * Own-profile-only block summarising the current plan and account billing
 * meta, with links into the billing settings and pricing pages. Reads come
 * straight from the client profile row — no extra queries or client hooks.
 */
export async function BillingPlansSection({ plan, accountType, currency }: BillingPlansSectionProps) {
  const t = await getTranslations("profile");
  const isPaid = plan !== "free";

  const planLabel =
    plan === "premium" ? t("PLAN_PREMIUM") : plan === "standard" ? t("PLAN_STANDARD") : t("PLAN_FREE");

  const accountTypeLabel =
    accountType === "enterprise"
      ? t("ACCOUNT_TYPE_ENTERPRISE")
      : accountType === "business"
        ? t("ACCOUNT_TYPE_BUSINESS")
        : t("ACCOUNT_TYPE_INDIVIDUAL");

  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-100 dark:border-white/6">
        <FiCreditCard className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {t("BILLING_PLANS_SECTION")}
        </h3>
      </div>

      {/* Current plan */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isPaid
                ? "bg-theme-primary-100 dark:bg-theme-primary-900/30"
                : "bg-neutral-100 dark:bg-white/5"
            }`}
          >
            <FiZap
              className={`w-5 h-5 ${
                isPaid
                  ? "text-theme-primary-600 dark:text-theme-primary-400"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
              aria-hidden="true"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{planLabel}</span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  isPaid
                    ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400"
                }`}
              >
                {isPaid ? t("PLAN_BADGE_ACTIVE") : t("PLAN_BADGE_FREE")}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t("CURRENT_PLAN")}</p>
          </div>
        </div>

        {!isPaid && (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-primary-600 hover:bg-theme-primary-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <FiZap className="w-3.5 h-3.5" aria-hidden="true" />
            {t("BILLING_PLANS_UPGRADE")}
          </Link>
        )}
      </div>

      <div className="divide-y divide-neutral-100 dark:divide-white/6 border-t border-neutral-100 dark:border-white/6">
        <MetaRow label={t("ACCOUNT_TYPE")} value={accountTypeLabel} />
        <MetaRow label={t("BILLING_CURRENCY")} value={currency} />
      </div>

      <div className="flex items-center gap-4 px-5 py-3 border-t border-neutral-100 dark:border-white/6">
        <Link
          href="/client/settings/profile/billing"
          className="inline-flex items-center gap-1 text-sm font-medium text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
        >
          {t("MANAGE_BILLING")}
          <FiChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:underline"
        >
          {t("BILLING_PLANS_VIEW_PLANS")}
        </Link>
      </div>
    </div>
  );
}
