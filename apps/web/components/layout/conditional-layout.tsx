"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/header";
import { Footer } from "@/components/footer";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { DemoBanner } from "@/components/layout/demo-banner";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Check if current page is an auth demo page
  const isAuthDemoPage = pathname.includes("/auth-demo/");

  return (
    <>
      {/* Demo deployments only (runtime NEXT_PUBLIC_DEMO=true); renders nothing on every other directory. */}
      {!isAuthDemoPage && <DemoBanner />}
      {!isAuthDemoPage && <Header />}
      {/* id="main-content" lets skip-to-content anchors target it.
          Required by `skip-link-and-focus.spec.ts`. */}
      <main id="main-content" className="flex-1 bg-white dark:bg-[#0a0a0a]">
        {children}
      </main>
      {!isAuthDemoPage && <Footer />}
      {!isAuthDemoPage && (
        <div className="fixed bottom-6 right-6 z-50">
          <ScrollToTopButton
            variant="elegant"
            easing="easeInOut"
            showAfter={400}
            size="md"
          />
        </div>
      )}
    </>
  );
}
