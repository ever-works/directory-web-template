import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/ui/container";
import { BillingSection } from "@/components/dashboard";
import { requireAuth } from "@/lib/auth/guards";

export default async function DashboardBillingPage() {
  // Require authentication
  await requireAuth();

  const t = await getTranslations();
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
    <PageContainer className="py-12">
    <div className="space-y-8">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        {t("billing.TITLE")} - {t("common.DASHBOARD")}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        {t("billing.SUBTITLE")}
      </p>
    </div>

    <BillingSection />
  </div>
  </PageContainer>
  </div>
  );
}
