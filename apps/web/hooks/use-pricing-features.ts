import { useTranslations } from "next-intl";
import { PlanFeature } from "@/components/pricing/plan-card";
import { PaymentPlan } from "@/lib/constants";


export interface PlanConfig {
  name: string;
  period: string;
  description: string;
}

export interface PricingFeatures {
  freePlanFeatures: PlanFeature[];
  standardPlanFeatures: PlanFeature[];
  premiumPlanFeatures: PlanFeature[];
  getFeaturesByPlan: (planType: PaymentPlan) => PlanFeature[];
  getPlanConfig: (planType: PaymentPlan) => PlanConfig;
  getActionText: (planType: PaymentPlan) => string;
  getNotLoggedInActionText: (planType: PaymentPlan) => string;
}

export function usePricingFeatures(): PricingFeatures {
  const t = useTranslations('pricing');

  const planConfigs: Record<PaymentPlan, PlanConfig> = {
    free: {
      name: t('PLANS.FREE.NAME'),
      period: t('PLANS.FREE.PERIOD'),
      description: t('PLANS.FREE.DESCRIPTION')
    },
    standard: {
      name: t('PLANS.STANDARD.NAME'),
      period: t('PLANS.STANDARD.PERIOD'),
      description: t('PLANS.STANDARD.DESCRIPTION')
    },
    premium: {
      name: t('PLANS.PREMIUM.NAME'),
      period: t('PLANS.PREMIUM.PERIOD'),
      description: t('PLANS.PREMIUM.DESCRIPTION')
    }
  };

  const freePlanFeatures: PlanFeature[] = [
    { included: true, text: t("FREE_PLAN_FEATURES.SUBMIT_PRODUCT_SERVICE") },
    { included: true, text: t("FREE_PLAN_FEATURES.BASIC_DESCRIPTION") },
    { included: true, text: t("FREE_PLAN_FEATURES.ONE_IMAGE") },
    { included: true, text: t("FREE_PLAN_FEATURES.WEBSITE_LINK") },
    { included: true, text: t("FREE_PLAN_FEATURES.STANDARD_PLACEMENT") },
    { included: true, text: t("FREE_PLAN_FEATURES.SEARCH_RESULTS") },
    { included: true, text: t("FREE_PLAN_FEATURES.REVIEW_TIME") },
    { included: false, text: t("FREE_PLAN_FEATURES.NO_FEATURED") },
    { included: false, text: t("FREE_PLAN_FEATURES.EMAIL_SUPPORT") },
  ];

  const standardPlanFeatures: PlanFeature[] = [
    { included: true, text: t("STANDARD_PLAN_FEATURES.ALL_FREE_FEATURES") },
    { included: true, text: t("STANDARD_PLAN_FEATURES.EXTENDED_DESCRIPTION") },
    { included: true, text: t("STANDARD_PLAN_FEATURES.FIVE_IMAGES") },
    { included: true, text: t("STANDARD_PLAN_FEATURES.VERIFIED_BADGE") },
    { included: true, text: t("STANDARD_PLAN_FEATURES.PRIORITY_REVIEW") },
    { included: true, text: t("STANDARD_PLAN_FEATURES.SOCIAL_SHARING") },
    { included: true, text: t("STANDARD_PLAN_FEATURES.MONTHLY_STATS") },
    { included: true, text: t("STANDARD_PLAN_FEATURES.PRIORITY_EMAIL_SUPPORT") },
    { included: true, text: t("STANDARD_PLAN_FEATURES.FREE_MODIFICATIONS") },
  ];

  const premiumPlanFeatures: PlanFeature[] = [
    { included: true, text: t("PREMIUM_PLAN_FEATURES.ALL_STANDARD_FEATURES") },
    { included: true, text: t("PREMIUM_PLAN_FEATURES.SPONSORED_POSITION") },
    { included: true, text: t("PREMIUM_PLAN_FEATURES.HOMEPAGE_FEATURED") },
    { included: true, text: t("PREMIUM_PLAN_FEATURES.SPONSORED_BADGE") },
    { included: true, text: t("PREMIUM_PLAN_FEATURES.UNLIMITED_DESCRIPTION") },
    { included: true, text: t("PREMIUM_PLAN_FEATURES.UNLIMITED_GALLERY") },
    { included: true, text: t("PREMIUM_PLAN_FEATURES.LEARN_MORE_BUTTON") },
    { included: true, text: t("PREMIUM_PLAN_FEATURES.NEWSLETTER_MENTION") },
    { included: true, text: t("PREMIUM_PLAN_FEATURES.DETAILED_ANALYTICS") },
    { included: true, text: t("PREMIUM_PLAN_FEATURES.PHONE_SUPPORT") },
    { included: true, text: t("PREMIUM_PLAN_FEATURES.UNLIMITED_SUBMISSIONS") },
  ];

  const getFeaturesByPlan = (planType: PaymentPlan): PlanFeature[] => {
    switch (planType) {
      case "free":
        return freePlanFeatures;
      case "standard":
        return standardPlanFeatures;
      case "premium":
        return premiumPlanFeatures;
      default:
        return freePlanFeatures;
    }
  };

  const getPlanConfig = (planType: PaymentPlan): PlanConfig => {
    return planConfigs[planType];
  };

  const getActionText = (planType: PaymentPlan): string => {
    switch (planType) {
      case "free":
        return t('GET_STARTED_FREE');
      case "standard":
        return t('UPGRADE_TO_STANDARD');
      case "premium":
        return t('GO_PREMIUM');
      default:
        return t('GET_STARTED_FREE');
    }
  };

  const getNotLoggedInActionText = (planType: PaymentPlan): string => {
    switch (planType) {
      case "free":
        return t('SUBMIT_FOR_FREE');
      case "standard":
        return t('SUBSCRIBE_NOW');
      case "premium":
        return t('SUBSCRIBE_NOW');
      default:
        return t('SUBMIT_FOR_FREE');
    }
  };

  return {
    freePlanFeatures,
    standardPlanFeatures,
    premiumPlanFeatures,
    getFeaturesByPlan,
    getPlanConfig,
    getActionText,
    getNotLoggedInActionText,
  };
}
