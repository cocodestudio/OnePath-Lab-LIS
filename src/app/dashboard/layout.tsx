import Sidebar from "./sidebar-client";
import Navbar from "./navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}