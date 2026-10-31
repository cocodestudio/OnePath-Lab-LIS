import Sidebar from "./sidebar-client";
import Navbar from "./navbar";
import SubscriptionGate from "@/components/subscription-gate";
import { DashboardScroller } from "@/components/dashboard-scroller";
import { AiGuideWidget } from "@/components/ai-guide-widget";
import { DashboardAuthGuard } from "@/components/dashboard-auth-guard";
import { LimsInstallPill } from "@/components/lims-install-pill";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background fixed inset-0 md:static md:h-screen md:max-h-none" suppressHydrationWarning>
      <DashboardAuthGuard />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden h-full min-w-0" suppressHydrationWarning>
        <Navbar />
        <DashboardScroller>
          {children}
        </DashboardScroller>
      </div>
      <SubscriptionGate />
      <AiGuideWidget />
      <LimsInstallPill />
    </div>
  );
}