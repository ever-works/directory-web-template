import { PageContainer } from "@/components/ui/container";
import { HeroLanding } from "./hero-landing";
import { TechStack } from "./tech-stack";
import { MonetizationSection } from "./monetization-section";
import { HowItWorks } from "./how-it-works";
import { InstallationGuide } from "./installation-guide";
import { UsageGuide } from "./usage-guide";

export const HelpContent = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-theme-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-32 w-96 h-96 bg-theme-secondary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-40 w-80 h-80 bg-theme-accent-500/5 rounded-full blur-3xl"></div>
      </div>
      <PageContainer className="py-20 flex flex-col gap-20">
        <HeroLanding />
        <TechStack />
        <MonetizationSection />
        <HowItWorks />
        <InstallationGuide />
        <UsageGuide />
      </PageContainer>
    </div>
  );
};
