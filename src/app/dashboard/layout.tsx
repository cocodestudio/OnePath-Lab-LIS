import Sidebar from "./sidebar-client";
import Navbar from "./navbar";
import SubscriptionGate from "@/components/subscription-gate";
import { DashboardScroller } from "@/components/dashboard-scroller";
import { AiGuideWidget } from "@/components/ai-guide-widget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <DashboardScroller>
          {children}
        </DashboardScroller>
      </div>
      <SubscriptionGate />
      <AiGuideWidget />
    </div>
  );
}